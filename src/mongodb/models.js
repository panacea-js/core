const { _, mongoose, dbConnection, entities } = Panacea.container

/**
 * Converts system field definitions to MongoDB equivalents.
 *
 * @param type String
 * @returns object
 */
const convertSystemFieldToMongo = function (type) {
  const map = {
    string: String,
    password: String,
    text: String,
    float: Number,
    int: Number,
    boolean: Number,
    reference: String,
    // objects are for nested data.
    object: Object
  }

  if (!map[type]) {
    throw new TypeError(type + ' not found in MongoDB type conversion mapping')
  }

  return map[type]
}

const complileNestedObjects = function (field) {
  let fieldDefinition = {}

  // Skip native _id mapping as this is internal to MongoDB.
  if (field.type !== 'id') {
    if (field.type === 'object') {
      _(field.fields).forEach(nestedField => {
        fieldDefinition[nestedField._meta.camel] = complileNestedObjects(nestedField)
      })
    } else {
      fieldDefinition = {
        type: field.many ? [convertSystemFieldToMongo(field.type)] : convertSystemFieldToMongo(field.type),
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
export const dbModels = function () {
  const db = dbConnection

  const models = {}

  const entityTypes = entities.getData()

  _(entityTypes).forEach((entityTypeData, entityTypeName) => {
    // Only create a mongoose model if the entity type is for the database.
    if (entityTypeData.storage !== 'db') return

    const definedFields = {}

    if (entityTypeData.hasOwnProperty('fields')) {
      _(entityTypeData.fields).forEach(field => {
        // Skip native _id mapping as this is internal to MongoDB.
        if (field.type !== 'id') {
          definedFields[field._meta.camel] = complileNestedObjects(field)
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
