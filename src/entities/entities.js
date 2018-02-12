const { _, loadYmlFiles, hooks, path, registry, i18n } = DI.container

const Entities = function () {
  this.entityTypes = {}
  this.locations = {}
  this.defaults = {
    locationKey: 'app'
  }
  this.fieldTypes = {
    id: {
      description: 'A unique identifier for the entity'
    },
    string: {
      description: 'A text string'
    },
    password: {
      description: 'A password (encrypted) string'
    },
    text: {
      description: 'A long text string'
    },
    float: {
      description: 'A number with decimals'
    },
    int: {
      description: i18n.t('core.fields.int.description')
    },
    boolean: {
      description: 'On/Off'
    },
    reference: {
      description: 'A reference to another entity'
    },
    object: {
      description: 'A nested data object'
    }
  }

  hooks.invoke('core.entities.fields.definitions', this.fieldTypes)
}

Entities.prototype.validateRequiredEntityProperties = function (entityTypeData, entityTypeName) {
  if (_(entityTypeData).isEmpty()) throw TypeError(`No data is set on entity type: ${entityTypeName}`)
  if (_(entityTypeData.fields).isEmpty()) throw TypeError(`Fields do not exist on entity type: ${entityTypeName}`)
  if (_(entityTypeData.plural).isEmpty()) throw TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`)
  if (_(entityTypeData.storage).isEmpty()) throw TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`)
}

Entities.prototype.validateRequiredFields = function (fields) {
  _(fields).forEach((field, fieldName) => {
    // Validate field contains all the required attributes.
    if (_(field).isEmpty()) throw TypeError(`Field ${fieldName} configuration is empty`)
    if (_(field.type).isEmpty()) throw TypeError(`Field type not defined for ${fieldName}`)
    if (this.fieldTypes[field.type] === undefined) throw TypeError(`Field type ${field.type} is invalid for ${fieldName}`)
    if (_(field.label).isEmpty()) throw TypeError(`Field label not defined for ${fieldName}`)

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to append output to the fields key.
      // This allows for unlimited nesting of defined fields.
      this.validateRequiredFields(field.fields)
    }
  })
}

Entities.prototype.addEntityTypeMeta = function (entityTypeData, entityTypeName) {
  entityTypeData.description = entityTypeData.description || ''

  // Add entityType meta.
  this.entityTypes[entityTypeName]._meta = {
    camel: _.camelCase(entityTypeName),
    pascal: _.upperFirst(_.camelCase(entityTypeName)),
    descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
    pluralCamel: _.camelCase(entityTypeData.plural)
  }
}

Entities.prototype.addFieldsMeta = function (fields) {
  _(fields).forEach((field, fieldName) => {
    // Provide field names as camel case so as not to interfere with
    // the underscores used to identify the entity/field object nesting hierarchy.
    field._meta = {
      camel: _(fieldName).camelCase()
    }

    field.description = field.description || ''

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to add nest fields meta.
      fields[fieldName].fields = this.addFieldsMeta(field.fields)
    }
  })

  return fields
}

Entities.prototype.clearCache = function () {
  this.entityTypes = {}
}

Entities.prototype.getData = function () {
  const entityPaths = _(registry.entities).map(x => x.path)

  // Ensure that the filesystem is only hit once.
  if (_(this.entityTypes).isEmpty()) {
    _(entityPaths).forEach((entitiesPath, locationKey) => {
      if (entitiesPath !== null) {
        this.locations[locationKey] = path.resolve(entitiesPath)
        const fileEntities = loadYmlFiles(entitiesPath)
        _(fileEntities).forEach((entity, entityName) => {
          fileEntities[entityName]._locationKey = locationKey
        })
        _.extend(this.entityTypes, fileEntities)
      }
    })
  }

  hooks.invoke('core.entities.definitions', this.entityTypes)

  if (_(this.entityTypes).isEmpty()) throw TypeError(`No entity types found`)

  _(this.entityTypes).forEach((entityTypeData, entityTypeName) => {
    this.validateRequiredEntityProperties(entityTypeData, entityTypeName)
    this.addEntityTypeMeta(entityTypeData, entityTypeName)
    this.validateRequiredFields(entityTypeData.fields)
    entityTypeData.fields = this.addFieldsMeta(entityTypeData.fields)
  })

  return this.entityTypes
}

Entities.prototype.stripMeta = function (data) {
  const clonedData = _(data).cloneDeep(data)

  _(clonedData).forEach((value, key) => {
    if (typeof clonedData === 'object') {
      clonedData[key] = Entities.prototype.stripMeta(value)
    }
    // Strip any keys with _ but not _id.
    if (typeof key === 'string' && key.indexOf('_') === 0 && key.indexOf('_id') === -1) {
      delete clonedData[key]
    }
  })

  return clonedData
}

const entities = new Entities()

export { entities }
