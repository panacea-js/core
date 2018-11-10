import { IHooks } from '../../../utils/hooks'
import * as Mongoose from 'mongoose'
import { Transaction, TransactionHandler } from '../../../utils/transaction'
import { DbModels } from '../../../mongodb/models';

const { _, entityTypes, mongoose, dbConnection } = Panacea.container

interface NestedFieldDefinition {
  [fieldName: string]: Mongoose.SchemaTypeOpts<any> | Array<Mongoose.SchemaTypeOpts<any>>
}

/**
 * Evaluates and recurses an entity type's field definition resolving to a
 * Mongoose schema field definition.
 */
const compileNestedObjects = function (field: EntityTypeField) {
  let fieldDefinition: Mongoose.SchemaTypeOpts<any> = {}

  // Skip native _id mapping as this is internal to MongoDB.
  if (field.type !== 'id') {
    if (field.type === 'object' && field.fields) {
      // Objects require recursion to resolve each nested field which themselves
      // could be objects.
      let nestedFieldDefinition: NestedFieldDefinition = {}
      const nestedFields = _(field.fields).map((nestedField, fieldName) => {
        const compiledNestedObject = compileNestedObjects(nestedField)
        if (typeof compiledNestedObject !== 'undefined') {
          nestedFieldDefinition[fieldName] = compiledNestedObject
        }
        return nestedFieldDefinition
      }).value()[0]

      // Apply the resolved nested fields to the field definition wrapping in
      // an array if the field allows many values.
      fieldDefinition = {
        type: field.many && !field.fields ? [nestedFields] : nestedFields,
        index: !!field.index
      }
      return fieldDefinition
    }

    // Non nested objects only need their field type resolving and wrapping in
    // an array if the field allows many values.
    fieldDefinition = {
      type: field.many ? [entityTypes.convertFieldTypeToMongo(field.type)] : entityTypes.convertFieldTypeToMongo(field.type),
      index: !!field.index
    }

    return fieldDefinition
  }
}

const addEntityTypeModels = function ({ models }: { models: DbModels }) {
  const db = dbConnection

  const entityTypeDefinitions: EntityTypeDefinitions = entityTypes.getData()

  _(entityTypeDefinitions).forEach((entityTypeData: EntityTypeDefinition, entityTypeName: string) => {
    // Only create a mongoose model if the entity type is for the database.
    if (entityTypeData.storage !== 'db') return

    const definedFields = _(entityTypeData.fields).reduce((acc, field: EntityTypeField, fieldId: string) => {
      // Skip native id mapping as MongoDB automatically assigns IDs.
      if (field.type !== 'id') {
        const compiledNestedObject = compileNestedObjects(field)
        if (typeof compiledNestedObject !== 'undefined') {
          acc[fieldId] = compiledNestedObject
        }
      }
      return acc
    }, ({} as NestedFieldDefinition))

    const schema = new mongoose.Schema(definedFields)

    // When re-registering model ensure it is removed to prevent mongoose errors.
    delete db.models[entityTypeName]
    models[entityTypeName] = db.model(entityTypeName, schema, entityTypeName)
  })
}

/**
 * Checks whether objects or arrays are empty. All other types (except null) are
 * not considered empty.
 */
const isEmpty = function(value: any) {
  if (Array.isArray(value) || typeof value === 'object') {
    return _.isEmpty(value)
  }
  if (value === null) {
    return true
  }
  return false
}

/**
 * Recurses query arguments to flatten arrays which may have empty objects.
 *
 * This prevents blank objects from being incorrectly saved to the database.
 */
const flattenEmptyFields = function (fields: any) {
  _(fields).forEach((field, fieldName) => {
    if (Array.isArray(field)) {
      fields[fieldName] = isEmpty(field.filter((x: any) => !isEmpty(x))) ? null : field
    }
    if (!Array.isArray(field) && typeof field === 'object') {
      fields[fieldName] = flattenEmptyFields(fields[fieldName])
    }
  })
}

const entityCreateHandler = {
  operation: async function (txn: Transaction) {
    const { entityData, dbModels, args } : { entityData: EntityTypeDefinition, dbModels: DbModels, args: any } = txn.context
    const EntityModel = dbModels[entityData._meta.pascal]
    flattenEmptyFields(args.fields)
    const entity = await new EntityModel(args.fields).save()
    txn.context.createdEntity = entity
  },
  rollback: async function (txn: Transaction) {
    const { createdEntity }: { createdEntity: Mongoose.Document } = txn.context
    await createdEntity.remove()
  }
}

export default {
  register (hooks: IHooks) {
    hooks.on('core.entity.createHandlers', ({ transactionHandlers }: { transactionHandlers: Array<TransactionHandler> }) => {
      transactionHandlers.push(entityCreateHandler)
    })

    hooks.on('core.mongo.models', ({ models }: { models: DbModels }) => {
      addEntityTypeModels({ models })
    })
  }
}
