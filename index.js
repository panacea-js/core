import { registerServicesFromFile } from './src/utils/DIContainer'
registerServicesFromFile(__dirname + '/src/default.services')

export default function(options = {}) {

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
    log
  } = DI.container

  appConfig().then((config) => {

    // Load application level hooks.
    if (config.hasOwnProperty('hooks')) {
      hooks.loadFromDirectories(config.hooks)
    }

    graphQLTypeDefinitions().then(typeDefs => {

      const resolvers = graphQLResolvers()

      const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
      });

      const app = express();

      app.use('/graphql', bodyParser.json(), graphqlExpress({ schema, context: dbModels() }));

      app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

      app.use('/voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));

      app.listen(3000);
      log.info('Server listening on port 3000')

      hooks.logAvailableHooks()

    }).catch(error => log.error(`Server not started: ${error}`))

  }).catch(error => log.error(`Server not started: ${error}`))

}