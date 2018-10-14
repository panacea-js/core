import test from 'ava'
import * as path from 'path'
import { cloneDeep } from 'lodash'
import { bootstrap, initTasks } from '../../test/testCommon'
import { registerServices } from '../DIContainer'
initTasks(test)
bootstrap()

const testDir = path.resolve(__dirname, '../../test')
const panaceaConfig = require(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js'))

test('Panacea.container registers correctly to global Panacea object with no params passed in', t => {
  registerServices(panaceaConfig)
  t.true(Panacea.container.hasOwnProperty('options'))
})

test('Panacea.container successfully overrides injected arguments', t => {
  t.plan(2)

  const clonedConfig = cloneDeep(panaceaConfig)
  clonedConfig.services.globalVariable = 'Panacea_Testing'
  registerServices(clonedConfig)

  // @ts-ignore
  t.true(Panacea_Testing.container.hasOwnProperty('options'))
  // @ts-ignore
  t.true(Panacea_Testing.container.options.services.globalVariable === 'Panacea_Testing')
})
