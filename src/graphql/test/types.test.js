import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { graphQLTypeDefinitions, hooks } = DI.container

test('Cat entity should resolve to GraphQL type, input and query', t => {
  t.plan(4)

  return graphQLTypeDefinitions().then(data => {
    const catTypeFound = data.indexOf('type Cat {') !== -1
    const catInputTypeFound = data.indexOf('input CatInput {') !== -1
    const catsQueryFound = data.indexOf('cats(params: QueryParams): [Cat!]') !== -1
    const catStories = data.indexOf('type Cat_stories') !== -1

    t.true(catTypeFound)
    t.true(catInputTypeFound)
    t.true(catsQueryFound)
    t.true(catStories)
  })
})

test('When an entity field defines an invalid type an error is thrown', async t => {
  hooks.on('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      type: 'FakeTypeNoExist',
      label: 'A valid label'
    }
  })

  const error = await t.throws(graphQLTypeDefinitions(), TypeError)
  t.is(error.message, `FakeTypeNoExist not found in GraphQL type conversion mapping`)
})
