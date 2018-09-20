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
        }
        return dbModels[field.references].findById(sourceDocument[fieldName])
      }
    }
  })
}

/**
 * Ensure that mongoose documents have expected values as per the GraphQL constraints.
 */
const ensureDocumentHasDefaultValues = function (fields: EntityTypeFields, documentPartial: {}) {
  _(fields).forEach((field: EntityTypeField, fieldId: string) => {
    if (field.fields && documentPartial[fieldId]) {
      ensureDocumentHasDefaultValues(field.fields, documentPartial[fieldId])
    }
    // Required field must return a value:
    if (field.required && _.isEmpty(documentPartial[fieldId])) {
      if (field.default) {
        // Use default value as set on the field definition.
        documentPartial[fieldId] = field.default
        return
      }

      if (['int', 'float', 'boolean'].includes(field.type)) {
        // Implicit default value based on the field type.
        documentPartial[fieldId] = 0
        return
      }

      // Fallback default value.
      documentPartial[fieldId] = ''
    }
  })
}

const entityResolvers = function (resolvers, entityTypes, modelQuery, getClientLanguage) {
  const types = {}

  const definitions = entityTypes.getData()

  _(definitions).forEach(entityData => {
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
      let document = {}
      let error

      await dbModels[entityData._meta.pascal].findById(args.id).exec()
        .then(doc => {
          document = doc
        })
        .catch(err => {
          error = err
        })

      if (error) {
        return error
      }

      ensureDocumentHasDefaultValues(entityData.fields, document)

      hooks.invoke('core.entity.resolvedQuery', {
        query: entityData._meta.camel,
        parent,
        args,
        dbModels,
        document
      })

      return document
    }

    // Get many entities.
    resolvers.Query[entityData._meta.pluralCamel] = async (parent, args, { dbModels }) => {
      let documents = {}
      let error

      await modelQuery(dbModels[entityData._meta.pascal], parent, args).exec()
        .then(docs => {
          documents = docs
        })
        .catch(err => {
          error = err
        })

      if (error) {
        return error
      }

      documents.forEach(document => ensureDocumentHasDefaultValues(entityData.fields, document))

      hooks.invoke('core.entity.resolvedQuery', {
        query: entityData._meta.pluralCamel,
        parent,
        args,
        dbModels,
        documents
      })

      return documents
    }

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

        const transactionHandlers: Array<transactionHandler> = []
        hooks.invoke('core.entity.createHandlers', { transactionHandlers })

        return new Transaction(transactionHandlers, transactionContext).execute()
          .then(txn => {
            if (txn.status === 'complete') {
              const createdEntity = txn.context.createdEntity
              createdEntity._id = createdEntity._id.toString()
              return createdEntity
            }
            return txn.error
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
