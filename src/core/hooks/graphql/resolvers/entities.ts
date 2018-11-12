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
const resolveNestedFieldTypes = function (types: any, currentType: string, fields: EntityTypeFields) {
  _(fields).forEach((field, fieldName) => {
    if (field.type === 'object' && field.fields) {
      resolveNestedFieldTypes(types, `${currentType}_${fieldName}`, field.fields)
    }

    if (field.type === 'reference') {
      types[currentType] = types[currentType] || {}

      // Reference field resolver function.
      types[currentType][fieldName] = function (sourceDocument: any, args: any, { dbModels }: { dbModels: DbModels }) {
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

interface IInputReferenceDefinition {
  existing?: {
    entityType: string
    entityId: string
  }
  [createReferenceType: string]: any
}

/**
 * Resolve input arguments to normalize storage of reference fields.
 *
 * Reference fields can either reference existing entities or create new
 * entities as part of the parent mutation.
 *
 * This checks whether creating entity references are required before saving the
 * main entity. If so, entities are created and referenced on the main entity
 * args in prepare callbacks by adding transaction handlers.
 */
const resolveInputArguments = async function (args: any, context: any, currentArgsIndex: Array<string>, fields: EntityTypeFields, resolvers: any, entityTypeDefinitions: EntityTypeDefinitions) {
  for (const fieldName of Object.keys(fields)) {
    const field = fields[fieldName]
    if (field.type === 'object' && field.fields) {
      await resolveInputArguments(args, context, [...currentArgsIndex, fieldName], field.fields, resolvers, entityTypeDefinitions)
    }

    if (field.type === 'reference') {
      // Get the input argument data from the current index if it has been set
      // on the mutation.
      let argData = _.get(args, [...currentArgsIndex, fieldName])

      if (argData) {
        if (!field.many) {
          // Input is coming in for a singular field. Normalize to an array for
          // common handling of single and multiple references and storage.
          argData = [argData]
        }

        // Alias argData for typecasting.
        const referenceDefinitions = argData as [IInputReferenceDefinition]

        // Iterate reference field input to alter the input args to be in the
        // expected format for storage: `entityType|entityId`
        for (const referenceItemIndex in referenceDefinitions) {
          const referenceItemData = referenceDefinitions[referenceItemIndex]

          // Convert input declaring a reference to an existing entity.
          if (referenceItemData.existing && referenceItemData.existing.entityType && referenceItemData.existing.entityId) {
            const value = `${referenceItemData.existing.entityType}|${referenceItemData.existing.entityId}`
            if (field.many) {
              _.set(args, [...currentArgsIndex, fieldName, referenceItemIndex], value)
              continue
            }
            _.set(args, [...currentArgsIndex, fieldName], value)
            continue
          }

          // If there is no 'existing' reference type set check for arguments
          // that declare to entity creation. Only process the first reference
          // item found because there should only ever be only declaration per
          // argsData item.
          const action = Object.keys(referenceItemData).length > 0 ? Object.keys(referenceItemData)[0] : null

          if (action && resolvers.Mutation && resolvers.Mutation[action] && typeof resolvers.Mutation[action] === 'function') {

            const referencedEntityType = action.replace('create', '')

            context.entityType = referencedEntityType
            context.entityTypeData = entityTypeDefinitions[referencedEntityType]

            const createdEntity = await resolvers.Mutation[action].apply(null, [null, referenceItemData[action], context])

            const value = `${referencedEntityType}|${createdEntity._id}`

            if (field.many) {
              _.set(args, [...currentArgsIndex, fieldName, referenceItemIndex], value)
              continue
            }
            _.set(args, [...currentArgsIndex, fieldName], value)
            continue
          }

          // Fallback to unsetting the reference.
          if (field.many) {
            _.unset(args, [...currentArgsIndex, fieldName, referenceItemIndex])
          }
          _.unset(args, [...currentArgsIndex, fieldName])
        }
      }
    }
  }
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
      resolveNestedFieldTypes(types, entityData._meta.pascal, entityData.fields)
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
      resolvers.Mutation[`create${entityData._meta.pascal}`] = async (parent: any, args: any, context: { entityType?: string, entityData?: EntityTypeDefinition, dbModels: DbModels }) => {

        // Nested references don't have to nest their input arguments inside a
        // 'fields' property. If a nested reference is calling this function
        // then update args to wrap the input args with an object which maps the
        // expected structure. See resolveInputArguments().
        if (!args.fields) {
          args = { fields: args }
        }

        const transactionContext = {
          parent,
          args,
          dbModels: context.dbModels,
          entityType: context.entityType ? context.entityType : entityData._meta.pascal,
          entityData: context.entityData ? context.entityData : entityData
        }

        const transactionHandlers: Array<TransactionHandler> = []

        await resolveInputArguments(args, context, ['fields'], entityData.fields, resolvers, definitions)

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
    resolveNestedFieldTypes(types, entityData._meta.pascal, entityData.fields)
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
