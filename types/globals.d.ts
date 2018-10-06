import * as GraphQLToolsTypes from 'graphql-tools'
import { makeExecutableSchema } from 'graphql-tools';
import { IResolvers } from 'graphql-tools/dist/Interfaces';

interface IPanaceaDependencies {
  makeExecutableSchema: typeof makeExecutableSchema
  graphQLResolvers: () => IResolvers

  options: IPanaceaOptions
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
