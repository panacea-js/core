
import { IHooks } from '../../../../utils/hooks';
import * as express from 'express'
import { IResolvers } from 'graphql-tools';

const { _, entityTypes, i18n, getClientLanguage } = Panacea.container

/**
 * Defines resolvers for introspection into the defined entity types and field
 * types.
 *
 * @param {*} resolvers The mutable object of resolver definitions.
 */
const entityTypeResolvers = function (resolvers: any) {
  const definitions : EntityTypeDefinitions = entityTypes.getData()

  resolvers.Query['_entityType'] = async (
    parent: {},
    { name } : { name : string },
    { dbModels } : { dbModels: {} }
  ) => {

    // It's possible that a user creates an entity type called 'Revision'.
    // Ignore that case, but otherwise prevent entity types that end with
    // 'Revision' from being queried directly as these are intended only to be
    // nested under their respective entities as the _revisions property.
    // See: hooks/entities/revisions.js
    if (name !== 'Revision' && name.endsWith('Revision')) {
      return null
    }

    const entityType: EntityTypeDefinition = definitions[name]
    // Don't expose the native file path.
    delete entityType._filePath

    return {
      name,
      data: JSON.stringify(entityType)
    }
  }

  resolvers.Query['_entityTypes'] = () => {
    const allEntities: Array<{ name: string, data: string }> = []

    _(definitions).forEach((entityType: EntityTypeDefinition, entityTypeName: string) => {
      // Exclude Revision entity types from being accessed directly.
      if (_(entityTypeName).endsWith('Revision')) {
        return
      }
      const entityTypeData = definitions[entityTypeName]
      // Don't expose the native file path.
      delete entityTypeData._filePath
      allEntities.push({
        name: entityTypeName,
        data: JSON.stringify(entityTypeData)
      })
    })

    return allEntities
  }

  resolvers.Query['_fieldTypes'] = (parent: {}, args: {}, { req } : { req: express.Request }) => {
    const language = getClientLanguage(req)

    type fieldResults = Array<{ type: string, label: string, description: string }>

    return _(entityTypes.fieldTypes).reduce((result: fieldResults, attributes, type) => {
      result.push({
        type,
        label: i18n.t(attributes.label, language),
        description: i18n.t(attributes.description, language)
      })
      return result
    }, [])
  }

  resolvers.Mutation['_createEntityType'] = async (parent: any, { name, data, locationKey } : { name: string, data: string, locationKey: string}) => {
    const saveResult = entityTypes.save(name, JSON.parse(data), locationKey)

    if (!saveResult.success) {
      return new Error(saveResult.errorMessage)
    }

    return {
      name,
      data
    }
  }
}

export default {
  register (hooks: IHooks) {
    hooks.on('core.graphql.resolvers', ({ resolvers } : { resolvers: IResolvers }) => {
      entityTypeResolvers(resolvers)
    })
  }
}
