// @flow
const { _, mongoose, dbConnection, entities, hooks } = Panacea.container

/**
 * Converts system field definitions to MongoDB equivalents.
 *
 * @param type String
 * @returns object
 */
const convertPanaceaFieldToMongo = function (type: string) : string {
  if (typeof type !== 'string' || type === '') {
    throw TypeError('No type specified in mongo field types conversion mapping')
  }

  const map = new Map([
    ['string', 'String'],
    ['password', 'String'],
    ['text', 'String'],
    ['float', 'Number'],
    ['int', 'Number'],
    ['date', 'Date'],
    ['boolean', 'Number'],
    ['reference', 'String'],
    // objects are for nested data.
    ['object', 'Object']
  ])

  hooks.invoke('core.mongo.fieldsMap', { map })

  if (!map.has(type)) {
    throw new TypeError(type + ' not found in MongoDB type conversion mapping')
  }

  return map.get(type) || ''
}

/**
 * Evaluates and recurses an entity type's field definition resolving to a
 * Mongoose schema field definition.
 *
 * @param {*} field
 */
const compileNestedObjects = function (field: EntityTypeField) {
  let fieldDefinition = {}

  // Skip native _id mapping as this is internal to MongoDB.
  if (field.type !== 'id') {
    if (field.type === 'object' && field.fields) {
      // Objects require recursion to resolve each nested field which themselves
      // could be objects.
      let nestedFieldDefinition = {}
      const nestedFields = _(field.fields).map(nestedField => {
        nestedFieldDefinition[nestedField._meta.camel] = compileNestedObjects(nestedField)
        return nestedFieldDefinition
      }).value()[0]

      // Apply the resolved nested fields to the field definition wrapping in
      // an array if the field allows many values.
      fieldDefinition = {
        type: field.many && !field.fields ? [nestedFields] : nestedFields,
        index: !!field.index
      }
    } else {
      // Non nested objects only need their field type resolving and wrapping in
      // an array if the field allows many values.
      fieldDefinition = {
        type: field.many ? [convertPanaceaFieldToMongo(field.type)] : convertPanaceaFieldToMongo(field.type),
        index: !!field.index
      }
    }

    return fieldDefinition
  }
}

/**
 * Loads entity types from yml files to define MongoDB models.
 * @returns {object}
 */
export const dbModels = function () : {[string] : Mongoose$Schema<Mongoose$Document>} {
  const db : Mongoose$Connection = dbConnection

  const models = {}

  const entityTypes : EntityTypes = entities.getData()

  _(entityTypes).forEach((entityTypeData: EntityType, entityTypeName: string) => {
    // Only create a mongoose model if the entity type is for the database.
    if (entityTypeData.storage !== 'db') return

    const definedFields : EntityTypeFields = {}

    if (entityTypeData.fields) {
      _(entityTypeData.fields).forEach((field) : EntityTypeField | void => {
        // Skip native _id mapping as this is internal to MongoDB.
        if (field.type !== 'id') {
          definedFields[field._meta.camel] = compileNestedObjects(field)
        }
      })
    }

    const schema = mongoose.Schema(definedFields)

    // When re-registering model ensure it is removed to prevent mongoose errors.
    delete db.models[entityTypeName]
    models[entityTypeName] = db.model(entityTypeName, schema)
  })

  return models
}
