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

interface IPanaceaDependencies {
  makeExecutableSchema: typeof makeExecutableSchema
  graphQLTypeDefinitions: () => Promise<string>
  graphQLResolvers: () => IResolvers
  _: LoDashStatic
  winston: typeof winston
  glob: typeof glob
  path: typeof path
  jsYaml: typeof jsYaml
  options: IPanaceaOptions
  fs: typeof fsExtra
  dbConnection: typeof Mongoose.connection
  mongoose: typeof Mongoose
  GraphQLScalarType: typeof GraphQLScalarType
  entityTypes: typeof entityTypes
  Transaction: typeof Transaction
}

interface IPanaceaOptions {
  main: {
    protocol: 'http' | 'https'
    host: string
    endpoint: string
    port: Promise<number>
    disableCors: boolean
  },
  locales: {
    default: string
  },
  services: {
    file: string,
    globalVariable: string
    options: {
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
  },
  graphiql: {
    endpoint: string
    enable: boolean
  },
  voyager: {
    endpoint: string
    enable: boolean
  }
}

export interface IPanacea {
  container: IPanaceaDependencies & {
    [dependency: string]: any
  }
  value(name: string, val: any): any
  options: IPanaceaOptions
}

declare global {
  var Panacea: IPanacea;
}
