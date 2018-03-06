// @flow
const { _, log, fs, loadYmlFiles, writeYmlFile, hooks, registry, i18n } = DI.container

const Entities = function () {
  this.entityTypes = {}
  this.locations = {}
  this.defaults = {
    locationKey: 'app'
  }
  this.fieldTypes = this.registerFieldTypes()
}

Entities.prototype.registerFieldTypes = function () {
  const fieldTypes: FieldTypes = {
    id: {
      label: i18n.t('core.entities.fields.id.label'),
      description: i18n.t('core.entities.fields.id.description')
    },
    string: {
      label: i18n.t('core.entities.fields.string.label'),
      description: i18n.t('core.entities.fields.string.description')
    },
    password: {
      label: i18n.t('core.entities.fields.password.label'),
      description: i18n.t('core.entities.fields.password.description')
    },
    text: {
      label: i18n.t('core.entities.fields.text.label'),
      description: i18n.t('core.entities.fields.text.description')
    },
    float: {
      label: i18n.t('core.entities.fields.float.label'),
      description: i18n.t('core.entities.fields.float.description')
    },
    int: {
      label: i18n.t('core.entities.fields.int.label'),
      description: i18n.t('core.entities.fields.int.description')
    },
    boolean: {
      label: i18n.t('core.entities.fields.boolean.label'),
      description: i18n.t('core.entities.fields.boolean.description')
    },
    reference: {
      label: i18n.t('core.entities.fields.reference.label'),
      description: i18n.t('core.entities.fields.reference.description')
    },
    object: {
      label: i18n.t('core.entities.fields.object.label'),
      description: i18n.t('core.entities.fields.object.description')
    }
  }

  hooks.invoke('core.entities.fields.definitions', fieldTypes)

  return fieldTypes
}

Entities.prototype.addEntityTypeError = function (entityTypeData: EntityType, error: Error) {
  // Ensure the _errors array exists.
  if (!entityTypeData._errors) entityTypeData._errors = []
  entityTypeData._errors.push(error)
}

Entities.prototype.validateEntityType = function (entityTypeData: EntityType, entityTypeName: string) {
  const entityTypeValidators = [
    this._validateEntityTypeRequiredProperties.bind(this)
  ]

  hooks.invoke('core.entities.entityTypeValidators', entityTypeValidators)

  entityTypeValidators.map(validator => validator(entityTypeData, entityTypeName))

  const entityTypeFieldsValidators = [
    this._validateEntityTypeRequiredFields.bind(this)
  ]

  hooks.invoke('core.entities.entityTypeFieldsValidators', entityTypeFieldsValidators)

  entityTypeFieldsValidators.map(validator => validator(entityTypeData, entityTypeName, entityTypeData.fields))
}

Entities.prototype._validateEntityTypeRequiredProperties = function (entityTypeData: EntityType, entityTypeName: string) {
  if (_(entityTypeData.fields).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Fields do not exist on entity type: ${entityTypeName}`))
  if (_(entityTypeData.plural).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`))
  if (_(entityTypeData.storage).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`))
}

Entities.prototype._validateEntityTypeRequiredFields = function (entityTypeData: EntityType, entityTypeName: string, fields: EntityTypeFields) {
  _(fields).forEach((field, fieldName) => {
    // Validate field contains all the required attributes.
    if (_(field).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Field ${fieldName} configuration is empty`))
    if (_(field.type).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Field type not defined for ${fieldName}`))
    if (this.fieldTypes[field.type] === undefined) this.addEntityTypeError(entityTypeData, TypeError(`Field type ${field.type} is invalid for ${fieldName}`))
    if (_(field.label).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Field label not defined for ${fieldName}`))

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to append output to the fields key.
      // This allows for unlimited nesting of defined fields.
      this._validateEntityTypeRequiredFields(entityTypeData, entityTypeName, field.fields)
    }
  })
}

Entities.prototype.addEntityTypeMeta = function (entityTypeData: EntityType, entityTypeName: string) {
  entityTypeData.description = entityTypeData.description || ''

  this.entityTypes[entityTypeName]._meta = {
    camel: _.camelCase(entityTypeName),
    pascal: _.upperFirst(_.camelCase(entityTypeName)),
    descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
    pluralCamel: _.camelCase(entityTypeData.plural)
  }

  hooks.invoke('core.entities.meta', this.entityTypes[entityTypeName], entityTypeName)
}

Entities.prototype.addFieldsMeta = function (fields: EntityTypeFields) {
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

  hooks.invoke('core.entities.fields.meta', fields)

  return fields
}

Entities.prototype.clearCache = function () {
  this.entityTypes = {}
}

Entities.prototype.getData = function () {
  // Ensure that the filesystem is only hit once.
  if (_(this.entityTypes).isEmpty()) {
    _.forIn(registry.entities, registrantData => {
      this.locations[registrantData.locationKey] = registrantData.path
      const fileEntities = loadYmlFiles(registrantData.path)
      _(fileEntities).forEach((entity, entityName) => {
        fileEntities[entityName]._locationKey = registrantData.locationKey
        fileEntities[entityName]._errors = []
      })
      _.extend(this.entityTypes, fileEntities)
    })
  }

  hooks.invoke('core.entities.definitions', this.entityTypes)

  _(this.entityTypes).forEach((entityTypeData, entityTypeName) => {
    this.addEntityTypeMeta(entityTypeData, entityTypeName)
    this.validateEntityType(entityTypeData, entityTypeName)
    entityTypeData.fields = this.addFieldsMeta(entityTypeData.fields)
  })

  return this.entityTypes
}

Entities.prototype.saveEntityType = function (name: string, data: EntityType, locationKey: string) {
  const result = {
    success: true,
    errorMessage: ''
  }

  // Clone the incoming data.
  let dataJSON = JSON.parse(JSON.stringify(data))

  hooks.invoke('core.entities.preSaveEntityType', name, dataJSON, locationKey)

  this.validateEntityType(dataJSON, name)

  if (dataJSON._errors && dataJSON._errors.length > 0) {
    result.success = false
    const validationErrors = dataJSON._errors.join('\n')
    result.errorMessage = `Entity validation failed on: ${validationErrors}`
  } else {
    if (_(locationKey).isEmpty()) {
      locationKey = this.defaults.locationKey
    }

    const basePath = this.locations[locationKey]

    if (!fs.existsSync(basePath)) {
      const errorMessage = `Location key ${locationKey} does not have a valid file path to save the entity.`
      log.error(errorMessage)
      result.success = false
      result.errorMessage = errorMessage
    } else {
      name = _.upperFirst(_.camelCase(name))

      const filePath = `${basePath}/${name}.yml`

      try {
        dataJSON.fields = entities.removeFalsyFields(dataJSON.fields)
        dataJSON = entities.stripMeta(dataJSON)
        writeYmlFile(filePath, dataJSON)
        hooks.invoke('core.reload', `entity ${name} was created`)
      } catch (error) {
        const errorMessage = `Could not write entity file ${name}.yml to ${basePath}: ${error.message}`
        log.error(errorMessage)
        result.success = false
        result.errorMessage = errorMessage
      }
    }

    if (result.success) {
      hooks.invoke('core.entities.postSaveEntityType', name, dataJSON, locationKey)
    }
  }

  return result
}

Entities.prototype.stripMeta = function (data: EntityType) {
  const clonedData = _(data).cloneDeep(data)

  _(clonedData).forEach((value, key) => {
    if (typeof clonedData === 'object') {
      clonedData[key] = Entities.prototype.stripMeta(value)
    }
    // Strip any keys with _.
    if (typeof key === 'string' && key.indexOf('_') === 0) {
      delete clonedData[key]
    }
  })

  return clonedData
}

Entities.prototype.removeFalsyFields = function (fields: EntityTypeFields) {
  _(fields).forEach((field, fieldName) => {
    _(field).forEach((value, key) => {
      _(value).isEmpty() && delete fields[fieldName][key]
      field.type === 'object' && field.hasOwnProperty('fields') && this.removeFalsyFields(field.fields)
    })
  })

  return fields
}

const entities = new Entities()

export { entities }
