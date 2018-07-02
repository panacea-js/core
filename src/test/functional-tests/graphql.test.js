import test from 'ava'
import { graphqlQuery, initTasks } from '../test-common'
initTasks(test)

test('_entityTypes graphql query resolves with Cat and Dog entity types', t => {
  t.plan(2)

  return graphqlQuery('{ _entityTypes { name } }')
    .then(json => {
      const entityNames = json.data._entityTypes.map(et => et.name)
      t.true(entityNames.includes('Cat'))
      t.true(entityNames.includes('Dog'))
    })
    .catch(error => console.error(error))
})

test('_entityType graphql query resolves with Cat entity type', t => {
  graphqlQuery('{ _entityType(name: "Cat") { name } }')
    .then(json => {
      t.true(json.data._entityType.name === 'Cat')
    })
    .catch(error => console.error(error))
})

test('_fieldTypes graphql query resolves with basic field types', t => {
  t.plan(4)

  return graphqlQuery('{ _fieldTypes { type } }')
    .then(json => {
      const fieldTypes = json.data._fieldTypes.map(ft => ft.type)
      t.true(fieldTypes.includes('id'))
      t.true(fieldTypes.includes('string'))
      t.true(fieldTypes.includes('int'))
      t.true(fieldTypes.includes('object'))
    })
    .catch(error => console.error(error))
})

test('Can create, read and delete an entity with just one field', t => {
  t.plan(3)

  // Create 'Puss'.
  return graphqlQuery(`mutation { createCat(params: { name: "Puss" }) { id, name } }`)
    .then(json => {
      const entity = json.data.createCat
      t.is(entity.name, 'Puss')
      return entity.id
    })
    .then(id => {
      // Read 'Puss' from its generated ID.
      return graphqlQuery(`{ cat(id: "${id}") { name } }`).then(json => {
        const entity = json.data.cat
        t.is(entity.name, 'Puss')
        return id
      })
    })
    .then(id => {
      // Delete 'Puss' with the deleted ID returned.
      return graphqlQuery(`mutation { deleteCat(id: "${id}") }`).then(json => {
        t.is(id, json.data.deleteCat)
      })
    })
    .catch(error => console.error(error))
})

test('Can create, read and delete an entity with referenced entities', t => {
  t.plan(11)

  // Create 'Rover' the dog.
  return graphqlQuery('mutation { createDog(params: { name: "Rover" }) { id, name } }')
    .then(json => {
      const rover = json.data.createDog
      t.is(rover.name, 'Rover')
      return rover.id
    })
    .then(roverId => {
      // Create 'Fido' the dog.
      return graphqlQuery(`mutation { createDog(params: { name: "Fido" }) { id, name } }`).then(json => {
        const fido = json.data.createDog
        const fidoId = fido.id
        t.is(fido.name, 'Fido')
        return [roverId, fidoId]
      })
    })
    .then(dogIds => {
      const livesWithDogsInput = dogIds.map(d => `"${d}"`).join(', ')

      // Create 'Puss' and reference the dogs.
      return graphqlQuery(`mutation { createCat(params: { name: "Puss", livesWithDogs: [${livesWithDogsInput}] }) { id, name, livesWithDogs { id, name } } }`).then(json => {
        const puss = json.data.createCat
        t.is(puss.name, 'Puss')
        t.is(puss.livesWithDogs[0].name, 'Rover')
        t.is(puss.livesWithDogs[1].name, 'Fido')
        return {
          catId: puss.id,
          dogIds
        }
      })
    })
    .then(ids => {
      // Read 'Puss' from its generated ID and assert they're friends (or at least live together!)
      return graphqlQuery(`{ cat(id: "${ids.catId}") { name, livesWithDogs { id, name } } }`).then(json => {
        const puss = json.data.cat
        t.is(puss.name, 'Puss')
        t.is(puss.livesWithDogs[0].id, ids.dogIds[0])
        t.is(puss.livesWithDogs[0].name, 'Rover')
        t.is(puss.livesWithDogs[1].id, ids.dogIds[1])
        t.is(puss.livesWithDogs[1].name, 'Fido')
        return ids
      })
    })
    .then(ids => {
      // Delete 'Puss' with the deleted ID returned.
      return graphqlQuery(`mutation { deleteCat(id: "${ids.catId}") }`).then(json => {
        t.is(ids.catId, json.data.deleteCat)
      })
    })
    .catch(error => console.error(error))
})
