// @flow
import test from 'ava'
import { bootstrap, initTasks, entityHasErrorMessage, getSandboxDir } from '../../test/test-common'
initTasks(test)
bootstrap()

const sandboxDir = getSandboxDir()

const { entityTypes, hooks, _, fs } = Panacea.container

test('Clearing entity types cache should remove entityTypes from function cache and getData() should successful repopulate the cache', t => {
  t.plan(3)

  entityTypes.getData()
  t.false(_(entityTypes.definitions).isEmpty())

  entityTypes.clearCache()
  t.true(_(entityTypes.definitions).isEmpty())

  entityTypes.getData()
  t.false(_(entityTypes.definitions).isEmpty())
})

test('Stripping entity metadata should remove _filePath and _meta keys', t => {
  t.plan(6)

  const definitions = entityTypes.getData()

  // Metadata should exist.
  t.true(definitions.Dog._filePath !== undefined)
  t.true(definitions.Dog._meta !== undefined)

  const strippedMetadata = entityTypes.stripMeta(definitions)

  // Metadata on entityTypes should still exist.
  t.true(definitions.Dog._filePath !== undefined)
  t.true(definitions.Dog._meta !== undefined)

  // Metadata should be removed from strippedMetadata.
  t.true(strippedMetadata.Dog._filePath === undefined)
  t.true(strippedMetadata.Dog._meta === undefined)
})

test('When an entity has no label defined an error should be thrown', t => {
  hooks.once('core.entityTypes.definitions', ({ definitions }) => {
    delete definitions.Cat.plural
  })

  t.true(entityHasErrorMessage(entityTypes.getData().Cat, `A 'plural' key must be set on entity type: Cat`))
  entityTypes.clearCache()
})

test('When an entity has no storage defined an error should be thrown', t => {
  hooks.once('core.entityTypes.definitions', ({ definitions }) => {
    delete definitions.Cat.storage
  })

  t.true(entityHasErrorMessage(entityTypes.getData().Cat, `A 'storage' key must be set on entity type: Cat`))
  entityTypes.clearCache()
})

test('When an entity field has empty definition an error should be thrown', t => {
  hooks.once('core.entityTypes.definitions', ({ definitions }) => {
    definitions.Cat.fields.breakingField = {}
  })

  t.true(entityHasErrorMessage(entityTypes.getData().Cat, 'Field breakingField configuration is empty'))
})

test('When an entity field has no type defined an error should be thrown', t => {
  hooks.once('core.entityTypes.definitions', ({ definitions }) => {
    definitions.Cat.fields.breakingField = {
      incorrectTypeKey: 'Incorrect Type',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  t.true(entityHasErrorMessage(entityTypes.getData().Cat, 'Field type not defined for breakingField'))
})

test('When an entity field has no label defined an error should be thrown', t => {
  hooks.once('core.entityTypes.definitions', ({ definitions }) => {
    definitions.Cat.fields.breakingField = {
      type: 'string',
      incorrectLabelKey: 'Incorrect Label'
    }
  })

  t.true(entityHasErrorMessage(entityTypes.getData().Cat, 'Field label not defined for breakingField'))
})

test('When field definitions key is empty an error is thrown', t => {
  hooks.once('core.entityTypes.definitions', ({ definitions }) => {
    definitions.Cat.fields = {}
  })

  t.true(entityHasErrorMessage(entityTypes.getData().Cat, 'Fields do not exist on entity type: Cat'))
})

test('When validating and EntityType without _errors property, it is added by the call to entityTypes.validate', t => {
  const entityTypeData = {}
  entityTypes.validate(entityTypeData, 'testEmptyArray')
  t.true(entityTypeData.hasOwnProperty('_errors'))
})

test('Saving an EntityType in the correct required format writes a yml file to disk', t => {
  t.plan(2)

  const entityTypeData: EntityTypePublic = {
    storage: 'db',
    fields: {
      id: {
        type: 'id',
        label: 'ID'
      }
    },
    plural: 'Mice',
    description: 'A successful created entity type'
  }

  const saveResult = entityTypes.save('Mouse', entityTypeData, 'sandbox')

  t.true(saveResult.success)
  t.true(fs.existsSync(`${sandboxDir}/Mouse.yml`))
})
