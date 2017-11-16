import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { graphQLResolvers } = DI.container

test('TODO', t => {
  graphQLResolvers()

  t.pass()
})
