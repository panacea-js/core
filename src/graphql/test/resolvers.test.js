import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { options } = DI.container

import panacea from '../../../index'

test.skip('TODO', t => {

  return new Promise((resolve, reject) => {

    panacea(options).then(app => {

      resolve()

    })

  })
  //graphQLResolvers()


})
