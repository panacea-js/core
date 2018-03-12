import test from 'ava'
import { bootstrap, initTasks } from '../../test/test-common'
initTasks(test)
bootstrap()

const { graphQLTypeDefinitions, hooks, entities } = Panacea.container

test.serial('Cat entity should resolve to GraphQL type, input and query', t => {
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

test.serial('When an entity field defines an invalid type an error is thrown', async t => {
  // Append via a hook.
  hooks.once('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      type: 'FakeTypeNoExist',
      label: 'A valid label'
    }
  })

  const error = await t.throws(graphQLTypeDefinitions(), TypeError)
  t.is(error.message, `FakeTypeNoExist not found in GraphQL type conversion mapping`)
})

test.serial('When an convertSystemFieldToGraphQL() does not have a field mapping related to an entity field type an error is thrown from entities.js', async t => {
  entities.getData()
  entities.entityTypes.Cat.fields.name.type = 'notValid'
  entities.fieldTypes.notValid = {
    description: 'Setting an known invalid type to test whether convertSystemFieldToGraphQL() throws an error'
  }

  const error = await t.throws(graphQLTypeDefinitions(), TypeError)
  t.is(error.message, `notValid not found in GraphQL type conversion mapping`)
})

test.beforeEach(t => entities.clearCache())
