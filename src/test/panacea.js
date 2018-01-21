import { getSandboxDir } from './test-common'

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
        path: `${__dirname}/fixtures/entities/schemas`
      }
    }
  }
}
