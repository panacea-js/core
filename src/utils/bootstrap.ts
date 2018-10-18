import * as path from 'path'
import * as fs from 'fs-extra'
import { IPanaceaOptions, IPlugin, IRegistrant } from '../../types/globals'
import { CorsOptions } from 'cors'
import { registerServices } from './DIContainer'
import * as Bottle from 'bottlejs'

export default class Bootstrap {
  params: IPanaceaOptions
  container?: Bottle
  chain: {
    [bootstrapChainId: string]: () => Promise<void>
  }
  defaultCorePriority = 0
  defaultPluginPriority = 5
  defaultAppPriority = 10
  defaultAppLocationKey = 'app'

  constructor (panaceaConfigFile: string = '') {
    if (!panaceaConfigFile) {
      panaceaConfigFile = path.resolve(process.cwd(), 'panacea.js')
    }

    panaceaConfigFile = path.resolve(panaceaConfigFile)

    // Help path.resolve load typescript files. path.resolve won't get ts
    // extensions so check if by adding the ts extension whether the file exists.
    if (fs.existsSync(`${panaceaConfigFile}.ts`)) {
      panaceaConfigFile = `${panaceaConfigFile}.ts`
    }

    if (!fs.existsSync(panaceaConfigFile)) {
      throw Error(`Could not load panacea.js config file at ${panaceaConfigFile}`) // Cannot translate as Panacea container isn't available for i18n.
    }

    // Set initialization parameters.
    this.params = require(panaceaConfigFile).default()

    // Create dependency injection container.
    this.container = registerServices(this.params)

    // Initialize the registry.
    Panacea.value('registry', {})

    Panacea.value('defaultAppLocationKey', this.defaultAppLocationKey)

    // Define the stages in the bootstrap chain.
    this.chain = {
      '10-add-plugins-registry': addPluginsToRegistry,
      '20-register-hooks': registerHooks,
      '30-register-entity-types': registerEntityTypes,
      '40-register-settings': registerSettings,
      '50-prepare-graphql-server': prepareGraphQLServer,
    }
  }

  /**
   * Sort the bootstrap chain order by key.
   *
   * Consumers of Bootstrap can alter/append their own stages to the bootstrap
   * chain. Objects in javascript don't ensure key order integrity so this
   * method is required before execution of the stages.
   */
  private ensureChainOrder() {
    this.chain = Object.keys(this.chain).sort().reduce((orderedStages, stageKey) => {
      orderedStages[stageKey] = this.chain[stageKey]
      return orderedStages
    }, <Bootstrap['chain']> {})
  }

  /**
   * Run all bootstrap stages in the chain.
   */
  all (): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      this.ensureChainOrder()

      Object.keys(this.chain).forEach(async (stage) => {
        if (typeof this.chain[stage] !== 'function') {
          return reject(new Error(`Stage ${stage} is not a function`)) // Cannot translate as Panacea container isn't available for i18n.
        }
        await this.chain[stage].call(this)
      })

      const completedTime = Date.now() - startTime

      const { i18n } = Panacea.container

      return resolve(i18n.t('core.bootstrap.completed', { completedTime })) // Completed full bootstrap (in {completedTime}ms)
    })
  }

  /**
   * Run only specific bootstrap stages in the chain.
   */
  runStages (stages: Array<string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      if (!Array.isArray(stages)) {
        return reject(new Error(`Stages parameter is invalid - should be an array of stages`)) // Cannot translate as Panacea container isn't available for i18n.
      }

      this.ensureChainOrder()

      stages.forEach(async (stage) => {
        if (!this.chain[stage] || typeof this.chain[stage] !== 'function') {
          return reject(new Error(`Stage ${stage} specified is invalid`)) // Cannot translate as Panacea container isn't available for i18n.
        }
        await this.chain[stage].call(this)
      })

      const completedTime = Date.now() - startTime

      const { i18n } = Panacea.container

      return resolve(i18n.t('core.bootstrap.completed', { completedTime })) // Completed full bootstrap (in {completedTime}ms)
    })
  }

  /**
   * Return an array of resolvable locations where specified subdirectories can
   * be found within root directories for core, plugins and the consuming application.
   *
   * Core root implementors are in: src/core (dist/core when compiled)
   * Plugin implementors are checked from their root location.
   * Application implementors are checked from their root location.
   *
   * This method informs which directories exist so that the contents can be
   * autoloaded.
   */
  discoverImplementorDirectories (subPath: string): Array<IRegistrant> {
    const { _, path, fs, registry, defaultAppLocationKey, resolvePluginPath } = Panacea.container

    const unprioritizedRegistrants: Array<IRegistrant> = []

    // Treat core as a plugin to itself so it can register its own hook
    // implementations when bootstrapping externally - i.e. as a dependency of
    // another project. If core is bootstrapping itself (e.g. when running tests)
    // core effectively works in place of the application registrant below.
    const corePath = resolvePluginPath('@panaceajs/core/dist/core/') || './dist/core/'
    // Core Registrants.
    unprioritizedRegistrants.push({
      locationKey: 'core',
      path: path.resolve(corePath, subPath),
      priority: this.defaultCorePriority
    })

    // Plugin Registrants.
    Object.keys(registry.plugins).forEach((pluginKey) => {
      const pluginSubPath = path.resolve(resolvePluginPath(pluginKey), subPath)
      if (fs.existsSync(pluginSubPath)) {
        unprioritizedRegistrants.push({
          locationKey: pluginKey,
          path: pluginSubPath,
          priority: this.defaultPluginPriority
        })
      }
    })

    // Application Registrant.
    // Only include if core is not bootstrapping itself. See above.
    if (corePath !== './dist/core/') {
      const applicationSubPath = path.resolve(process.cwd(), subPath)
      if (fs.existsSync(applicationSubPath)) {
        unprioritizedRegistrants.push({
          locationKey: defaultAppLocationKey,
          path: applicationSubPath,
          priority: this.defaultAppPriority
        })
      }
    }

    const sortedRegistrantsByPriority = unprioritizedRegistrants.sort((a, b) => Number(a.priority) - Number(b.priority))

    const validDirectories = sortedRegistrantsByPriority.filter(x => fs.existsSync(x.path))

    return validDirectories
  }
}

/**
 * Add plugins to the registry.
 */
async function addPluginsToRegistry (this: Bootstrap) {
  const { registry, log } = Panacea.container

  if (!this.params.plugins) {
    registry.plugins = {}
    return
  }

  const { chalk, resolvePluginPath, i18n } = Panacea.container

  registry.plugins = {}

  this.params.plugins.map((plugin: IPlugin | string) => {
    // Allows plugins to be declared in panacea.js as single string without a
    // priority. Mutate plugin into plugin object structure.
    if (typeof plugin === 'string') {
      plugin = {
        path: plugin,
        priority: this.defaultPluginPriority
      }
    }

    plugin.priority = plugin.priority || this.defaultPluginPriority

    // Only add plugin to the registry if its path can be resolved.
    if (!resolvePluginPath(plugin.path)) {
      const error = [chalk.bgRed(' 😕  ')]
      error.push(i18n.t('core.bootstrap.pluginPathNotFound.line1', { pluginPath: chalk.underline(plugin.path) })) // Plugin {pluginPath} was not found as defined in panacea.js.
      error.push(i18n.t('core.bootstrap.pluginPathNotFound.line2', { pluginPath: plugin.path })) // If this is a external (contributed) plugin: Check that you have run `npm install {pluginPath}`
      error.push(i18n.t('core.bootstrap.pluginPathNotFound.line3')) // If this plugin is part of your application: Check that it can be resolved in the <app_root>/plugins/ directory
      log.error(error.join('\n'))
      return
    }

    log.info(chalk.green('✔ ' + i18n.t('core.bootstrap.pluginLoaded', { pluginPath: plugin.path }))) // {pluginPath} plugin loaded

    registry.plugins[plugin.path] = plugin
  })
}

/**
 * Discover and register core, plugins and application hooks.
 */
async function registerHooks (this: Bootstrap) {
  const { hooks } = Panacea.container
  const directories: Array<IRegistrant> = this.discoverImplementorDirectories('hooks')
  hooks.loadFromDirectories(directories.map(x => x.path))
}

/**
 * Discover and register core, plugins and application entity types.
 */
async function registerEntityTypes (this: Bootstrap) {
  const { registry } = Panacea.container
  registry.entityTypes = this.params.entityTypes || {}
  const directories = this.discoverImplementorDirectories('config/entityTypes/schemas')
  directories.forEach(x => (registry.entityTypes[x.path] = x))
}

/**
 * Discover and register core, plugins and application settings.
 */
async function registerSettings (this: Bootstrap) {
  const { registry } = Panacea.container
  registry.settings = this.params.settings || {}
  const directories = this.discoverImplementorDirectories('config/settings/schemas')
  directories.forEach(x => (registry.settings[x.path] = x))
}

/**
 * Prepares GraphQL schema and prepares express app ready to be served.
 */
async function prepareGraphQLServer (this: Bootstrap) {
  const {
    makeExecutableSchema,
    dbModels,
    graphiqlExpress,
    graphqlExpress,
    bodyParser,
    express,
    cors,
    voyagerMiddleware,
    graphQLTypeDefinitions,
    graphQLResolvers,
    dynamicMiddleware,
    hooks,
    log,
    options,
    i18n
  } = Panacea.container

  graphQLTypeDefinitions().then(typeDefs => {
    const resolvers = graphQLResolvers()

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })

    const app = express()

    const graphqlExpressDynamicMiddleware = dynamicMiddleware.create(
      graphqlExpress((req: Express.Request) => {
        return {
          schema,
          context: {
            req,
            dbModels: dbModels()
          }
        }
      })
    )

    let whitelist: Array<string> = []
    hooks.invoke('core.cors.whitelist', { whitelist, options })

    let corsOptions: CorsOptions = {
      origin: function (origin, callback) {
        if (options.main.disableCors || whitelist[0] === '*' || whitelist.indexOf(origin) !== -1) {
          callback(null, true)
        } else {
          callback(new Error(i18n.t('core.bootstrap.notAllowedCORS'))) // Not allowed by CORS
        }
      },
      // Pass HTTP headers to graphql endpoint.
      credentials: true
    }

    // Main GraphQL endpoint.
    app.use(
      `/${options.main.endpoint}`,
      cors(corsOptions),
      bodyParser.json(),
      graphqlExpressDynamicMiddleware.handler()
    )

    // Allow middleware to be dynamically replaced via core.reload hook without needing to restart the server.
    hooks.on('core.reload', ({ reason }: { reason: string }) => {
      const startTime = Date.now()

      const { entityTypes } = Panacea.container
      entityTypes.clearCache()

      graphQLTypeDefinitions().then(typeDefs => {
        const resolvers = graphQLResolvers()

        const schema = makeExecutableSchema({
          typeDefs,
          resolvers
        })

        graphqlExpressDynamicMiddleware.replace(
          graphqlExpress((req: Express.Request) => {
            return {
              schema,
              context: {
                req,
                dbModels: dbModels()
              }
            }
          })
        )
      }).catch((error: Error) => console.error(error))

      const timeToReplace = Date.now() - startTime

      log.info(i18n.t('core.bootstrap.reloadGraphql', { timeToReplace, reason })) // Reloaded graphql middleware (in {timeToReplace}ms) because {reason}
    })

    // GraphiQL endpoint.
    if (options.graphiql.enable) {
      app.use(
        `/${options.graphiql.endpoint}`,
        graphiqlExpress({
          endpointURL: `/${options.main.endpoint}`
        })
      )
    }

    // Voyager endpoint.
    if (options.voyager.enable) {
      app.use(
        `/${options.voyager.endpoint}`,
        voyagerMiddleware({
          endpointUrl: `/${options.main.endpoint}`
        })
      )
    }

    // Assign the express app onto the Panacea container so the bootstrap caller can serve it.
    Panacea.value('app', app)
  })
  .catch((error: Error) => {
    console.error(error)
    log.error(i18n.t('core.bootstrap.typeDefsError', { error: error.message })) // Server not started. Type definitions error: {error}
  })
}