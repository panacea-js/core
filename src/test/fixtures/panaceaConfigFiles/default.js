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
