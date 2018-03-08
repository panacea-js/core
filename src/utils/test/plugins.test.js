import test from 'ava'
import { bootstrap, initTasks } from '../../test/test-common'
initTasks(test)
bootstrap('emptyPlugin')
const { hooks, registry } = DI.container

test('Hook listener can be registered and stored in the _events list', t => {
  hooks.on('listenerIsRegistered', data => {
    // Stub
  })

  t.true(typeof hooks._events.listenerIsRegistered !== 'undefined')
})

test('empty-plugin is in the registry', t => {
  let pluginFound = false

  for (const plugin in registry.plugins) {
    if (plugin.indexOf('empty-plugin') !== -1) {
      pluginFound = true
    }
  }

  t.true(pluginFound)
})
