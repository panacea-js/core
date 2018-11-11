import test from 'ava'
import { graphqlQuery, initTasks } from '../testCommon'
initTasks(test)

test.serial('Can create, read and delete an entity with just one field', async t => {
  t.plan(3)

  // Create 'Puss'.
  await graphqlQuery(`mutation { createCat(fields: { name: "Puss" }) { id, name } }`)
    .then((json: any) => {
      const entity = json.data.createCat
      t.is(entity.name, 'Puss')
      return entity.id
    })
    .then(id => {
      // Read 'Puss' from its generated ID.
      return graphqlQuery(`{ cat(id: "${id}") { name } }`).then((json: any) => {
        const entity = json.data.cat
        t.is(entity.name, 'Puss')
        return id
      })
    })
    .then(id => {
      // Delete 'Puss' with the deleted ID returned.
      return graphqlQuery(`mutation { deleteCat(id: "${id}") }`).then((json: any) => {
        t.is(id, json.data.deleteCat)
      })
    })
    .catch(error => console.error(error))
})

test.serial('Can create, read and delete an entity with referenced entities', async t => {
  t.plan(13)

  // Create 'Rover' the dog.
  await graphqlQuery(`
    mutation {
      createDog(fields: {
        name: "Rover"
      }) {
        id,
        name
      }
    }
  `)
    .then((json: any) => {
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
        .then((json: any) => {
          const fido = json.data.createDog
          const fidoId = fido.id
          t.is(fido.name, 'Fido')
          return [roverId, fidoId]
        })
    })
    .then(dogIds => {
      const livesWithDogsInput = `[
        {
          existing: {
            entityType: "Dog",
            entityId: "${dogIds[0]}"
          }
        },
        {
          existing: {
            entityType: "Dog",
            entityId: "${dogIds[1]}"
          }
        }
      ]`

      // Create 'Puss' and reference the dogs. Also given the Cat entity has
      // revisions set, it should be possible to retrieve the CatRevision
      // resolved reference under the _revisions field. More comprehensive
      // revision tests are in hooks/entities/test/revisions.test.js
      return graphqlQuery(`
        mutation {
          createCat(fields: {
            name: "Puss",
            livesWithDogs: ${livesWithDogsInput}
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
      .then((json: any) => {
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
      }).catch(error => console.error(error))
    })
    .then((ids: any) => {
    // Read 'Puss' from its generated ID and assert they're friends (or at least live together!)
      return graphqlQuery(`{ cat(id: "${ids.catId}") { name, livesWithDogs { id, name } } }`).then((json: any) => {
        const puss = json.data.cat
        t.is(puss.name, 'Puss')
        t.is(puss.livesWithDogs[0].id, ids.dogIds[0])
        t.is(puss.livesWithDogs[0].name, 'Rover')
        t.is(puss.livesWithDogs[1].id, ids.dogIds[1])
        t.is(puss.livesWithDogs[1].name, 'Fido')
        return ids
      })
    })
    .then((ids: any) => {
    // Delete 'Puss' with the deleted ID returned.
      return graphqlQuery(`mutation { deleteCat(id: "${ids.catId}") }`).then((json: any) => {
        t.is(ids.catId, json.data.deleteCat)
      })
    })
    .catch(error => console.error(error))
})

test.serial('Can create and read two entities that reference each other', t => {
  const createLizard = (name: string) => graphqlQuery(`
    mutation {
      createLizard(fields: {
        name: "${name}"
      }) {
        id,
        name
      }
    }
  `)

  const createLizardWithBestBuddy = (name: string, buddyType: string, buddyId: string) => graphqlQuery(`
    mutation {
      createLizard(fields: {
        name: "${name}",
        bestBuddy: {
          existing: {
            entityType: "${buddyType}",
            entityId: "${buddyId}"
          }
        }
      }) {
        id,
        name,
        bestBuddy {
          ... on Lizard {
            id,
            name
          }
        }
      }
    }
  `)

  return createLizard('Lizzy').then((json: any) => {
    const lizzyId = json.data.createLizard.id
    return createLizardWithBestBuddy('Bizzy', 'Lizard', lizzyId).then((json: any) => {
      const bestBuddyBizzy = json.data.createLizard.bestBuddy.id
      t.is(bestBuddyBizzy, lizzyId)
    })
  })
})

test.serial('Can create and read three entities in a single query', t => {
  t.plan(3)
  const createLizard = (name: string) => graphqlQuery(`
    mutation {
      createLizard(fields: {
        name: "${name}"
      }) {
        id
      }
    }
  `)

  const allLizards = () => graphqlQuery(`
    {
      lizards {
        id,
        name
      }
    }
  `)

  return createLizard('Scaley')
    .then(() => createLizard('Lennie'))
    .then(() => createLizard('Izzy'))
    .then(() => allLizards())
    .then((json: any) => {
      const lizardNames = json.data.lizards.map((l: any) => l.name)
      t.true(lizardNames.includes('Scaley'))
      t.true(lizardNames.includes('Lennie'))
      t.true(lizardNames.includes('Izzy'))
    })
})
