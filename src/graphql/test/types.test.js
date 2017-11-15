import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { graphQLTypeDefinitions, hooks, _ } = DI.container

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

test('When an entity field has empty definition convertSystemFieldToGraphQL() an error should be thrown', async t => {
  hooks.on('core.graphql.definitions.entityTypes', types => {
    types.Cat.fields.breakingField = {}
  })

  const error = await t.throws(graphQLTypeDefinitions())

  t.is(error.message, `Field breakingField configuration is empty`)
})

test('When an entity field has no type defined an error should be thrown', async t => {

  hooks.on('core.graphql.definitions.entityTypes', entityTypes => {

    entityTypes.Cat.fields.breakingField = {
      incorrectTypeKey: 'Incorrect Type',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  const errorNoType = await t.throws(graphQLTypeDefinitions())

  t.is(errorNoType.message, `Field type not defined for breakingField`)
})

test('When an entity field has no label defined an error should be thrown', async t => {

  hooks.on('core.graphql.definitions.entityTypes', entityTypes => {

    entityTypes.Cat.fields.breakingField = {
      type: 'String',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  const errorNoLabel = await t.throws(graphQLTypeDefinitions())

  t.is(errorNoLabel.message, `Field label not defined for breakingField`)
})

test('When an entity field defines an invalid type an error is thrown', async t => {

  hooks.on('core.graphql.definitions.entityTypes', entityTypes => {

    entityTypes.Cat.fields.breakingField = {
      type: 'FakeTypeNoExist',
      label: 'A valid label'
    }
  })

  const errorInvalidType = await t.throws(graphQLTypeDefinitions())

  t.is(errorInvalidType.message, `FakeTypeNoExist not found in GraphQL type conversion mapping`)
})

test('When field definitions key is empty an error is thrown', async t => {

  hooks.on('core.graphql.definitions.entityTypes', entityTypes => {
    entityTypes.Cat.fields = {}
  })

  const errorInvalidType = await t.throws(graphQLTypeDefinitions())

  t.is(errorInvalidType.message, `Fields do not exist on entity type: Cat`)
})

test('When no entity type definition is empty an error is thrown', async t => {

  hooks.on('core.graphql.definitions.entityTypes', entityTypes => {
    entityTypes.Cat = {}
  })

  const errorInvalidType = await t.throws(graphQLTypeDefinitions())

  t.is(errorInvalidType.message, `No data is set on entity type: Cat`)
})

test('When no entity types are defined an error is thrown', async t => {

  hooks.on('core.graphql.definitions.entityTypes', entityTypes => {
    for (let entityType in entityTypes) {
      delete entityTypes[entityType]
    }
  })

  const errorInvalidType = await t.throws(graphQLTypeDefinitions())

  t.is(errorInvalidType.message, `No entity types found`)
})