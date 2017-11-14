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

/**
 * Loads entity types from yml files to define MongoDB models.
 * @returns {object}
 */
export const dbModels = function () {
  const { loadYmlFiles, _, dbConnection, options } = DI.container

  const db = dbConnection

  const models = {}

  const entityTypes = {}

  for (let entitiesPath of options.entities) {
    let fileEntities = loadYmlFiles(entitiesPath)
    _.extend(entityTypes, fileEntities)
  }

  _(entityTypes).forEach((entityTypeData, entityTypeName) => {
    // Only create a mongoose model if the entity type is for the database.
    if (entityTypeData.storage !== 'db') return

    const definedFields = {}

    if (entityTypeData.hasOwnProperty('fields')) {
      _(entityTypeData.fields).forEach((field, fieldName) => {
        // Skip native _id mapping as this is internal to MongoDB.
        if (fieldName !== '_id') {
          let fieldType = convertSystemFieldToMongo(field.type)
          definedFields[fieldName] = field.many ? [fieldType] : fieldType
        }
      })
    }

    models[entityTypeName] = db.model(entityTypeName, definedFields)
  })

  return models
}
