import { registerServicesFromFile } from './src/utils/DIContainer'
registerServicesFromFile(`${__dirname}/src/default.services`)

export default function (params = {}) {
  const {
    appConfig,
    makeExecutableSchema,
    dbModels,
    graphiqlExpress,
    graphqlExpress,
    bodyParser,
    express,
    voyagerMiddleware,
    graphQLTypeDefinitions,
    graphQLResolvers,
    hooks,
    log,
    _
  } = DI.container

  const defaults = {
    main: {
      endpoint: 'graphql',
      port: 3000,
      deferListen: false
    },
    graphiql: {
      endpoint: 'graphiql',
      enable: true
    },
    voyager: {
      endpoint: 'voyager',
      enable: true
    }
  }

  const options = _.defaultsDeep(params || {}, defaults)

  return new Promise((resolve, reject) => {
    appConfig().then(config => {
      // Load application level hooks.
      if (config.hasOwnProperty('hooks')) {
        hooks.loadFromDirectories(config.hooks)
      }

      graphQLTypeDefinitions().then(typeDefs => {
        const resolvers = graphQLResolvers()

        const schema = makeExecutableSchema({
          typeDefs,
          resolvers
        })

        const app = express()

        // Main GraphQL endpoint.
        app.use(
          `/${options.main.endpoint}`,
          bodyParser.json(),
          graphqlExpress({
            schema,
            context: dbModels()
          })
        )

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

        hooks.logAvailableHooks()

        if (!options.main.deferListen) {
          app.listen(`${options.main.port}`)
          log.info(`Server listening on port ${options.main.port}`)
        }

        return resolve(app)
      }).catch(error => reject(new Error(`Server not started. Type definitions error: ${error}`)))
    }).catch(error => reject(new Error(`Server not started: Application configuration error: ${error}`)))
  })
}
