const { _, entityTypes, mongoose, dbConnection } = Panacea.container
import * as events from 'events'
import * as Mongoose from 'mongoose'
import { Transaction, transactionHandler } from '../../../utils/transaction'

interface nestedFieldDefinition {
  [fieldName: string] : Mongoose.SchemaTypeOpts<any> | Array<Mongoose.SchemaTypeOpts<any>>
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
      let nestedFieldDefinition: nestedFieldDefinition = {}
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

interface dbModels {
  [name: string]: Mongoose.Model<Mongoose.Document>
}

const addEntityTypeModels = function ({ models } : { models: dbModels }) {
  const db = dbConnection

  const entityTypeDefinitions : EntityTypes = entityTypes.getData()

  _(entityTypeDefinitions).forEach((entityTypeData: EntityType, entityTypeName: string) => {
    // Only create a mongoose model if the entity type is for the database.
    if (entityTypeData.storage !== 'db') return

    const definedFields = _(entityTypeData.fields).reduce((acc, field : EntityTypeField, fieldId : string) => {
      // Skip native id mapping as MongoDB automatically assigns IDs.
      if (field.type !== 'id') {
        const compiledNestedObject = compileNestedObjects(field)
        if (typeof compiledNestedObject !== 'undefined') {
          acc[fieldId] = compiledNestedObject
        }
      }
      return acc
    }, ({} as nestedFieldDefinition))

    const schema = new mongoose.Schema(definedFields)

    // When re-registering model ensure it is removed to prevent mongoose errors.
    delete db.models[entityTypeName]
    models[entityTypeName] = db.model(entityTypeName, schema)
  })
}

const entityCreateHandler = {
  operation: async function (txn: Transaction) {
    const { entityData, dbModels, args } = txn.context
    const EntityModel = dbModels[entityData._meta.pascal]
    const entity = await new EntityModel(args.fields).save()
    txn.context.createdEntity = entity
  }
}

export default {
  register (hooks: events.EventEmitter) {
    hooks.on('core.entity.createHandlers', ({ transactionHandlers } : { transactionHandlers: Array<transactionHandler> }) => {
      transactionHandlers.push(entityCreateHandler)
    })

    hooks.on('core.mongo.models', ({ models } : { models: dbModels }) => {
      addEntityTypeModels({ models })
    })
  }
}
