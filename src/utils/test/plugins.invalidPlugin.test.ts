import test from 'ava'
import { bootstrap, initTasks, getSandboxDir } from '../../test/testCommon'
initTasks(test)

const sandboxDir = getSandboxDir()

test('Invalid plugin locations shows warning', t => {
  return new Promise(resolve => {
    bootstrap('invalidPlugin', ['10-add-plugins-registry'])
    const { fs } = Panacea.container

    // Wait 100ms to give logger a chance to write file before
    // checking contents.
    setTimeout(() => {
      const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')
      t.true(logFileContent.indexOf('If this is a external (contributed) plugin: Check that you have run') !== -1)
      resolve()
    }, 100)
  })
})
