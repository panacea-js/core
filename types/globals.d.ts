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
import VueI18n from 'vue-i18n'
import { GraphQLScalarType } from 'graphql'
import { entityTypes } from '../src/entities/entityTypes'
import { Transaction } from '../src/utils/transaction'
import { IHooks } from '../src/utils/hooks';
import { i18n } from '../src/utils/i18n';
import { Logger } from '../src/utils/logger';
import { Application } from 'express';

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
  // Cannot current use vue-i18n types: https://github.com/kazupon/vue-i18n/issues/410
  // i18n: typeof i18n
  jsYaml: typeof jsYaml
  log: winston.Logger
  makeExecutableSchema: typeof makeExecutableSchema
  mongoose: typeof Mongoose
  options: IPanaceaOptionsComplete
  path: typeof path
  Transaction: typeof Transaction
  winston: typeof winston
  vueI18n: typeof VueI18n
}

interface IPanaceaValues {
  defaultAppLocationKey: string
  app: Application
  registry: {
    plugins: {
      [pluginPath: string]: IPlugin
    }
    entityTypes: {
      [pluginPath: string]: IRegistrant
    }
    settings: {
      [pluginPath: string]: IRegistrant
    }
  }
}

interface IPanaceaOptions {
  main?: IPanaceaOptionsSectionMain
  plugins?: IPanaceaOptionsSectionPlugins
  locales?: IPanaceaOptionsSectionLocales
  services: {
    file?: string,
    globalVariable?: string
    options?: IPanaceaOptionsSectionServicesOptions
  }
  entityTypes?: {
    [locationKey: string]: IRegistrant
  }
  hooks?: {
    [locationKey: string]: IRegistrant
  }
  settings?: {
    [locationKey: string]: IRegistrant
  }
  graphiql?: IPanaceaOptionsSectionGraphiql
  voyager?: IPanaceaOptionsSectionVoyager
}

interface IPanaceaOptionsComplete {
  main: IPanaceaOptionsSectionMain
  plugins: IPanaceaOptionsSectionPlugins
  locales: IPanaceaOptionsSectionLocales
  services: {
    file: string
    globalVariable: string
    options: IPanaceaOptionsSectionServicesOptions
  }
  entityTypes: {
    [locationKey: string]: IRegistrant
  }
  hooks: {
    [locationKey: string]: IRegistrant
  }
  settings: {
    [locationKey: string]: IRegistrant
  }
  graphiql: IPanaceaOptionsSectionGraphiql
  voyager: IPanaceaOptionsSectionVoyager
}

interface IPanaceaOptionsSectionMain {
  protocol: 'http' | 'https'
  host: string
  endpoint: string
  port: Promise<number>
  disableCors?: boolean
}

type IPanaceaOptionsSectionPlugins = Array<string | IPlugin>

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

interface IRegistrant {
  locationKey: string
  path: string
  priority: number
}

interface IPlugin {
  path: string
  priority: number
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
  container: IPanaceaDependencies & IPanaceaValues & {
    [dependency: string]: any
  }
  value(name: string, val: any): any
  options: IPanaceaOptions
}

declare global {
  var Panacea: IPanacea;
}
