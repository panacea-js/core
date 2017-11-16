const Entities = function () {
  this.entityTypes = {}
}

Entities.prototype.validateRequiredFields = function (fields) {
  const { _ } = DI.container

  _(fields).forEach((field, fieldName) => {
    // Validate field contains all the required attributes.
    if (_(field).isEmpty()) throw TypeError(`Field ${fieldName} configuration is empty`)
    if (_(field.type).isEmpty()) throw TypeError(`Field type not defined for ${fieldName}`)
    if (_(field.label).isEmpty()) throw TypeError(`Field label not defined for ${fieldName}`)

    // Provide field names as camel case so as not to interfere with
    // the underscores used to identify the entity/field object nesting hierarchy.
    field._meta = {
      camel: _(fieldName).camelCase()
    }

    field.description = field.description || ''

    if (field.type === 'object' && field.hasOwnProperty('fields')) {
      // Recurse this function to append output to the fields key.
      // This allows for unlimited nesting of defined fields.
      this.validateRequiredFields(field.fields)
    }
  })
}

Entities.prototype.getData = function (entityPaths) {
  const { _, loadYmlFiles, hooks } = DI.container

  // Ensure that the filesystem is only hit once.
  if (_(this.entityTypes).isEmpty()) {
    entityPaths.map((entitiesPath) => {
      const fileEntities = loadYmlFiles(entitiesPath)
      _.extend(this.entityTypes, fileEntities)
    })
  }

  hooks.invoke('core.entities', this.entityTypes)

  if (_(this.entityTypes).isEmpty()) throw TypeError(`No entity types found`)

  _(this.entityTypes).forEach((entityTypeData, entityTypeName) => {
    if (_(entityTypeData).isEmpty()) throw TypeError(`No data is set on entity type: ${entityTypeName}`)
    if (_(entityTypeData.fields).isEmpty()) throw TypeError(`Fields do not exist on entity type: ${entityTypeName}`)

    entityTypeData.description = entityTypeData.description || ''

    this.entityTypes[entityTypeName]._meta = {
      camel: _.camelCase(entityTypeName),
      pascal: _.upperFirst(_.camelCase(entityTypeName)),
      descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
      pluralCamel: _.camelCase(entityTypeData.plural)
    }

    this.validateRequiredFields(entityTypeData.fields)
  })

  return this.entityTypes
}

const entities = new Entities()

export { entities }
