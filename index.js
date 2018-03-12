import Bootstrap from './src/utils/bootstrap'

export default function (panaceaConfigPath = '') {
  new Bootstrap(panaceaConfigPath).all()

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
  } = DI.container

  return new Promise((resolve, reject) => {
    graphQLTypeDefinitions()
      .then(typeDefs => {
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
          cors(),
          bodyParser.json(),
          graphqlExpressDynamicMiddleware.handler()
        )

        // Allow middleware to be dynamically replaced without restarting server.
        hooks.on('core.reload', reason => {
          const startTime = Date.now()

          const { entities } = DI.container
          entities.clearCache()

          graphQLTypeDefinitions().then(typeDefs => {
            const resolvers = graphQLResolvers()

            const schema = makeExecutableSchema({
              typeDefs,
              resolvers
            })

            graphqlExpressDynamicMiddleware.replace(
              graphqlExpress({
                schema,
                context: dbModels()
              })
            )
          })

          const timeToReplace = Date.now() - startTime

          log.info(
            `Reloaded graphql middleware (in ${timeToReplace}ms) because ${reason}`
          )
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

        return resolve({ app, options })
      })
      .catch(error =>
        reject(
          new Error(`Server not started. Type definitions error: ${error}`)
        )
      )
  })
}
