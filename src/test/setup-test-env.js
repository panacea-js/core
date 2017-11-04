import { registerServicesFromFile } from '../utils/DIContainer'
registerServicesFromFile(process.cwd() + '/src/default.services')

import { getSandboxDir, initTasks } from "./test-common";
export { getSandboxDir, initTasks }
