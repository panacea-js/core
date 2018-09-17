// @flow
const { _, log, fs, loadYmlFiles, writeYmlFile, hooks, registry } = Panacea.container

const EntityTypes = function () {
  this.definitions = {}
  this.locations = {}
  this.defaults = {
    locationKey: 'app'
  }
  this.fieldTypes = {}
}

EntityTypes.prototype.registerFieldTypes = function () {
  const fieldTypes: FieldTypes = {
    id: {
      label: 'core.entityTypes.fields.id.label',
      description: 'core.entityTypes.fields.id.description'
    },
    string: {
      label: 'core.entityTypes.fields.string.label',
      description: 'core.entityTypes.fields.string.description'
    },
    password: {
      label: 'core.entityTypes.fields.password.label',
      description: 'core.entityTypes.fields.password.description'
    },
    text: {
      label: 'core.entityTypes.fields.text.label',
      description: 'core.entityTypes.fields.text.description'
    },
    float: {
      label: 'core.entityTypes.fields.float.label',
      description: 'core.entityTypes.fields.float.description'
    },
    int: {
      label: 'core.entityTypes.fields.int.label',
      description: 'core.entityTypes.fields.int.description'
    },
    boolean: {
      label: 'core.entityTypes.fields.boolean.label',
      description: 'core.entityTypes.fields.boolean.description'
    },
    reference: {
      label: 'core.entityTypes.fields.reference.label',
      description: 'core.entityTypes.fields.reference.description'
    },
    object: {
      label: 'core.entityTypes.fields.object.label',
      description: 'core.entityTypes.fields.object.description'
    }
  }

  hooks.invoke('core.entityTypes.fields.definitions', { fieldTypes })

  this.fieldTypes = fieldTypes
  return fieldTypes
}

EntityTypes.prototype.addEntityTypeError = function (entityTypeData: EntityType, error: Error) {
  // Ensure the _errors array exists.
  entityTypeData._errors = entityTypeData._errors || []
  entityTypeData._errors.push(error)
}

EntityTypes.prototype.validateEntityType = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') {
  // Entity type validators.
  const entityTypeValidators = [
    this._validateEntityTypeRequiredProperties.bind(this)
  ]

  if (action === 'save') {
    entityTypeValidators.push(this._validateEntityTypeReservedNames.bind(this))
  }

  hooks.invoke('core.entityTypes.entityTypeValidators', entityTypeValidators)
  entityTypeValidators.map(validator => validator(entityTypeData, entityTypeName, action))

  // Field validators.
  const entityTypeFieldsValidators = [
    this._validateEntityTypeRequiredFields.bind(this)
  ]

  hooks.invoke('core.entityTypes.entityTypeFieldsValidators', entityTypeFieldsValidators)
  entityTypeFieldsValidators.map(validator => validator(entityTypeData, entityTypeName, action, entityTypeData.fields))
}

EntityTypes.prototype._validateEntityTypeRequiredProperties = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') {
  if (_(entityTypeData.fields).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Fields do not exist on entity type: ${entityTypeName}`))
  if (_(entityTypeData.plural).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`))
  if (_(entityTypeData.storage).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`))
}

EntityTypes.prototype._validateEntityTypeReservedNames = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') {
  if (entityTypeName.indexOf('Revision') !== -1) this.addEntityTypeError(entityTypeData, Error(`${entityTypeName} cannot contain the word 'Revision' as this is used internally by Panacea`))
}

EntityTypes.prototype._validateEntityTypeRequiredFields = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save', fields: EntityTypeFields) {
  _(fields).forEach((field, fieldName) => {
    // Validate field contains all the required attributes.
    if (_(field).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Field ${fieldName} configuration is empty`))
    if (_(field.type).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Field type not defined for ${fieldName}`))
    if (this.fieldTypes[field.type] === undefined) this.addEntityTypeError(entityTypeData, TypeError(`Field type ${field.type} is invalid for ${fieldName}`))
    if (_(field.label).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Field label not defined for ${fieldName}`))

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to append output to the fields key.
      // This allows for unlimited nesting of defined fields.
      this._validateEntityTypeRequiredFields(entityTypeData, entityTypeName, action, field.fields)
    }
  })
}

EntityTypes.prototype.addEntityTypeMeta = function (entityTypeData: EntityType, entityTypeName: string) {
  entityTypeData.description = entityTypeData.description || ''

  const meta: Meta = {
    camel: _.camelCase(entityTypeName),
    pascal: _.upperFirst(_.camelCase(entityTypeName)),
    descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
    pluralCamel: _.camelCase(entityTypeData.plural)
  }

  hooks.invoke('core.entityTypes.meta', {entityTypeName, entityTypeData, meta})

  this.definitions[entityTypeName]._meta = meta
}

EntityTypes.prototype.addFieldsMeta = function (fields: EntityTypeFields) {
  _(fields).forEach((field, fieldName) => {
    field._meta = field._meta || {}
    // Enforce field names as camel case so as not to interfere with the
    // underscores used to identify the entity/field object nesting hierarchy.
    // Any system fields (such as _revisions) should remain unaltered.
    field._meta['camel'] = _(fieldName.startsWith('_')) ? fieldName : _(fieldName).camelCase()

    field.description = field.description || ''

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to add nest fields meta.
      fields[fieldName].fields = this.addFieldsMeta(field.fields)
    }
  })

  hooks.invoke('core.entityTypes.fields.meta', fields)

  return fields
}

EntityTypes.prototype.clearCache = function (): void {
  this.definitions = {}
  this.fieldTypes = {}
}

EntityTypes.prototype.getData = function (): EntityTypes {
  // Register fields types if not yet loaded.
  if (Object.keys(this.fieldTypes).length === 0) {
    this.registerFieldTypes()
  }

  // Ensure that the filesystem is only hit once.
  if (_(this.definitions).isEmpty()) {
    _.forIn(registry.entityTypes, registrantData => {
      this.locations[registrantData.locationKey] = registrantData.path
      const fileEntityTypes = loadYmlFiles(registrantData.path)
      _(fileEntityTypes).forEach((entity, entityName) => {
        fileEntityTypes[entityName]._locationKey = registrantData.locationKey
        fileEntityTypes[entityName]._errors = []
      })
      _.extend(this.definitions, fileEntityTypes)
    })
  }

  hooks.invoke('core.entityTypes.definitions', { definitions: this.definitions })

  _(this.definitions).forEach((entityTypeData, entityTypeName) => {
    this.addEntityTypeMeta(entityTypeData, entityTypeName)
    this.validateEntityType(entityTypeData, entityTypeName, 'load')
    this.checkObjectsHaveFields(entityTypeData.fields, entityTypeName)
    entityTypeData.fields = this.addFieldsMeta(entityTypeData.fields)
  })

  return this.definitions
}

EntityTypes.prototype.saveEntityType = function (name: string, data: EntityType, locationKey: string) {
  const result = {
    success: true,
    errorMessage: ''
  }

  // Clone the incoming data.
  let dataJSON = JSON.parse(JSON.stringify(data))

  hooks.invoke('core.entityTypes.preSaveEntityType', { name, dataJSON, locationKey })

  this.validateEntityType(dataJSON, name, 'save')

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
        dataJSON.fields = EntityTypes.prototype.removeFalsyFields(dataJSON.fields)
        dataJSON = EntityTypes.prototype.stripMeta(dataJSON)
        writeYmlFile(filePath, dataJSON)
        hooks.invoke('core.reload', { reason: `entity ${name} was created` })
      } catch (error) {
        const errorMessage = `Could not write entity file ${name}.yml to ${basePath}: ${error.message}`
        log.error(errorMessage)
        result.success = false
        result.errorMessage = errorMessage
      }
    }

    if (result.success) {
      hooks.invoke('core.entityTypes.postSaveEntityType', { name, dataJSON, locationKey })
    }
  }

  return result
}

EntityTypes.prototype.stripMeta = function (data: EntityType) {
  const clonedData = _(data).cloneDeep(data)

  _(clonedData).forEach((value, key) => {
    if (typeof clonedData === 'object') {
      clonedData[key] = EntityTypes.prototype.stripMeta(value)
    }
    // Strip any keys with _.
    if (typeof key === 'string' && key.indexOf('_') === 0) {
      delete clonedData[key]
    }
  })

  return clonedData
}

EntityTypes.prototype.removeFalsyFields = function (fields: EntityTypeFields) {
  _(fields).forEach((field, fieldName) => {
    _(field).forEach((value, key) => {
      if (_(value).isEmpty() && value !== true) {
        delete fields[fieldName][key]
      }
    })
    field.type === 'object' && field.hasOwnProperty('fields') && this.removeFalsyFields(field.fields)
  })

  return fields
}

EntityTypes.prototype.checkObjectsHaveFields = (fields: EntityTypeFields, entityTypeName: string) => {
  _(fields).forEach((fieldData, fieldId) => {
    if (fieldData.type === 'object' && !fieldData.fields) {
      console.warn(`Not loading ${fieldId} field on ${entityTypeName} because it doesn't have any nested fields.`)
      delete fields[fieldId]
    }
    if (fieldData.fields) {
      EntityTypes.prototype.checkObjectsHaveFields(fieldData.fields, entityTypeName)
    }
  })
}

const entityTypes = new EntityTypes()

export { entityTypes }
