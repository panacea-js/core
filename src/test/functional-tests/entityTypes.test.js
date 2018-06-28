import test from 'ava'
import { bootstrap, initTasks } from '../test-common'
import fetch from 'node-fetch'

initTasks(test)
bootstrap()

// TODO: Abstract the graphql functional call to its own callable task.
test('_entityTypes graphql query resolves with Cat and Dog entity types', t => {
  t.plan(2)
  return new Promise((resolve, reject) => {
    const { options, app } = Panacea.container

    app.listen(options.main.port, () => {
      const query = '{ _entityTypes { name } }'

      const url = `${options.main.protocol}://${options.main.host}:${options.main.port}/${options.main.endpoint}`
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      .then(response => response.json())
      .then(json => {
        const entityNames = json.data._entityTypes.map(et => et.name)
        t.true(entityNames.includes('Cat'))
        t.true(entityNames.includes('Dog'))
        resolve()
      }).catch(error => console.error(error) && reject(error))
    })
  })
})
