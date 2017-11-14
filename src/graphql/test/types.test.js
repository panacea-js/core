import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { graphQLTypeDefinitions } = DI.container

test.skip('TODO', t => {
  graphQLTypeDefinitions()

  t.pass()
})
