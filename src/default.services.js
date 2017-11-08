export default {
  // Third-party.
  dotenv: require('dotenv-safe').load(),
  _: require('lodash'),
  fs: require('fs-extra'),
  glob: require('glob'),
  jsYaml: require('js-yaml'),
  requireDir: require('require-dir'),
  express: require('express'),
  voyagerMiddleware: require('graphql-voyager/middleware').express,
  bodyParser: require('body-parser'),
  graphqlExpress: require('apollo-server-express').graphqlExpress,
  graphiqlExpress: require('apollo-server-express').graphiqlExpress,
  makeExecutableSchema: require('graphql-tools').makeExecutableSchema,
  mongoose: require('mongoose'),

  // Panacea.
  appConfig: require('./utils/appConfig').appConfig,
  log: require('./utils/logger').Logger(),
  loadYmlFiles: require('./utils/yaml').loadYmlFiles,
  hooks: require('./utils/hooks').hooks,
  formatters: require('./utils/formatters'),
  dbConnection: require('./mongodb/connection').dbConnection,
  dbModels: require('./mongodb/models').dbModels,
  graphQLTypeDefinitions: require('./graphql/types').graphQLTypeDefinitions,
  graphQLResolvers: require('./graphql/resolvers').graphQLResolvers
}
