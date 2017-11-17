import { registerServices } from '../utils/DIContainer'
import { getSandboxDir } from './test-common'

const sandboxDir = getSandboxDir()

// Don't use process.env variables or dotenv for tests.
// Instead, directly inject configuration into registerServices().

const params = {
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
  entities: [ `${__dirname}/fixtures/entities/schemas` ]
}
registerServices(params)
