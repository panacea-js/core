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
  const fieldTypes: FieldTypes = {}

  hooks.invoke('core.entityTypes.fields.definitions', { fieldTypes })

  this.fieldTypes = fieldTypes
  return fieldTypes
}

EntityTypes.prototype.addError = function (entityTypeData: EntityType, error: Error) {
  // Ensure the _errors array exists.
  entityTypeData._errors = entityTypeData._errors || []
  entityTypeData._errors.push(error)
}

EntityTypes.prototype.validate = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') : boolean {
  // Entity type validators.
  const entityTypeValidators = [
    EntityTypes.prototype.validateRequiredProperties
  ]

  hooks.invoke('core.entityTypes.validators', { entityTypeValidators })
  entityTypeValidators.map(validator => validator.call(this, entityTypeData, entityTypeName, action))

  // Field validators.
  const entityTypeFieldValidators = [
    EntityTypes.prototype.validateRequiredFields
  ]

  hooks.invoke('core.entityTypes.fieldValidators', { entityTypeFieldValidators })
  entityTypeFieldValidators.map(validator => validator.call(this, entityTypeData, entityTypeName, action, entityTypeData.fields))

  return this._errors && this._errors.length > 0 ? false : true
}

EntityTypes.prototype.validateRequiredProperties = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') : void {
  if (_(entityTypeData.fields).isEmpty()) this.addError(entityTypeData, TypeError(`Fields do not exist on entity type: ${entityTypeName}`))
  if (_(entityTypeData.plural).isEmpty()) this.addError(entityTypeData, TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`))
  if (_(entityTypeData.storage).isEmpty()) this.addError(entityTypeData, TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`))
}

EntityTypes.prototype.validateRequiredFields = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save', fields: EntityTypeFields) : void {
  _(fields).forEach((field, fieldName) => {
    // Validate field contains all the required attributes.
    if (_(field).isEmpty()) this.addError(entityTypeData, TypeError(`Field ${fieldName} configuration is empty`))
    if (_(field.type).isEmpty()) this.addError(entityTypeData, TypeError(`Field type not defined for ${fieldName}`))
    if (this.fieldTypes[field.type] === undefined) this.addError(entityTypeData, TypeError(`Field type ${field.type} is invalid for ${fieldName}`))
    if (_(field.label).isEmpty()) this.addError(entityTypeData, TypeError(`Field label not defined for ${fieldName}`))

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to append output to the fields key.
      // This allows for unlimited nesting of defined fields.
      this.validateRequiredFields(entityTypeData, entityTypeName, action, field.fields)
    }
  })
}

EntityTypes.prototype.addMeta = function (entityTypeData: EntityType, entityTypeName: string) : void {
  entityTypeData.description = entityTypeData.description || ''

  const meta: Meta = {
    camel: _.camelCase(entityTypeName),
    pascal: _.upperFirst(_.camelCase(entityTypeName)),
    descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
    pluralCamel: _.camelCase(entityTypeData.plural)
  }

  hooks.invoke('core.entityTypes.meta', { entityTypeName, entityTypeData, meta })

  this.definitions[entityTypeName]._meta = meta
}

EntityTypes.prototype.addFieldsMeta = function (fields: EntityTypeFields) : EntityTypeFields {
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

  hooks.invoke('core.entityTypes.fields.meta', { fields })

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
    this.addMeta(entityTypeData, entityTypeName)
    this.validate(entityTypeData, entityTypeName, 'load')
    this.checkObjectsHaveFields(entityTypeData.fields, entityTypeName)
    entityTypeData.fields = this.addFieldsMeta(entityTypeData.fields)
  })

  return this.definitions
}

EntityTypes.prototype.save = function (name: string, data: EntityType, locationKey: string) : { success: boolean, errorMessage: string } {
  const result = {
    success: false,
    errorMessage: ''
  }

  // Clone the incoming data while removing any special object types such as observers.
  let entityTypeData: EntityType = JSON.parse(JSON.stringify(data))

  hooks.invoke('core.entityTypes.preSave', { name, entityTypeData, locationKey })

  const validates = this.validate(entityTypeData, name, 'save')

  if (!validates && entityTypeData._errors) {
    const validationErrors = entityTypeData._errors.join('\n')
    result.errorMessage = `Entity validation failed on: ${validationErrors}`
    return result
  }

  if (_(locationKey).isEmpty()) {
    locationKey = this.defaults.locationKey
  }

  const basePath = this.locations[locationKey]

  if (!fs.existsSync(basePath)) {
    const errorMessage = `Location key ${locationKey} does not have a valid file path to save the entity.`
    log.error(errorMessage)
    result.errorMessage = errorMessage
    return result
  }

  // Transform entity type name to pascal case.
  name = _.upperFirst(_.camelCase(name))

  const filePath = `${basePath}/${name}.yml`

  try {
    entityTypeData.fields = EntityTypes.prototype.removeFalsyFields(entityTypeData.fields)
    entityTypeData = EntityTypes.prototype.stripMeta(entityTypeData)
    result.success = true
    writeYmlFile(filePath, entityTypeData)
    hooks.invoke('core.reload', { reason: `entity ${name} was created` })
  } catch (error) {
    const errorMessage = `Could not write entity file ${name}.yml to ${basePath}: ${error.message}`
    log.error(errorMessage)
    result.errorMessage = errorMessage
    return result
  }

  hooks.invoke('core.entityTypes.postSave', { name, entityTypeData, locationKey })

  return result
}

EntityTypes.prototype.stripMeta = function (data: EntityType) : EntityType {
  const clonedData : EntityType = _.cloneDeep(data)

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

EntityTypes.prototype.removeFalsyFields = function (fields: EntityTypeFields) : EntityTypeFields {
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

EntityTypes.prototype.checkObjectsHaveFields = (fields: EntityTypeFields, entityTypeName: string) : void => {
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
