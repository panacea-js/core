const { _, entities, hooks, log, writeYmlFile } = DI.container

const modelQuery = function (model, parent, args) {
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

const panaceaEntityResolvers = function (entityTypes, queries, mutations) {
  queries['ENTITY'] = async (parent, { name }, models) => {
    if (entityTypes[name]) {
      return {
        name,
        data: JSON.stringify(entityTypes[name])
      }
    } else {
      return null
    }
  }

  queries['ENTITIES'] = () => {
    const allEntities = []

    _(entityTypes).forEach((entityType, entityTypeName) => {
      const entityTypeData = entities.stripMeta(entityTypes[entityTypeName])
      allEntities.push({
        name: entityTypeName,
        data: JSON.stringify(entityTypeData)
      })
    })

    return allEntities
  }

  mutations['createENTITY'] = async (parent, { name, data, locationKey }) => {
    const dataJSON = JSON.parse(data)

    entities.validateRequiredEntityProperties(dataJSON, name)
    entities.validateRequiredFields(dataJSON.fields, name)

    if (_(locationKey).isEmpty()) {
      locationKey = entities.defaults.locationKey
    }

    name = _.upperFirst(_.camelCase(name))

    const filepath = `${entities.locations[locationKey]}/${name}.yml`

    writeYmlFile(filepath, dataJSON)

    hooks.invoke('core.reload', `entity ${name} was created`)

    return {
      name,
      data
    }
  }
}

export const graphQLResolvers = function () {
  const entityTypes = entities.getData()

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

  panaceaEntityResolvers(entityTypes, queries, mutations)

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
