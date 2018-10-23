import { getSandboxDir } from '../../testCommon'
import * as path from 'path'
import * as portfinder from 'portfinder'
import { IPanaceaOptions } from '../../../../types/globals'

const sandboxDir = getSandboxDir()

// Add extra port entropy to portfinder start port to prevent port clashes.
// This is a workaround for portfinder as it is doesn't return an available port every time.
const microTime = Math.ceil(Date.now() % 1000)
const availablePort = (startPort: number) => {
  return portfinder.getPortPromise({ host: '127.0.0.1', port: startPort + microTime })
}

export default function (): IPanaceaOptions {
  return {
    main: {
      port: availablePort(6000),
      protocol: 'http',
      disableCors: true,
      host: process.env.APP_SERVE_HOST || 'localhost',
      endpoint: process.env.APP_SERVE_ENDPOINT || 'graphql'
    },
    services: {
      options: {
        log: {
          directory: `${sandboxDir}/logs`,
          maxSize: '1024k',
          showLogsInConsole: false,
          logToFiles: true
        },
        db: {
          type: 'mongodb',
          host: 'localhost',
          dbName: `panacea-test-${process.pid}`,
          // Not using default port 27017 to prevent a possible clash with non-test mongo instance.
          port: 27018
        }
      }
    },
    entityTypes: {
      test: {
        path: path.resolve(__dirname, '..', 'entityTypes/schemas'),
        locationKey: 'test',
        priority: 0
      },
      sandbox: {
        path: `${sandboxDir}`,
        locationKey: 'sandbox',
        priority: 0
      }
    }
  }
}
