/**
 * Add services to the Panacea.container.
 *
 * @param s
 *   Services builder object from src/utils/DIContainer::servicesBuilder()
 *
 * @param options
 *   Options injected from bootstrapping file to configure dependencies
 */
export const registerServices = function (s, options) {
  const servicesOptions = options.services.options

  // Third-party.
  s.add('_', 'lodash')
  s.add('fs', 'fs-extra')
  s.add('path', 'path')
  s.add('glob', 'glob')
  s.add('jsYaml', 'js-yaml')
  s.add('rimraf', 'rimraf')
  s.add('rsync', 'rsync')
  s.add('mkdirp', 'mkdirp')
  s.add('express', 'express')
  s.add('cors', 'cors')
  s.add('accepts', 'accepts')
  s.add('voyagerMiddleware', 'graphql-voyager/middleware', 'express')
  s.add('bodyParser', 'body-parser')
  s.add('graphqlExpress', 'apollo-server-express', 'graphqlExpress')
  s.add('graphiqlExpress', 'apollo-server-express', 'graphiqlExpress')
  s.add('makeExecutableSchema', 'graphql-tools', 'makeExecutableSchema')
  s.add('mongoose', 'mongoose')
  s.add('winston', 'winston')
  s.add('chalk', 'chalk')
  s.add('moment', 'moment')
  s.add('vue', 'vue')
  s.add('vueI18n', 'vue-i18n')

  // Panacea.
  // Alias to panacea core module src directory.
  s.alias('%core', __dirname)

  s.add('bootstrap', '%core/utils/bootstrap')
  s.add('i18n', '%core/utils/i18n', 'i18n')
  s.add('resolvePluginPath', '%core/utils/plugins', 'resolvePluginPath')
  s.add('log', '%core/utils/logger', 'Logger', [servicesOptions.log])
  s.add('loadYmlFiles', '%core/utils/yaml', 'loadYmlFiles')
  s.add('writeYmlFile', '%core/utils/yaml', 'writeYmlFile')
  s.add('hooks', '%core/utils/hooks', 'hooks')
  s.add('formatters', '%core/utils/formatters')
  s.add('entities', '%core/entities/entities', 'entities')
  s.add('dbConnection', '%core/mongodb/connection', 'dbConnection', [servicesOptions.db])
  s.add('dbModels', '%core/mongodb/models', 'dbModels')
  s.add('graphQLTypeDefinitions', '%core/graphql/types', 'graphQLTypeDefinitions')
  s.add('graphQLResolvers', '%core/graphql/resolvers', 'graphQLResolvers')
  s.add('dynamicMiddleware', '%core/utils/dynamic-middleware')
}

/**
 * Defines the default options passed to register services.
 *
 * These can be overriden by the consumer via the params argument to the
 * initial panacea invocation.
 *
 * @returns Object
 */
export const servicesConfig = function () {
  require('dotenv-safe').load()

  const cwd = process.cwd()
  const env = process.env

  return {
    main: {
      protocol: process.env.APP_SERVE_PROTOCOL || 'https',
      host: process.env.APP_SERVE_HOST || 'localhost',
      endpoint: process.env.APP_SERVE_ENDPOINT || 'graphql',
      port: process.env.APP_SERVE_PORT || 3000
    },
    locales: {
      default: 'en'
    },
    services: {
      file: __filename,
      globalVariable: 'Panacea',
      options: {
        log: {
          directory: env.APP_LOG || `${cwd}/data/app_log`,
          maxSize: env.APP_LOG_MAX_SIZE || 1048576,
          showLogsInConsole: env.NODE_ENV !== 'production',
          logToFiles: true
        },
        db: {
          type: env.DB_TYPE || 'mongodb',
          host: env.DB_HOST || 'localhost',
          dbName: env.DB_NAME || 'panacea',
          port: 27017
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
