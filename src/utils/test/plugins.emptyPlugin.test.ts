import test from 'ava'
import { bootstrap, initTasks } from '../../test/testCommon'
initTasks(test)
bootstrap('emptyPlugin')
const { registry } = Panacea.container

test('empty-plugin is the plugin registry', t => {
  for (const plugin in registry.plugins) {
    if (plugin.indexOf('empty-plugin') !== -1) {
      t.pass()
    }
  }
})
