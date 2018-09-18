import { getSandboxDir } from '../../test-common'
import path from 'path'
import portfinder from 'portfinder'

const sandboxDir = getSandboxDir()

// Add extra port entropy to portfinder start port to prevent port clashes.
// This is a workaround for portfinder as it is doesn't return an available port every time.
const microTime = Math.ceil(Date.now() % 1000)
const availablePort = (startPort) => portfinder.getPortPromise({host: '127.0.0.1', port: startPort + microTime })

export default function () {
  return {
    main: {
      port: availablePort(6000),
      protocol: 'http',
      disableCors: true
    },
    services: {
      options: {
        log: {
          directory: `${sandboxDir}/logs`,
          maxSize: '1024k',
          showLogsInConsole: false
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
        locationKey: 'test'
      },
      sandbox: {
        path: `${sandboxDir}`,
        locationKey: 'sandbox'
      }
    }
  }
}
