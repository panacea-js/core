import test from 'ava'
import { graphqlQuery, initTasks } from '../test-common'
initTasks(test)

test('_entityTypes graphql query resolves with Cat and Dog entity types', t => {
  t.plan(2)

  return graphqlQuery('{ _entityTypes { name, data } }')
    .then(json => {
      // console.log(JSON.parse(json.data._entityTypes[0].data))
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

test('Sending a language cookie sends translated results for _fieldTypes graphql query', t => {
  const fetchOptions = {
    headers: {
      cookie: 'PANACEA-LANGUAGE=es; SOME-OTHER-COOKIE=nothing' // Request Spanish results via cookie
    }
  }
  return graphqlQuery('{ _fieldTypes { type, label } }', 'default', fetchOptions)
    .then(json => {
      const fieldTypes = json.data._fieldTypes
      t.is(fieldTypes.find(x => x.type === 'string').label, 'Cadena')
    })
    .catch(error => console.error(error))
})

test('Sending an invalid language cookie sends translated results for _fieldTypes graphql query fallen back to English', t => {
  // Note: this requires that the testing environment defaults to English.
  const fetchOptions = {
    headers: {
      cookie: 'PANACEA-LANGUAGE=invalid; SOME-OTHER-COOKIE=nothing' // Request Spanish results via cookie
    }
  }
  return graphqlQuery('{ _fieldTypes { type, label } }', 'default', fetchOptions)
    .then(json => {
      const fieldTypes = json.data._fieldTypes
      t.is(fieldTypes.find(x => x.type === 'string').label, 'String')
    })
    .catch(error => console.error(error))
})

test('Can create, read and delete an entity with just one field', t => {
  t.plan(3)

  // Create 'Puss'.
  return graphqlQuery(`mutation { createCat(fields: { name: "Puss" }) { id, name } }`)
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
  t.plan(13)

  // Create 'Rover' the dog.
  return graphqlQuery(`
    mutation {
      createDog(fields: {
        name: "Rover"
      }) {
        id,
        name
      }
    }
  `)
    .then(json => {
      const rover = json.data.createDog
      t.is(rover.name, 'Rover')
      return rover.id
    })
    .then(roverId => {
    // Create 'Fido' the dog.
      return graphqlQuery(`
      mutation {
        createDog(fields: {
          name: "Fido"
        }) {
          id,
          name
        }
      }
    `)
        .then(json => {
          const fido = json.data.createDog
          const fidoId = fido.id
          t.is(fido.name, 'Fido')
          return [roverId, fidoId]
        })
    })
    .then(dogIds => {
      const livesWithDogsInput = dogIds.map(d => `"${d}"`).join(', ')

      // Create 'Puss' and reference the dogs. Also given the Cat entity has
      // revisions set, it should be possible to retrieve the CatRevision
      // resolved reference under the _revisions field. More comprehensive
      // revision tests are in hooks/entities/test/revisions.test.js
      return graphqlQuery(`
      mutation {
        createCat(fields: {
          name: "Puss",
          livesWithDogs: [${livesWithDogsInput}]
        }) {
          id,
          name,
          _revisions {
            id,
            name,
            livesWithDogs {
              id,
              name
            }
          },
          livesWithDogs {
            id,
            name
          }
        }
      }
    `)
        .then(json => {
          const puss = json.data.createCat
          t.is(puss.name, 'Puss')
          t.is(puss.livesWithDogs[0].name, 'Rover')
          t.is(puss.livesWithDogs[1].name, 'Fido')
          t.is(puss._revisions[0].livesWithDogs[0].name, 'Rover')
          t.is(puss._revisions[0].livesWithDogs[1].name, 'Fido')
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
