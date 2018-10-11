const { _, log, fs, loadYmlFiles, writeYmlFile, hooks, registry } = Panacea.container

interface IEntityTypes {
  definitions: EntityTypes,
  locations: object,
  defaults: object,
  fieldTypes: FieldTypes
  fieldsMapMongo: FieldMap
  fieldsMapGraphQL: FieldMap
  addError: (entityTypeData: EntityType, error: Error) => void
}

const EntityTypes = function (this: IEntityTypes) {
  this.definitions = {}
  this.locations = {}
  this.defaults = {
    locationKey: 'app'
  }
  this.fieldTypes = {}
  this.fieldsMapMongo = new Map()
  this.fieldsMapGraphQL = new Map()
}

/**
 * Converts system field definitions to MongoDB equivalents.
 *
 * @param type String
 * @returns object
 */
EntityTypes.prototype.convertFieldTypeToMongo = function (type: string) : string {
  if (typeof type !== 'string' || type === '') {
    throw TypeError('No type specified in mongo field types conversion mapping')
  }

  if (!this.fieldsMapMongo.has(type)) {
    throw new TypeError(type + ' not found in MongoDB type conversion mapping')
  }

  return this.fieldsMapMongo.get(type) || ''
}

/**
 * Converts system field definitions to GraphQL equivalents.
 *
 * @param type String
 * @returns String
 */
EntityTypes.prototype.convertFieldTypeToGraphQL = function (type : string) : string {
  if (typeof type !== 'string' || type === '') {
    throw TypeError('No type specified in GraphQL field types conversion mapping')
  }

  if (!this.fieldsMapGraphQL.has(type)) {
    throw TypeError(type + ' not found in GraphQL type conversion mapping')
  }

  return this.fieldsMapGraphQL.get(type) || ''
}

EntityTypes.prototype.addError = function (entityTypeData: EntityType, error: Error) : void {
  // Ensure the _errors array exists.
  entityTypeData._errors = entityTypeData._errors || []
  entityTypeData._errors.push(error)
}

EntityTypes.prototype.validate = function (entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') : boolean {
  // Entity type validators.
  const entityTypeValidators = [
    validateRequiredProperties
  ]

  hooks.invoke('core.entityTypes.validators', { entityTypeValidators })
  entityTypeValidators.map(validator => validator.call(this, entityTypeData, entityTypeName, action))

  // Field validators.
  const entityTypeFieldValidators = [
    validateRequiredFields
  ]

  hooks.invoke('core.entityTypes.fieldValidators', { entityTypeFieldValidators })
  entityTypeFieldValidators.map(validator => validator.call(this, entityTypeData, entityTypeName, action, entityTypeData.fields))

  return this._errors && this._errors.length > 0 ? false : true
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

EntityTypes.prototype.addFieldsMeta = function (fields: EntityTypeFields) : void {
  _(fields).forEach((field: EntityTypeField, fieldName: string) => {
    field.description = field.description || ''

    field._meta = {
      // Enforce field names as camel case so as not to interfere with the
      // underscores used to identify the entity/field object nesting hierarchy.
      // Any system fields (such as _revisions) should remain unaltered.
      camel: _(fieldName.startsWith('_')) ? fieldName : _(fieldName).camelCase()
    }

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to add nest fields meta.
      this.addFieldsMeta(field.fields)
    }
  })

  hooks.invoke('core.entityTypes.fields.meta', { fields })
}

EntityTypes.prototype.clearCache = function (): void {
  this.definitions = {}
  this.fieldTypes = {}
  this.fieldsMapMongo = new Map()
  this.fieldsMapGraphQL = new Map()
}

EntityTypes.prototype.getData = function (): EntityTypes {
  // Register fields types if not yet loaded.
  if (Object.keys(this.fieldTypes).length === 0) {
    registerFieldTypes.call(this)
  }

  // Ensure that the filesystem is only hit once.
  if (_(this.definitions).isEmpty()) {
    _.forIn(registry.entityTypes, (registrantData: Registrant) => {
      this.locations[registrantData.locationKey] = registrantData.path
      const fileEntityTypes = loadYmlFiles(registrantData.path)
      Object.keys(fileEntityTypes).forEach((entityName: string) => {
        fileEntityTypes[entityName]._locationKey = registrantData.locationKey
        fileEntityTypes[entityName]._errors = []
      })
      _.extend(this.definitions, fileEntityTypes)
    })
  }

  hooks.invoke('core.entityTypes.definitions', { definitions: this.definitions })

  _(this.definitions).forEach((entityTypeData: EntityType, entityTypeName: string) => {
    this.validate(entityTypeData, entityTypeName, 'load')
    this.addMeta(entityTypeData, entityTypeName)
    this.addFieldsMeta(entityTypeData.fields)
    checkObjectsHaveFields.call(this, entityTypeData.fields, entityTypeName)
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

EntityTypes.prototype.stripMeta = function (data: object) : object {
  const clonedData : { [property: string] : any } = _.cloneDeep(data)

  _(clonedData).forEach((value: object, key: string) => {
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

EntityTypes.prototype.removeFalsyFields = function (fields: { [property: string] : any }) : object {
  _(fields).forEach((field: EntityTypeField, fieldName: string) => {
    _(field).forEach((value: any, key: string) => {
      if (_(value).isEmpty() && value !== true) {
        delete fields[fieldName][key]
      }
    })
    field.type === 'object' && field.hasOwnProperty('fields') && this.removeFalsyFields(field.fields)
  })

  return fields
}

/**
 * Iterate entity type object fields to ensure they have subfields.
 *
 * Is is a soft validation. If an object doesn't have sub-fields then exclude it
 * from the definition rather than raising a validator error.
 *
 * @private
 */
function checkObjectsHaveFields (this: IEntityTypes, fields: EntityTypeFields, entityTypeName: string) : void {
  _(fields).forEach((fieldData: EntityTypeField, fieldId: string) => {
    if (fieldData.type === 'object' && !fieldData.fields) {
      console.warn(`Not loading ${fieldId} field on ${entityTypeName} because it doesn't have any nested fields.`)
      delete fields[fieldId]
    }
    if (fieldData.fields) {
      checkObjectsHaveFields.call(this, fieldData.fields, entityTypeName)
    }
  })
}

/**
 * Register Panacea field type definitions.
 *
 * @private
 */
function registerFieldTypes (this: IEntityTypes) : void {
  const fieldTypes: FieldTypes = {}
  const fieldsMapMongo: FieldMap = new Map()
  const fieldsMapGraphQL: FieldMap = new Map()

  hooks.invoke('core.entityTypes.fields.definitions', { fieldTypes })
  hooks.invoke('core.entityTypes.fields.mapMongo', { fieldsMapMongo })
  hooks.invoke('core.entityTypes.fields.mapGraphQL', { fieldsMapGraphQL })

  this.fieldTypes = fieldTypes
  this.fieldsMapMongo = fieldsMapMongo
  this.fieldsMapGraphQL = fieldsMapGraphQL
}

/**
 * Entity type validator for required base properties on the entity type.
 *
 * @private
 */
function validateRequiredProperties (this: IEntityTypes, entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save') : void {
  if (_(entityTypeData.fields).isEmpty()) this.addError(entityTypeData, TypeError(`Fields do not exist on entity type: ${entityTypeName}`))
  if (_(entityTypeData.plural).isEmpty()) this.addError(entityTypeData, TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`))
  if (_(entityTypeData.storage).isEmpty()) this.addError(entityTypeData, TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`))
}

/**
 * Entity type field validator to ensure field can be parsed as expected by Panacea.
 *
 * @private
 */
function validateRequiredFields (this: IEntityTypes, entityTypeData: EntityType, entityTypeName: string, action: 'load' | 'save', fields: EntityTypeFields) : void {
  _(fields).forEach((field: EntityTypeField, fieldName: string) => {
    // Validate field contains all the required attributes.
    if (_(field).isEmpty()) this.addError(entityTypeData, TypeError(`Field ${fieldName} configuration is empty`))
    if (_(field.type).isEmpty()) this.addError(entityTypeData, TypeError(`Field type not defined for ${fieldName}`))
    if (this.fieldTypes[field.type] === undefined) this.addError(entityTypeData, TypeError(`Field type ${field.type} is invalid for ${fieldName}`))
    if (_(field.label).isEmpty()) this.addError(entityTypeData, TypeError(`Field label not defined for ${fieldName}`))

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to append output to the fields key.
      // This allows for unlimited nesting of defined fields.
      validateRequiredFields.call(this, entityTypeData, entityTypeName, action, field.fields)
    }
  })
}

const entityTypes = new (EntityTypes as any)()

export { entityTypes }
