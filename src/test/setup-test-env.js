import { registerServices } from '../utils/DIContainer'
import { getSandboxDir, initTasks } from './test-common'

require('dotenv-safe').load()
const env = process.env

const sandboxDir = getSandboxDir()

const params = {
  services: {
    options: {
      log: {
        directory: `${sandboxDir}/logs`,
        maxSize: env.APP_LOG_MAX_SIZE
      }
    }
  }
}

registerServices(params)

//require('./src/utils/DIContainer').registerServices(params)

export { getSandboxDir, initTasks }
