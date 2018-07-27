// @flow
const { _, log, fs, loadYmlFiles, writeYmlFile, hooks, registry } = Panacea.container

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
      label: 'core.entities.fields.id.label',
      description: 'core.entities.fields.id.description'
    },
    string: {
      label: 'core.entities.fields.string.label',
      description: 'core.entities.fields.string.description'
    },
    password: {
      label: 'core.entities.fields.password.label',
      description: 'core.entities.fields.password.description'
    },
    text: {
      label: 'core.entities.fields.text.label',
      description: 'core.entities.fields.text.description'
    },
    float: {
      label: 'core.entities.fields.float.label',
      description: 'core.entities.fields.float.description'
    },
    int: {
      label: 'core.entities.fields.int.label',
      description: 'core.entities.fields.int.description'
    },
    boolean: {
      label: 'core.entities.fields.boolean.label',
      description: 'core.entities.fields.boolean.description'
    },
    reference: {
      label: 'core.entities.fields.reference.label',
      description: 'core.entities.fields.reference.description'
    },
    object: {
      label: 'core.entities.fields.object.label',
      description: 'core.entities.fields.object.description'
    }
  }

  hooks.invoke('core.entities.fields.definitions', fieldTypes)

  return fieldTypes
}

Entities.prototype.addEntityTypeError = function (entityTypeData: EntityType, error: Error) {
  // Ensure the _errors array exists.
  entityTypeData._errors = entityTypeData._errors || []
  entityTypeData._errors.push(error)
}

Entities.prototype.validateEntityType = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') {
  // Entity type validators.
  const entityTypeValidators = [
    this._validateEntityTypeRequiredProperties.bind(this)
  ]

  if (action === 'save') {
    entityTypeValidators.push(this._validateEntityTypeReservedNames.bind(this))
  }

  hooks.invoke('core.entities.entityTypeValidators', entityTypeValidators)
  entityTypeValidators.map(validator => validator(entityTypeData, entityTypeName, action))

  // Field validators.
  const entityTypeFieldsValidators = [
    this._validateEntityTypeRequiredFields.bind(this)
  ]

  hooks.invoke('core.entities.entityTypeFieldsValidators', entityTypeFieldsValidators)
  entityTypeFieldsValidators.map(validator => validator(entityTypeData, entityTypeName, action, entityTypeData.fields))
}

Entities.prototype._validateEntityTypeRequiredProperties = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') {
  if (_(entityTypeData.fields).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`Fields do not exist on entity type: ${entityTypeName}`))
  if (_(entityTypeData.plural).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`))
  if (_(entityTypeData.storage).isEmpty()) this.addEntityTypeError(entityTypeData, TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`))
}

Entities.prototype._validateEntityTypeReservedNames = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') {
  if (entityTypeName.indexOf('Revision') !== -1) this.addEntityTypeError(entityTypeData, Error(`${entityTypeName} cannot contain the word 'Revision' as this is used internally by Panacea`))
}

Entities.prototype._validateEntityTypeRequiredFields = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save', fields: EntityTypeFields) {
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

  const meta: Meta = {
    camel: _.camelCase(entityTypeName),
    pascal: _.upperFirst(_.camelCase(entityTypeName)),
    descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
    pluralCamel: _.camelCase(entityTypeData.plural)
  }

  hooks.invoke('core.entities.meta', {entityTypeName, entityTypeData, meta})

  this.entityTypes[entityTypeName]._meta = meta
}

Entities.prototype.addFieldsMeta = function (fields: EntityTypeFields) {
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

  hooks.invoke('core.entities.fields.meta', fields)

  return fields
}

Entities.prototype.clearCache = function (): void {
  this.entityTypes = {}
}

Entities.prototype.getData = function (): EntityTypes {
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
    this.validateEntityType(entityTypeData, entityTypeName, 'load')
    this.checkObjectsHaveFields(entityTypeData.fields, entityTypeName)
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

  hooks.invoke('core.entities.preSaveEntityType', {name, dataJSON, locationKey})

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
      if (_(value).isEmpty() && value !== true) {
        delete fields[fieldName][key]
      }
    })
    field.type === 'object' && field.hasOwnProperty('fields') && this.removeFalsyFields(field.fields)
  })

  return fields
}

Entities.prototype.checkObjectsHaveFields = (fields: EntityTypeFields, entityTypeName: string) => {
  _(fields).forEach((fieldData, fieldId) => {
    if (fieldData.type === 'object' && !fieldData.fields) {
      console.warn(`Not loading ${fieldId} field on ${entityTypeName} because it doesn't have any nested fields.`)
      delete fields[fieldId]
    }
    if (fieldData.fields) {
      Entities.prototype.checkObjectsHaveFields(fieldData.fields, entityTypeName)
    }
  })
}

const entities = new Entities()

export { entities }
