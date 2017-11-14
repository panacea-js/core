import test from 'ava'
import { initTasks } from '../../test/test-common'
import { registerServices } from '../DIContainer'
initTasks(test)

test('DI container registers correctly to global DI object with no params passed in', t => {
  registerServices()
  t.true(DI.container.hasOwnProperty('options'))
})

test('DI container successfully overrides injected arguments', t => {
  t.plan(2)
  registerServices({
    services: {
      globalVariable: 'DI_Testing'
    }
  })
  t.true(DI_Testing.container.hasOwnProperty('options'))
  t.true(DI_Testing.container.options.services.globalVariable === 'DI_Testing')
})
