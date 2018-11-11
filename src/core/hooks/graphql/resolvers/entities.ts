import { IHooks } from '../../../../utils/hooks'
import { IResolvers } from 'graphql-tools'
import { DbModels } from '../../../../mongodb/models'
import { TransactionHandler, Transaction as ITransaction } from '../../../../utils/transaction'

const { _, log, hooks, entityTypes, Transaction, modelQuery } = Panacea.container

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
  types: any,
  currentType: string,
  fields: EntityTypeFields
): void {
  _(fields).forEach((field, fieldName) => {
    if (field.type === 'object' && field.fields) {
      resolveNestedFields(types, `${currentType}_${fieldName}`, field.fields)
    }

    if (field.type === 'reference') {
      types[currentType] = types[currentType] || {}

      types[currentType][fieldName] = function (sourceDocument: any, args: any, { dbModels }: { dbModels: DbModels}) {
        if (!field.references) {
          return
        }

        if (field.many) {
          let targetEntities: Array<any> = []
          sourceDocument[fieldName].map((target: string) => {
            const [targetEntityType, targetId] = target.split('|')
            if (!dbModels[targetEntityType]) {
              return
            }
            const targetEntity = dbModels[targetEntityType].findById(targetId)
            targetEntities.push(targetEntity)
          })
          return targetEntities.filter(x => !!x)
        }

        const [targetEntityType, targetId] = sourceDocument[fieldName].split('|')

        if (!dbModels[targetEntityType]) {
          return
        }

        const targetEntity = dbModels[targetEntityType].findById(targetId)

        return targetEntity
      }
    }
  })
}

/**
 * Ensure that mongoose documents have expected values as per the GraphQL constraints.
 */
const ensureDocumentHasDefaultValues = function (fields: EntityTypeFields, documentPartial: any) {

  const applyDefaultValues = function (item: any, field: EntityTypeField, fieldId: string) {
    // Required field must return a value:
    if (field.required && _.isEmpty(item[fieldId])) {
      if (field.default) {
        // Use default value as set on the field definition.
        item[fieldId] = field.default
        return
      }

      if (['int', 'float', 'boolean'].includes(field.type)) {
        // Implicit default value based on the field type.
        item[fieldId] = 0
        return
      }

      // Fallback default value.
      item[fieldId] = ''
    }
  }

  _(fields).forEach((field: EntityTypeField, fieldId: string) => {
    if (field.fields && documentPartial[fieldId]) {
      ensureDocumentHasDefaultValues(field.fields, documentPartial[fieldId])
    }

    if (Array.isArray(documentPartial)) {
      documentPartial.forEach(item => applyDefaultValues(item, field, fieldId))
      return
    }

    applyDefaultValues(documentPartial, field, fieldId)
  })
}

/**
 * Defines resolvers for single and multiple entities.
 *
 * @param {*} resolvers The mutable object of resolver definitions.
 */
const entityResolvers = function (resolvers: any) {
  const types: any = {}

  const definitions = entityTypes.getData()

  _(definitions).forEach((entityData) => {
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
    resolvers.Query[entityData._meta.camel] = async (parent: any, args: any, { dbModels }: { dbModels: DbModels }) => {
      let document: any = {}
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
    resolvers.Query[entityData._meta.pluralCamel] = async (parent: any, args: any, { dbModels }: { dbModels: DbModels }) => {
      let documents: Array<any> = []
      let error

      await modelQuery(dbModels[entityData._meta.pascal], parent, args).exec()
        .then((docs: Array<any>) => {
          documents = docs
        })
        .catch((err: Error) => {
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
      resolvers.Mutation[`create${entityData._meta.pascal}`] = async (parent: any, args: any, { dbModels }: { dbModels: DbModels }) => {
        const transactionContext = {
          parent,
          args,
          dbModels,
          entityType: entityData._meta.pascal,
          entityData
        }

        // @todo - Fix this - only done to fix test, need general solution to:
        // 1. Map 'existing' inputs to  entityType|entityId for storage - first lookup to check for valid entity
        // 2. Create entities and attach reference is input field key starts with 'create'
        if (args.fields.livesWithDogs) {
          args.fields.livesWithDogs = args.fields.livesWithDogs.map(dogRef => {
            return `${dogRef.existing.entityType}|${dogRef.existing.entityId}`
          })
        }
        if (args.fields.bestBuddy) {
          args.fields.bestBuddy = `${args.fields.bestBuddy.existing.entityType}|${args.fields.bestBuddy.existing.entityId}`
        }

        const transactionHandlers: Array<TransactionHandler> = []
        hooks.invoke('core.entity.createHandlers', { transactionHandlers })

        return new Transaction(transactionHandlers, transactionContext).execute()
          .then((txn: ITransaction) => {
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
      resolvers.Mutation[`delete${entityData._meta.pascal}`] = (parent: any, args: any, { dbModels }: { dbModels: DbModels }) => {
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
  register (hooks: IHooks) {
    hooks.on('core.graphql.resolvers', ({ resolvers }: { resolvers: IResolvers }) => {
      entityResolvers(resolvers)
    })
  }
}
