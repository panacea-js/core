import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const { entities, options, hooks, _ } = DI.container

test('Clearing entity types cache should remove entityTypes from function cache', t => {
  t.plan(3)

  t.true(_(entities.entityTypes).isEmpty())

  entities.getData(options.entities)
  t.false(_(entities.entityTypes).isEmpty())

  entities.clearCache()
  t.true(_(entities.entityTypes).isEmpty())
})

test('Stripping entity metadata should remove _filePath and _meta keys', t => {
  t.plan(6)

  const entityTypes = entities.getData(options.entities)

  // Metadata should exist.
  t.true(entityTypes.Dog._filePath !== undefined)
  t.true(entityTypes.Dog._meta !== undefined)

  const strippedMetadata = entities.stripMeta(entityTypes)

  //Metadata on entityTypes should still exist.
  t.true(entityTypes.Dog._filePath !== undefined)
  t.true(entityTypes.Dog._meta !== undefined)

  // Metadata should be removed from strippedMetadata.
  t.true(strippedMetadata.Dog._filePath === undefined)
  t.true(strippedMetadata.Dog._meta === undefined)
})

test('When an entity field has empty definition convertSystemFieldToGraphQL() an error should be thrown', t => {
  hooks.on('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {}
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Field breakingField configuration is empty`)
})

test('When an entity field has no type defined an error should be thrown', t => {
  hooks.on('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      incorrectTypeKey: 'Incorrect Type',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Field type not defined for breakingField`)
})

test('When an entity field has no label defined an error should be thrown', t => {
  hooks.on('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      type: 'String',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Field label not defined for breakingField`)
})

test('When field definitions key is empty an error is thrown', t => {
  hooks.on('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields = {}
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `Fields do not exist on entity type: Cat`)
})

test('When no entity types are defined an error is thrown', t => {
  hooks.on('core.entities.definitions', entityTypes => {
    for (let entityType in entityTypes) {
      delete entityTypes[entityType]
    }
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `No entity types found`)
})

test('When an entity type definition is empty an error is thrown', t => {
  hooks.on('core.entities.definitions', entityTypes => {
    entityTypes.Cat = {}
  })

  const error = t.throws(() => entities.getData(options.entities), TypeError)
  t.is(error.message, `No data is set on entity type: Cat`)
})
