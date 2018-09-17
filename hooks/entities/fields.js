// @flow
export default {
  register (hooks: events$EventEmitter) {
    hooks.on('core.entityTypes.fields.definitions', ({ fieldTypes } : { fieldTypes: FieldTypes }) => {
      fieldTypes.id = {
        label: 'core.entityTypes.fields.id.label',
        description: 'core.entityTypes.fields.id.description'
      }
      fieldTypes.string = {
        label: 'core.entityTypes.fields.string.label',
        description: 'core.entityTypes.fields.string.description'
      }
      fieldTypes.password = {
        label: 'core.entityTypes.fields.password.label',
        description: 'core.entityTypes.fields.password.description'
      }
      fieldTypes.text = {
        label: 'core.entityTypes.fields.text.label',
        description: 'core.entityTypes.fields.text.description'
      }
      fieldTypes.float = {
        label: 'core.entityTypes.fields.float.label',
        description: 'core.entityTypes.fields.float.description'
      }
      fieldTypes.int = {
        label: 'core.entityTypes.fields.int.label',
        description: 'core.entityTypes.fields.int.description'
      }
      fieldTypes.boolean = {
        label: 'core.entityTypes.fields.boolean.label',
        description: 'core.entityTypes.fields.boolean.description'
      }
      fieldTypes.reference = {
        label: 'core.entityTypes.fields.reference.label',
        description: 'core.entityTypes.fields.reference.description'
      },
      fieldTypes.object = {
        label: 'core.entityTypes.fields.object.label',
        description: 'core.entityTypes.fields.object.description'
      }
    })

    hooks.on('core.mongo.fieldsMap', ({ map } : { map: FieldMap }) => {
      map.set('string', 'String')
      map.set('password', 'String')
      map.set('text', 'String')
      map.set('float', 'Number')
      map.set('int', 'Number')
      map.set('boolean', 'Number')
      map.set('reference', 'String')
      // Objects are for nested data.
      map.set('object', 'Object')
    })

    hooks.on('core.graphql.fieldsMap', ({ map } : { map: FieldMap }) => {
      map.set('id', 'String')
      map.set('string', 'String')
      map.set('password', 'String')
      map.set('text', 'String')
      map.set('float', 'Float')
      map.set('int', 'Int')
      map.set('boolean', 'Boolean')
      map.set('reference', 'String')
      // objects are for nested data.
      map.set('object', '__NestedObject')
    })
  }
}
