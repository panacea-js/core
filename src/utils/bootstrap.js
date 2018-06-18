import path from 'path'
import fs from 'fs-extra'

const Bootstrap = function (panaceaConfigFile = '') {
  if (!panaceaConfigFile) {
    panaceaConfigFile = path.resolve(process.cwd(), 'panacea.js')
  }

  panaceaConfigFile = path.resolve(panaceaConfigFile)

  if (!fs.existsSync(panaceaConfigFile)) {
    throw Error(`Could not load panacea.js config file at ${panaceaConfigFile}`)
  }

  this.params = require(panaceaConfigFile).default()
  this.defaultAppPriority = 10
  this.defaultPluginPriority = 0
}

Bootstrap.prototype.all = function () {
  const startTime = Date.now()

  for (const method in this) {
    if (method.indexOf('stage') === 0) {
      const stage = method
      this[stage]()
    }
  }

  const completedTime = Date.now() - startTime

  return Promise.resolve(`Completed full bootstrap (in ${completedTime}ms)`)
}

Bootstrap.prototype.registryPathDiscoveryProcessor = function (registryType, subPath) {
  const { _, path, fs, registry, entities, resolvePluginPath } = Panacea.container

  registry[registryType] = this.params[registryType] || {}

  const unprioritizedRegistrants = []

  // Plugin Registrants.
  _(registry.plugins).forEach((plugin, pluginKey) => {
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
  const applicationSubPath = path.resolve(process.cwd(), subPath)
  if (fs.existsSync(applicationSubPath)) {
    unprioritizedRegistrants.push({
      locationKey: entities.defaults.locationKey,
      path: applicationSubPath,
      priority: this.defaultAppPriority
    })
  }

  const prioritizedRegistrants = unprioritizedRegistrants.sort((a, b) => Number(a.priority) - Number(b.priority))

  const directories = prioritizedRegistrants.filter(x => fs.existsSync(x.path))

  directories.forEach(x => (registry[registryType][x.path] = x))

  return directories
}

/**
* Register services.
*/
Bootstrap.prototype.stage1 = function () {
  require('./DIContainer').registerServices(this.params)
}

/**
* Initialize the registry onto the Panacea.container.
*
* Adds the application level hooks.
*/
Bootstrap.prototype.stage2 = function () {
  Panacea.value('registry', {})
}

/**
* Add plugins to the registry.
*/
Bootstrap.prototype.stage3 = function () {
  const { registry } = Panacea.container

  if (!this.params.hasOwnProperty('plugins')) {
    registry.plugins = {}
    return
  }

  const { chalk, resolvePluginPath } = Panacea.container

  registry.plugins = {}

  this.params.plugins.map(plugin => {
    // Allows plugins to be declared in panacea.js as single string without a priority.
    // Mutate plugin into plugin object structure.
    if (typeof plugin === 'string') {
      plugin = {
        path: plugin
      }
    }

    plugin.priority = plugin.priority || this.defaultPluginPriority

    // Only add plugin to the registry if its path can be resolved.
    if (!resolvePluginPath(plugin.path)) {
      console.error(chalk.bgRed(' 😕  \n' +
      `Plugin ${chalk.underline(plugin.path)} was not found as defined in panacea.js.\n` +
      `If this is a external (contributed) plugin: Check that you have run \`npm install ${plugin.path}\`\n` +
      `If this plugin is part of your application: Check that it can be resolved in the <app_root>/plugins/ directory`))
      return
    }

    console.log(chalk.green(`✔ ${plugin.path} plugin loaded`))

    registry.plugins[plugin.path] = plugin
  })
}

/**
* Load application and plugins hooks.
*/
Bootstrap.prototype.stage4 = function () {
  const { hooks } = Panacea.container
  const directories = this.registryPathDiscoveryProcessor('hooks', 'hooks')
  hooks.loadFromDirectories(directories.map(x => x.path))
}

/**
* Discover and register application and plugins entities.
*/
Bootstrap.prototype.stage5 = function () {
  this.registryPathDiscoveryProcessor('entities', 'config/entities/schemas')
}

/**
* Discover and register application and plugins settings.
*/
Bootstrap.prototype.stage6 = function () {
  this.registryPathDiscoveryProcessor('settings', 'config/settings/schemas')
}

/**
* Prepares GraphQL schema and prepares express app ready to be served.
*/
Bootstrap.prototype.stage7 = function () {
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
    options
  } = Panacea.container

  graphQLTypeDefinitions()
  .then(typeDefs => {
    const resolvers = graphQLResolvers()

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })

    const app = express()

    const graphqlExpressDynamicMiddleware = dynamicMiddleware.create(
      graphqlExpress(req => {
        return {
          schema,
          context: {
            req,
            dbModels: dbModels()
          }
        }
      })
    )

    let whitelist = []
    hooks.invoke('core.cors.whitelist', { whitelist, options })

    var corsOptions = {
      origin: function (origin, callback) {
        if (whitelist[0] === '*' || whitelist.indexOf(origin) !== -1) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
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
    hooks.on('core.reload', reason => {
      const startTime = Date.now()

      const { entities } = Panacea.container
      entities.clearCache()

      graphQLTypeDefinitions().then(typeDefs => {
        const resolvers = graphQLResolvers()

        const schema = makeExecutableSchema({
          typeDefs,
          resolvers
        })

        graphqlExpressDynamicMiddleware.replace(
          graphqlExpress(req => {
            return {
              schema,
              context: {
                req,
                dbModels: dbModels()
              }
            }
          })
        )
      }).catch(error => console.error(error))

      const timeToReplace = Date.now() - startTime

      log.info(`Reloaded graphql middleware (in ${timeToReplace}ms) because ${reason}`)
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
  .catch(error =>
    log.error(new Error(`Server not started. Type definitions error: ${error}`))
  )
}

export default Bootstrap
