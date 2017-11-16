const { _, entities, options, hooks, log } = DI.container

const modelQuery = async function (model, parent, args) {
  const params = args.params || {
    limit: 100,
    sortBy: null,
    sortDirection: null
  }

  const sortOptions = {}

  if (params.sortBy) {
    sortOptions[params.sortBy] = params.sortDirection === 'DESC' ? -1 : 1
  }

  const modelEntities = await model.find().limit(params.limit).sort(sortOptions)

  return modelEntities
}

const resolveNestedFields = function (types, currentType, fields) {
  _(fields).forEach((field, fieldName) => {
    if (field.type === 'object') {
      resolveNestedFields(types, `${currentType}_${field._meta.camel}`, field.fields)
    }

    if (field.type === 'reference') {
      types[currentType] = {}

      types[currentType][field._meta.camel] = function (sourceDocument, args, models) {
        if (field.many) {
          let targetEntities = []
          sourceDocument[field._meta.camel].map(targetId => {
            targetEntities.push(models[field.references].findById(targetId))
          })
          return targetEntities
        } else {
          return models[field.references].findById(sourceDocument[field._meta.camel])
        }
      }
    }
  })
}

export const graphQLResolvers = function () {
  const entityTypes = entities.getData(options.entities)

  const queries = {}
  const mutations = {}

  const types = {}

  _(entityTypes).forEach(entityData => {
    types[entityData._meta.pascal] = {}

    // Get single entity.
    queries[entityData._meta.camel] = async (parent, args, models) => {
      return models[entityData._meta.pascal].findById(args.id)
    }

    // Get many entities.
    queries[entityData._meta.pluralCamel] = async (parent, args, models) => {
      return modelQuery(models[entityData._meta.pascal], parent, args)
    }

    // Create entity.
    mutations[`create${entityData._meta.pascal}`] = async (parent, args, models) => {
      const EntityModel = models[entityData._meta.pascal]
      const entity = await new EntityModel(args.params).save()
      entity._id = entity._id.toString()
      return entity
    }

    // Delete entity.
    mutations[`delete${entityData._meta.pascal}`] = (parent, args, models) => {
      return models[entityData._meta.pascal].findById(args.id).exec(function (err, entity) {
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
