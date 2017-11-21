export default function (params = {}) {
  require('./src/utils/DIContainer').registerServices(params)

  const {
    makeExecutableSchema,
    dbModels,
    graphiqlExpress,
    graphqlExpress,
    bodyParser,
    express,
    voyagerMiddleware,
    graphQLTypeDefinitions,
    graphQLResolvers,
    dynamicMiddleware,
    hooks,
    log,
    options
  } = DI.container

  return new Promise((resolve, reject) => {
    // Load application level hooks.
    if (options.hooks.length > 0) {
      hooks.loadFromDirectories(options.hooks)
    }

    graphQLTypeDefinitions().then(typeDefs => {
      const resolvers = graphQLResolvers()

      const schema = makeExecutableSchema({
        typeDefs,
        resolvers
      })

      const app = express()

      const graphqlExpressDynamicMiddleware = dynamicMiddleware.create(
        graphqlExpress({
          schema,
          context: dbModels()
        })
      )

      // Main GraphQL endpoint.
      app.use(
        `/${options.main.endpoint}`,
        bodyParser.json(),
        graphqlExpressDynamicMiddleware.handler()
      )

      // Allow middle to be dynamically replaced without restarting server.
      hooks.on('core.reload', (reason) => {
        const startTime = Date.now()

        const { entities } = DI.container
        entities.clearCache()

        graphQLTypeDefinitions().then(typeDefs => {
          const resolvers = graphQLResolvers()

          const schema = makeExecutableSchema({
            typeDefs,
            resolvers
          })

          graphqlExpressDynamicMiddleware.replace(graphqlExpress({
            schema,
            context: dbModels()
          }))
        })

        const timeToReplace = Date.now() - startTime

        log.info(`Reloaded graphql middleware (in ${timeToReplace}ms) because ${reason}`)
      })

      setTimeout(() => {
        console.log(hooks.getAvailableHooksOutput(false))
      }, 250)

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

      if (!options.main.deferListen) {
        app.listen(`${options.main.port}`)
        log.info(`Server started. Listening on port ${options.main.port}`)
      }

      return resolve(app)
    }).catch(error => reject(new Error(`Server not started. Type definitions error: ${error}`)))
  })
}
