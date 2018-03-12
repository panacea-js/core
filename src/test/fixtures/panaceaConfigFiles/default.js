import { getSandboxDir } from '../../test-common'
import path from 'path'

const sandboxDir = getSandboxDir()

export default function () {
  return {
    main: {
      port: 5555
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
    entities: {
      test: {
        path: path.resolve(__dirname, '..', 'entities/schemas'),
        locationKey: 'test'
      },
      sandbox: {
        path: `${sandboxDir}`,
        locationKey: 'sandbox'
      }
    }
  }
}
