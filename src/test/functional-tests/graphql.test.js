import test from 'ava'
import { graphqlQuery, initTasks } from '../test-common'
initTasks(test)

test('_entityTypes graphql query resolves with Cat and Dog entity types', t => {
  t.plan(2)
  return new Promise((resolve, reject) => {
    graphqlQuery('{ _entityTypes { name } }')
      .then(json => {
        const entityNames = json.data._entityTypes.map(et => et.name)
        t.true(entityNames.includes('Cat'))
        t.true(entityNames.includes('Dog'))
        resolve()
      })
      .catch(error => console.error(error) && reject(error))
  })
})

test('_entityType graphql query resolves with Cat entity type', t => {
  return new Promise((resolve, reject) => {
    graphqlQuery('{ _entityType(name: "Cat") { name } }')
      .then(json => {
        t.true(json.data._entityType.name === 'Cat')
        resolve()
      })
      .catch(error => console.error(error) && reject(error))
  })
})

test('_fieldTypes graphql query resolves with basic field types', t => {
  t.plan(4)
  return new Promise((resolve, reject) => {
    graphqlQuery('{ _fieldTypes { type } }')
      .then(json => {
        const fieldTypes = json.data._fieldTypes.map(ft => ft.type)
        t.true(fieldTypes.includes('id'))
        t.true(fieldTypes.includes('string'))
        t.true(fieldTypes.includes('int'))
        t.true(fieldTypes.includes('object'))
        resolve()
      })
      .catch(error => console.error(error) && reject(error))
  })
})
