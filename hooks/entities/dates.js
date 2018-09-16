// @flow
const { _, i18n, GraphQLScalarType } = Panacea.container

export default {
  register (hooks: events$EventEmitter) {
    hooks.once('core.graphql.definitions.scalars', ({ scalars }) => {
      scalars.push('Date')
    })

    hooks.on('core.mongo.fieldsMap', ({ map }) => {
      map.set('date', 'Date')
    })

    hooks.on('core.graphql.fieldsMap', ({ map }) => {
      map.set('date', 'Date')
    })

    hooks.once('core.graphql.resolvers', ({ resolvers }) => {
      resolvers.Date = new GraphQLScalarType({
        name: 'Date',
        description: 'ISO8601 Date value',
        serialize: value => value,
        parseValue: value => value,
        parseLiteral (ast) {
          return null
        }
      })
    })

    hooks.once('core.entities.definitions', (entityTypes: EntityTypes) => {
      const dateFields = ['created', 'updated', 'deleted']

      _(entityTypes).forEach((entityType: EntityType, entityTypeName: string) => {
        dateFields.forEach(dateFieldName => {
          entityType.fields[`_${dateFieldName}`] = {
            type: 'date',
            label: i18n.t(`core.entities.dates.${dateFieldName}.label`), // Created, Updated, Deleted
            description: i18n.t(`core.entities.dates.${dateFieldName}.description`), // The datetime that the entity was created, updated, deleted
            index: true
          }
        })
      })
    })

    hooks.once('core.entities.entityCreateHandlers', ({ transactionHandlers } : { transactionHandlers: Array<transactionHandler> }) => {
      const datesCreateHandler = {
        prepare: async function (txn) {
          const { args } = txn.context
          args.fields._created = Date.now()
        }
      }

      transactionHandlers.push(datesCreateHandler)
    })

    hooks.on('core.entities.resolverQueryResult', ({ queryResult }) => {
      // console.log(queryResult)
    })
  }
}
