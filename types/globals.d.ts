import * as GraphQLToolsTypes from 'graphql-tools'
import { makeExecutableSchema } from 'graphql-tools'
import { IResolvers } from 'graphql-tools/dist/Interfaces'
import { LoDashStatic } from 'lodash'
import * as winston from 'winston'
import * as jsYaml from 'js-yaml'
import * as glob from 'glob'
import * as path from 'path'
import * as fsExtra from 'fs-extra'
import * as Mongoose from 'mongoose'
import { GraphQLScalarType } from 'graphql'
import { entityTypes } from '../src/entities/entityTypes'
import { Transaction } from '../src/utils/transaction'
import { IHooks } from '../src/utils/hooks';
import { Logger } from '../src/utils/logger';

interface IPanaceaDependencies {
  _: LoDashStatic
  dbConnection: typeof Mongoose.connection
  entityTypes: typeof entityTypes
  fs: typeof fsExtra
  glob: typeof glob
  graphQLResolvers: () => IResolvers
  graphQLTypeDefinitions: () => Promise<string>
  GraphQLScalarType: typeof GraphQLScalarType
  hooks: IHooks
  jsYaml: typeof jsYaml
  log: winston.Logger
  makeExecutableSchema: typeof makeExecutableSchema
  mongoose: typeof Mongoose
  options: IPanaceaOptionsComplete
  path: typeof path
  Transaction: typeof Transaction
  winston: typeof winston
}

interface IPanaceaOptions {
  main?: IPanaceaOptionsSectionMain
  plugins?: IPanaceaOptionsSectionPlugins
  locales?: IPanaceaOptionsSectionLocales
  services: {
    file?: string,
    globalVariable?: string
    options?: IPanaceaOptionsSectionServicesOptions
  },
  entityTypes?: IPanaceaOptionsEntityTypes,
  graphiql?: IPanaceaOptionsSectionGraphiql,
  voyager?: IPanaceaOptionsSectionVoyager
}

interface IPanaceaOptionsComplete {
  main: IPanaceaOptionsSectionMain
  plugins: IPanaceaOptionsSectionPlugins
  locales: IPanaceaOptionsSectionLocales
  services: {
    file: string,
    globalVariable: string
    options: IPanaceaOptionsSectionServicesOptions
  },
  entityTypes: IPanaceaOptionsEntityTypes,
  graphiql: IPanaceaOptionsSectionGraphiql,
  voyager: IPanaceaOptionsSectionVoyager
}

interface IPanaceaOptionsSectionMain {
  protocol: 'http' | 'https'
  host: string
  endpoint: string
  port: Promise<number>
  disableCors?: boolean
}
type IPanaceaOptionsSectionPlugins = Array<string>

interface IPanaceaOptionsSectionLocales {
  default: string
}

interface IPanaceaOptionsSectionServicesOptions {
  log: {
    directory: string
    maxSize: string
    showLogsInConsole: boolean
    logToFiles: boolean
  },
  db: {
    type: string
    host: string
    dbName: string
    port: number
  }
}

interface IPanaceaOptionsEntityTypes {
  [locationName: string]: {
    locationKey: string
    path: string
  }
}

interface IPanaceaOptionsSectionGraphiql {
  endpoint: string
  enable: boolean
}

interface IPanaceaOptionsSectionVoyager {
  endpoint: string
  enable: boolean
}

interface IPanacea {
  container: IPanaceaDependencies & {
    [dependency: string]: any
  }
  value(name: string, val: any): any
  options: IPanaceaOptions
}

declare global {
  var Panacea: IPanacea;
}
