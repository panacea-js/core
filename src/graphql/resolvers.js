// @flow
import { IResolvers } from 'graphql-tools/dist/Interfaces' // eslint-disable-line no-unused-vars
const { _, entities, hooks, log, i18n, accepts } = Panacea.container

/**
 * Get the client's preferred language based on the request's
 * PANACEA-CMS-LANGUAGE cookie value. Falls back to the client's Accept-Language
 * header using the accepts module.
 *
 * @param {Request} req The request object
 *
 * @returns {String|Boolean} If an available language match is found then a
 *   string is returned, otherwise false
 */
const getClientLanguage = function (req: express$Request) {
  const availableLanguages = Object.keys(i18n.messages)

  let cookieLanguage = ''

  if (typeof req.headers.cookie !== 'undefined') {
    req.headers.cookie.split('; ').map(cookie => {
      const [ key, value ] = cookie.split('=')
      if (key === 'PANACEA-CMS-LANGUAGE') {
        cookieLanguage = value
      }
    })

    if (cookieLanguage.length > 0 && i18n.messages.hasOwnProperty(cookieLanguage)) {
      return cookieLanguage
    }
  }

  // Fallback to client's Accept-Language header.
  return accepts(req).language(availableLanguages)
}

/**
 * Generic entity model query.
 *
 * @param {Model} model The Mongoose model for a collection.
 * @param {*} parent The parent resolver.
 * @param {object} args The GraphQL query arguments.
 */
const modelQuery = function (
  model: Mongoose$Collection,
  parent: {},
  args: { params: QueryParams }
) : Mongoose$Query<any, any> {
  const params = args.params || {
    limit: 100,
    sortBy: null,
    sortDirection: null
  }

  const sortOptions = {}

  if (params.sortBy) {
    sortOptions[params.sortBy] = params.sortDirection === 'DESC' ? -1 : 1
  }

  return model.find().limit(params.limit).sort(sortOptions)
}

/**
 * Resolves nested objects as separates types using an underscore to delineate
 * the nesting levels.
 *
 * These nested types are required as GraphQL does not natively allow types
 * beyond an array of scalars or defined types.
 *
 * @param {object} types A mutable object of the base types. This is appended to
 *   as this function recurses.
 * @param {string} currentType The current type being used at the current level
 *   of recursion.
 * @param {object} fields The list of fields defined at the current level of
 *   recursion.
 */
const resolveNestedFields = function (
  types: {},
  currentType: string,
  fields: EntityTypeFields
) : void {
  _(fields).forEach((field: EntityTypeField, fieldName) => {
    const fieldCamel = field._meta.camel

    if (field.type === 'object' && field.fields) {
      resolveNestedFields(types, `${currentType}_${fieldCamel}`, field.fields)
    }

    if (field.type === 'reference') {
      types[currentType] = {}

      types[currentType][fieldCamel] = function (sourceDocument, args, { dbModels }) {
        if (field.many) {
          let targetEntities = []
          sourceDocument[fieldCamel].map(targetId => {
            targetEntities.push(dbModels[field.references].findById(targetId))
          })
          return targetEntities
        } else {
          return dbModels[field.references].findById(sourceDocument[fieldCamel])
        }
      }
    }
  })
}

/**
 * Defines resolvers for introspection into the defined entity types and field
 * types.
 *
 * @param {*} entityTypes The entity type definitions.
 * @param {*} queries A mutable object of query resolver definitions.
 * @param {*} mutations A mutable object of mutation resolver definitions.
 */
const panaceaEntityTypeResolvers = function (entityTypes, queries, mutations) {
  queries['ENTITY_TYPE'] = async (
    parent: {},
    { name } : { name : String },
    { dbModels } : { dbModels: {} }
  ) => {
    if (entityTypes[name]) {
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

  queries['ENTITY_TYPES'] = () => {
    const allEntities = []

    _(entityTypes).forEach((entityType, entityTypeName) => {
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

  queries['fieldTypes'] = (parent: {}, args: {}, { req } : { req: express$Request }) => {
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

  mutations['createENTITY_TYPE'] = async (parent: any, { name, data, locationKey } : { name: string, data: string, locationKey: string}) => {
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

export const graphQLResolvers = function () : IResolvers {
  const entityTypes = entities.getData()

  const queries = {}
  const mutations = {}

  const types = {}

  _(entityTypes).forEach(entityData => {
    types[entityData._meta.pascal] = {}

    // Get single entity.
    queries[entityData._meta.camel] = async (parent, args, { dbModels }) => {
      return dbModels[entityData._meta.pascal].findById(args.id)
    }

    // Get many entities.
    queries[entityData._meta.pluralCamel] = async (parent, args, { dbModels }) => modelQuery(dbModels[entityData._meta.pascal], parent, args)

    // Create entity.
    mutations[`create${entityData._meta.pascal}`] = async (parent, args, { dbModels }) => {
      const EntityModel = dbModels[entityData._meta.pascal]
      const entity = await new EntityModel(args.params).save()
      entity._id = entity._id.toString()
      return entity
    }

    // Delete entity.
    mutations[`delete${entityData._meta.pascal}`] = (parent, args, { dbModels }) => {
      return dbModels[entityData._meta.pascal].findById(args.id).exec(function (err, entity) {
        if (err) {
          throw new Error(err)
        }

        if (entity === null) {
          return null
        }
        return entity.remove().then(() => {
          return true
        }).catch(function (error) {
          log.error(`Could not delete ${entityData._meta.pascal} with ID ${args.id}. Error message: ${error}`)
          return false
        })
      })
    }

    // @todo
    // Update entity

    // Resolve top-level and nested object references.
    resolveNestedFields(types, entityData._meta.pascal, entityData.fields)
  })

  panaceaEntityTypeResolvers(entityTypes, queries, mutations)

  const resolvers = {
    Query: queries,
    Mutation: mutations
  }

  for (const type in types) {
    resolvers[type] = types[type]
  }

  hooks.invoke('core.graphql.resolvers', resolvers)

  return resolvers
}
