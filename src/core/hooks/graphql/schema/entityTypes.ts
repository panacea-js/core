import { IHooks } from '../../../../utils/hooks'

const { _ } = Panacea.container

const definitions = {
  types: {
    _entityType: {
      comment: 'A panacea entity type',
      name: '_entityType',
      fields: {
        name: {
          comment: 'The entity type name',
          value: 'name: String!'
        },
        data: {
          comment: 'The JSON structure of the entity schema',
          value: 'data: String!'
        }
      }
    },
    _fieldType: {
      comment: 'A panacea field type',
      name: '_fieldType',
      fields: {
        type: {
          comment: 'The field type',
          value: 'type: String!'
        },
        label: {
          comment: 'The field label',
          value: 'label: String!'
        },
        description: {
          comment: 'The field description',
          value: 'description: String!'
        }
      }
    }
  },
  queries: {
    _entityTypes: {
      all: {
        comment: 'Get all panacea entity schemas',
        name: '_entityTypes',
        returnType: '[_entityType]'
      },
      single: {
        comment: 'Get a single panacea entity schema',
        name: '_entityType',
        arguments: {
          name: 'String!'
        },
        returnType: '_entityType'
      }
    },
    _fieldTypes: {
      all: {
        comment: 'Get all panacea field types',
        name: '_fieldTypes',
        returnType: '[_fieldType]'
      }
    }
  },
  mutations: {
    _entityType: {
      create: {
        comment: 'Create or replace panacea entity type',
        name: '_createEntityType',
        arguments: {
          name: 'String!',
          data: 'String!',
          locationKey: 'String'
        },
        returnType: '_entityType!'
      }
    }
  }
}

export default {
  register (hooks: IHooks) {
    hooks.on('core.graphql.definitions.types', ({ types }) => {
      _.merge(types, definitions.types)
    })
    hooks.on('core.graphql.definitions.queries', ({ queries }) => {
      _.merge(queries, definitions.queries)
    })
    hooks.on('core.graphql.definitions.mutations', ({ mutations }) => {
      _.merge(mutations, definitions.mutations)
    })
  }
}
