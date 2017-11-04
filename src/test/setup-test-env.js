import { registerServicesFromFile } from '../utils/DIContainer'
registerServicesFromFile('src/default.services')

import { getSandboxDir, initTasks } from "./test-common";
export { getSandboxDir, initTasks }
