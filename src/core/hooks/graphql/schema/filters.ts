import { IHooks } from '../../../../utils/hooks';

const { _ } = Panacea.container

const definitions = {
  inputs: {
    QueryParams: {
      comment: 'Limit the number of returned results',
      name: `QueryParams`,
      fields: {
        limit: {
          comment: 'Limit the number of returned results',
          value: 'limit: Int = 100'
        },
        sortBy: {
          comment: 'Sort by field',
          value: 'sortBy: String'
        },
        sortDirection: {
          comment: 'Direction of sort',
          value: 'sortDirection: _sortDirections = ASC'
        }
      }
    }
  },
  enums: {
    _sortDirections: {
      comment: 'Ascending/Descending sort order values',
      name: '_sortDirections',
      items: [
        { comment: 'Ascending', value: 'ASC' },
        { comment: 'Descending', value: 'DESC' }
      ]
    }
  }
}

export default {
  register (hooks: IHooks) {
    hooks.on('core.graphql.definitions.inputs', ({ inputs }) => {
      _.merge(inputs, definitions.inputs)
    })
    hooks.on('core.graphql.definitions.enums', ({ enums }) => {
      _.merge(enums, definitions.enums)
    })
  }
}
