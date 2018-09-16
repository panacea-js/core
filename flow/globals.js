// @flow
declare var Panacea: {
  container: Object,
  value(name: string, val: any): Object,
  options: {
    main: {
      protocol: 'http' | 'https',
      host: string,
      endpoint: string,
      port: number
    },
    locales: {
      default: string
    },
    services: {
      file: string,
      globalVariable: string,
      options: {
        log: {
          directory: string,
          maxSize: string,
          showLogsInConsole: boolean,
          logToFiles: boolean
        },
        db: {
          type: string,
          host: string,
          dbName: string,
          port: number
        }
      }
    },
    graphiql: {
      endpoint: string,
      enable: boolean
    },
    voyager: {
      endpoint: string,
      enable: boolean
    }
  }
}
