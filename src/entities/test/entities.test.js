import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { entities, options, hooks } = DI.container

test('When an entity field has empty definition convertSystemFieldToGraphQL() an error should be thrown', t => {
  hooks.on('core.entities', entityTypes => {
    entityTypes.Cat.fields.breakingField = {}
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Field breakingField configuration is empty`)
})

test('When an entity field has no type defined an error should be thrown', t => {
  hooks.on('core.entities', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      incorrectTypeKey: 'Incorrect Type',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Field type not defined for breakingField`)
})

test('When an entity field has no label defined an error should be thrown', t => {
  hooks.on('core.entities', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      type: 'String',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Field label not defined for breakingField`)
})

test('When field definitions key is empty an error is thrown', t => {
  hooks.on('core.entities', entityTypes => {
    entityTypes.Cat.fields = {}
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Fields do not exist on entity type: Cat`)
})

test('When no entity types are defined an error is thrown', t => {
  hooks.on('core.entities', entityTypes => {
    for (let entityType in entityTypes) {
      delete entityTypes[entityType]
    }
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `No entity types found`)
})

test('When an entity type definition is empty an error is thrown', t => {
  hooks.on('core.entities', entityTypes => {
    entityTypes.Cat = {}
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `No data is set on entity type: Cat`)
})
