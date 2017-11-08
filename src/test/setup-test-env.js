import { registerServicesFromFile } from '../utils/DIContainer'
import { getSandboxDir, initTasks } from './test-common'

registerServicesFromFile(process.cwd() + '/src/default.services')

export { getSandboxDir, initTasks }
