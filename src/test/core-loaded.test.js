import test from 'ava'
import { initTasks } from './test-common'
import path from 'path'
initTasks(test)

import panacea from '../../index'

test('Fully loaded and bootstrapped panacea core works without errors', t => {
  panacea(path.resolve(__dirname, 'panacea.js')).then(config => {
    t.pass()
  }).catch(err => console.error(err))
})

