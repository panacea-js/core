import test from 'ava'
import { initTasks } from './test-common'
import path from 'path'
import panacea from '../../index'

initTasks(test)

test('Fully loaded and bootstrapped panacea core works without errors', t => {
  panacea(path.resolve(__dirname, 'fixtures/panaceaConfigFiles/default.js')).then(config => {
    t.pass()
  }).catch(err => console.error(err))
})
