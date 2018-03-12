import test from 'ava'
import { bootstrap, initTasks } from '../../test/test-common'
import panacea from '../../../index'
initTasks(test)
bootstrap()

const { options } = Panacea.container

test.skip('TODO', t => {
  return new Promise((resolve, reject) => {
    panacea(options).then(app => {
      resolve()
    })
  })
  // graphQLResolvers()
})
