/**
 * Add services to the DI container.
 *
 * @param s
 *   Builder object from src/utils/DIContainer::servicesBuilder()
 *
 * @param options
 *   Options injected from bootstrapping file to configure dependencies
 */
export const registerServices = function(s, options) {

  const servicesOptions = options.services.options

  const d = __dirname + '/'

  // Third-party.
  s.add('_', 'lodash')
  s.add('fs', 'fs-extra')
  s.add('glob', 'glob')
  s.add('jsYaml', 'js-yaml')
  s.add('requireDir', 'require-dir')
  s.add('express', 'express')
  s.add('voyagerMiddleware', 'graphql-voyager/middleware', 'express')
  s.add('bodyParser', 'body-parser')
  s.add('graphqlExpress', 'apollo-server-express', 'graphqlExpress')
  s.add('graphiqlExpress', 'apollo-server-express', 'graphiqlExpress')
  s.add('makeExecutableSchema', 'graphql-tools', 'makeExecutableSchema')
  s.add('mongoose', 'mongoose')

  // Panacea.
  s.add('appConfig', d + 'utils/appConfig', 'appConfig')
  s.add('log', d + 'utils/logger', 'Logger', [servicesOptions.log])
  s.add('loadYmlFiles', d + 'utils/yaml', 'loadYmlFiles')
  s.add('hooks', d + 'utils/hooks', 'hooks')
  s.add('formatters', d + 'utils/formatters')
  s.add('dbConnection', d + 'mongodb/connection', 'dbConnection')
  s.add('dbModels', d + 'mongodb/models', 'dbModels')
  s.add('graphQLTypeDefinitions', d + 'graphql/types', 'graphQLTypeDefinitions')
  s.add('graphQLResolvers', d + 'graphql/resolvers', 'graphQLResolvers')

}

export const defaultOptions = function() {

  const env = process.env
  const cwd = process.cwd()
  const d = __dirname

  return {
    main: {
      endpoint: 'graphql',
      port: 3000,
      deferListen: false,
    },
    services: {
      file: __filename,
      globalVariable: 'DI',
      options: {
        log: {
          directory: `${cwd}/${env.APP_LOG}`,
          maxSize: env.APP_LOG_MAX_SIZE
        }
      }
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

}