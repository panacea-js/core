// @flow

const { _, entities, i18n } = Panacea.container

/**
 * Defines resolvers for introspection into the defined entity types and field
 * types.
 *
 * @param {*} resolvers The mutable object of resolver definitions.
 * @param {*} entityTypes The entity type definitions.
 * @param {*} modelQuery Helper function to query entities on mongo model.
 * @param {*} getClientLanguage Helper function to determine to requested client language.
 */
const entityTypeResolvers = function (resolvers, entityTypes, modelQuery, getClientLanguage) {
  resolvers.Query['_entityType'] = async (
    parent: {},
    { name } : { name : String },
    { dbModels } : { dbModels: {} }
  ) => {
    if (entityTypes[name] && !_(entityTypes[name]).endsWith('Revision')) {
      const entityType = entityTypes[name]
      // Don't expose the native file path.
      delete entityType._filePath
      return {
        name,
        data: JSON.stringify(entityType)
      }
    } else {
      return null
    }
  }

  resolvers.Query['_entityTypes'] = () => {
    const allEntities = []

    _(entityTypes).forEach((entityType, entityTypeName) => {
      // Exclude Revision entity types from being accessed directly.
      if (_(entityTypeName).endsWith('Revision')) {
        return
      }
      const entityTypeData = entityTypes[entityTypeName]
      // Don't expose the native file path.
      delete entityTypeData._filePath
      allEntities.push({
        name: entityTypeName,
        data: JSON.stringify(entityTypeData)
      })
    })

    return allEntities
  }

  resolvers.Query['_fieldTypes'] = (parent: {}, args: {}, { req } : { req: express$Request }) => {
    const language = getClientLanguage(req)

    return _(entities.fieldTypes).reduce((result, attributes, type) => {
      result.push({
        type,
        label: i18n.t(attributes.label, language),
        description: i18n.t(attributes.description, language)
      })
      return result
    }, [])
  }

  resolvers.Mutation['_createEntityType'] = async (parent: any, { name, data, locationKey } : { name: string, data: string, locationKey: string}) => {
    let response

    const saveResult = entities.saveEntityType(name, JSON.parse(data), locationKey)

    if (saveResult.success) {
      response = {
        name,
        data
      }
    } else {
      response = new Error(saveResult.errorMessage)
    }

    return response
  }
}

export default {
  register (hooks: events$EventEmitter) {
    hooks.on('core.graphql.resolvers', ({ resolvers, entityTypes, modelQuery, getClientLanguage }) => {
      entityTypeResolvers(resolvers, entityTypes, modelQuery, getClientLanguage)
    })
  }
}
