import test from 'ava'
import { initTasks } from '../../test/setup-test-env.js'
initTasks(test)

const { graphQLTypeDefinitions } = DI.container

test.skip('TODO', t => {
  graphQLTypeDefinitions()

  t.pass()
})
