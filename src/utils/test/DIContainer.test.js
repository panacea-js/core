import test from 'ava'
import { bootstrap, initTasks } from '../../test/test-common'
import { registerServices } from '../DIContainer'
initTasks(test)
bootstrap()

test('Panacea.container registers correctly to global Panacea object with no params passed in', t => {
  registerServices()
  t.true(Panacea.container.hasOwnProperty('options'))
})

test('Panacea.container successfully overrides injected arguments', t => {
  t.plan(2)
  registerServices({
    services: {
      globalVariable: 'Panacea_Testing'
    }
  })
  t.true(Panacea_Testing.container.hasOwnProperty('options'))
  t.true(Panacea_Testing.container.options.services.globalVariable === 'Panacea_Testing')
})
