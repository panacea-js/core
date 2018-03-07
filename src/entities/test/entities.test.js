// @flow
import test from 'ava'
import { initTasks, entityHasErrorMessage, getSandboxDir } from '../../test/test-common'
initTasks(test)
const sandboxDir = getSandboxDir()

const { entities, hooks, _, fs } = DI.container

test('Clearing entity types cache should remove entityTypes from function cache', t => {
  t.plan(3)

  t.true(_(entities.entityTypes).isEmpty())

  entities.getData()
  t.false(_(entities.entityTypes).isEmpty())

  entities.clearCache()
  t.true(_(entities.entityTypes).isEmpty())
})

test('Stripping entity metadata should remove _filePath and _meta keys', t => {
  t.plan(6)

  const entityTypes = entities.getData()

  // Metadata should exist.
  t.true(entityTypes.Dog._filePath !== undefined)
  t.true(entityTypes.Dog._meta !== undefined)

  const strippedMetadata = entities.stripMeta(entityTypes)

  // Metadata on entityTypes should still exist.
  t.true(entityTypes.Dog._filePath !== undefined)
  t.true(entityTypes.Dog._meta !== undefined)

  // Metadata should be removed from strippedMetadata.
  t.true(strippedMetadata.Dog._filePath === undefined)
  t.true(strippedMetadata.Dog._meta === undefined)
})

test('When an entity has no label defined an error should be thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    delete entityTypes.Cat.plural
  })

  t.true(entityHasErrorMessage(entities.getData().Cat, `A 'plural' key must be set on entity type: Cat`))
  entities.clearCache()
})

test('When an entity has no storage defined an error should be thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    delete entityTypes.Cat.storage
  })

  t.true(entityHasErrorMessage(entities.getData().Cat, `A 'storage' key must be set on entity type: Cat`))
  entities.clearCache()
})

test('When an entity field has empty definition an error should be thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {}
  })

  t.true(entityHasErrorMessage(entities.getData().Cat, 'Field breakingField configuration is empty'))
})

test('When an entity field has no type defined an error should be thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      incorrectTypeKey: 'Incorrect Type',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  t.true(entityHasErrorMessage(entities.getData().Cat, 'Field type not defined for breakingField'))
})

test('When an entity field has no label defined an error should be thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields.breakingField = {
      type: 'string',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  t.true(entityHasErrorMessage(entities.getData().Cat, 'Field label not defined for breakingField'))
})

test('When field definitions key is empty an error is thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    entityTypes.Cat.fields = {}
  })

  t.true(entityHasErrorMessage(entities.getData().Cat, 'Fields do not exist on entity type: Cat'))
})

test('When no entity types are defined an error is thrown', t => {
  hooks.once('core.entities.definitions', entityTypes => {
    for (let entityType in entityTypes) {
      delete entityTypes[entityType]
    }
  })

  t.true(_(entities.getData()).isEmpty())
})

test('When validating and EntityType without _errors property, it is added by the call to entities.validateEntityType', t => {
  const entityTypeData = {}
  entities.validateEntityType(entityTypeData, 'testEmptyArray')
  t.true(entityTypeData.hasOwnProperty('_errors'))
})

test('Saving an EntityType in the correct required format writes a yml file to disk', t => {
  t.plan(2)

  const entityTypeData: EntityTypeNoMeta = {
    storage: 'db',
    fields: {
      id: {
        type: 'id',
        label: 'ID'
      }
    },
    plural: 'Happies',
    description: 'A successful created entity type'
  }

  const saveResult = entities.saveEntityType('Happy', entityTypeData, 'sandbox')

  t.true(saveResult.success)
  t.true(fs.existsSync(`${sandboxDir}/Happy.yml`))
})
