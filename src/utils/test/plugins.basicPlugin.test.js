import test from 'ava'
import { bootstrap, initTasks } from '../../test/test-common'
initTasks(test)
bootstrap('basicPlugin')
const { hooks, registry } = Panacea.container

test('basic-plugin has its testHooks file registered', t => {
  let pluginFound = false

  for (const plugin in registry.plugins) {
    if (plugin.indexOf('basic-plugin') !== -1) {
      pluginFound = true
    }
  }

  t.true(pluginFound)
})

test('basic-plugin has its test listener is registered on the hooks event emitter', t => {
  t.true(hooks._events.basicPluginIsListening !== 'undefined')
})
