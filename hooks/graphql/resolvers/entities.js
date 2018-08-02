// @flow
const { _, log, hooks, Transaction } = Panacea.container

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
  _(fields).forEach((field: EntityTypeField, fieldName: string) => {
    if (field.type === 'object' && field.fields) {
      resolveNestedFields(types, `${currentType}_${fieldName}`, field.fields)
    }

    if (field.type === 'reference') {
      types[currentType] = types[currentType] || {}

      types[currentType][fieldName] = function (sourceDocument, args, { dbModels }) {
        if (field.many) {
          let targetEntities = []
          sourceDocument[fieldName].map(targetId => {
            targetEntities.push(dbModels[field.references].findById(targetId))
          })
          return targetEntities
        } else {
          return dbModels[field.references].findById(sourceDocument[fieldName])
        }
      }
    }
  })
}

const entityResolvers = function (resolvers, entityTypes, modelQuery, getClientLanguage) {
  const types = {}

  _(entityTypes).forEach(entityData => {
    // If exclude flag is set on entity, don't set any direct query or mutation
    // resolvers, but still resolve for any references made by other entity types.
    if (entityData._excludeGraphQL) {
      // Resolve top-level and nested objects and references.
      resolveNestedFields(types, entityData._meta.pascal, entityData.fields)
      return
    }

    types[entityData._meta.pascal] = {}

    // Exclude the ID fields as user defined field, therefore > 1
    const hasFields = Object.keys(entityData.fields).length > 1

    // Get single entity.
    resolvers.Query[entityData._meta.camel] = async (parent, args, { dbModels }) => {
      return dbModels[entityData._meta.pascal].findById(args.id)
    }

    // Get many entities.
    resolvers.Query[entityData._meta.pluralCamel] = async (parent, args, { dbModels }) => modelQuery(dbModels[entityData._meta.pascal], parent, args)

    // Only allow mutations of entities that have fields.
    if (hasFields) {
      // Create entity.
      resolvers.Mutation[`create${entityData._meta.pascal}`] = async (parent, args, { dbModels }) => {
        const transactionContext = {
          parent,
          args,
          dbModels,
          entityType: entityData._meta.pascal,
          entityData
        }

        const transactionHandlers = []
        hooks.invoke('core.entities.entityCreateHandlers', transactionHandlers)

        return new Transaction(transactionHandlers, transactionContext).execute()
          .then(txn => {
            if (txn.status === 'complete') {
              const createdEntity = txn.context.createdEntity
              createdEntity._id = createdEntity._id.toString()
              return createdEntity
            }
            return txn._error
          })
          .catch(error => log.error(error))
      }

      // Delete entity.
      resolvers.Mutation[`delete${entityData._meta.pascal}`] = (parent, args, { dbModels }) => {
        return new Promise((resolve, reject) => {
          dbModels[entityData._meta.pascal].findById(args.id).exec((err, entity) => {
            if (err) {
              return err
            }
            if (entity === null) {
              return new Error(`Cannot find ${entityData._meta.camel} with id: ${args.id}`)
            }

            entity.remove().then(() => {
              resolve(args.id)
            }).catch(function (error) {
              const errorMessage = `Could not delete ${entityData._meta.camel} with ID ${args.id}. Error message: ${error}`
              log.error(errorMessage)
              reject(errorMessage)
            })
          })
        })
      }

      // @todo
      // Update entity

      // @todo
      // Replace entity
    }

    // Resolve top-level and nested objects and references.
    resolveNestedFields(types, entityData._meta.pascal, entityData.fields)
  })

  for (const type in types) {
    resolvers[type] = types[type]
  }
}

export default {
  register (hooks: events$EventEmitter) {
    hooks.on('core.graphql.resolvers', ({ resolvers, entityTypes, modelQuery, getClientLanguage }) => {
      entityResolvers(resolvers, entityTypes, modelQuery, getClientLanguage)
    })
  }
}
