// @flow
const { _, log } = Panacea.container

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

const entityResolvers = function (resolvers, entityTypes, modelQuery, getClientLanguage) {
  const types = {}

  _(entityTypes).forEach(entityData => {
    types[entityData._meta.pascal] = {}

    // Get single entity.
    resolvers.Query[entityData._meta.camel] = async (parent, args, { dbModels }) => {
      return dbModels[entityData._meta.pascal].findById(args.id)
    }

    // Get many entities.
    resolvers.Query[entityData._meta.pluralCamel] = async (parent, args, { dbModels }) => modelQuery(dbModels[entityData._meta.pascal], parent, args)

    // Create entity.
    resolvers.Mutation[`create${entityData._meta.pascal}`] = async (parent, args, { dbModels }) => {
      const EntityModel = dbModels[entityData._meta.pascal]
      const entity = await new EntityModel(args.params).save()
      entity._id = entity._id.toString()
      return entity
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

    // Resolve top-level and nested object references.
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