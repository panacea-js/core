// @flow
const { _, i18n, GraphQLScalarType } = Panacea.container

export default {
  register (hooks: events$EventEmitter) {
    hooks.once('core.graphql.definitions.scalars', ({ scalars } : { scalars: Array<string> }) => {
      scalars.push('Date')
    })

    hooks.on('core.entityTypes.fields.definitions', ({ fieldTypes } : { fieldTypes: FieldTypes }) => {
      fieldTypes.date = {
        label: 'core.entityTypes.fields.date.label',
        description: 'core.entityTypes.fields.date.description'
      }
    })

    hooks.on('core.entityTypes.fields.mapMongo', ({ fieldsMapMongo } : { fieldsMapMongo: FieldMap }) => {
      fieldsMapMongo.set('date', 'Date')
    })

    hooks.on('core.entityTypes.fields.mapGraphQL', ({ fieldsMapGraphQL } : { fieldsMapGraphQL: FieldMap }) => {
      fieldsMapGraphQL.set('date', 'Date')
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

    hooks.once('core.entityTypes.definitions', ({ definitions } : { definitions: EntityTypes }) => {
      const dateFields = ['created', 'updated', 'deleted']

      _(definitions).forEach((entityType: EntityType, entityTypeName: string) => {
        dateFields.forEach(dateFieldName => {
          entityType.fields[`_${dateFieldName}`] = {
            type: 'date',
            label: i18n.t(`core.entityTypes.dates.${dateFieldName}.label`), // Created, Updated, Deleted
            description: i18n.t(`core.entityTypes.dates.${dateFieldName}.description`), // The datetime that the entity was created, updated, deleted
            index: true
          }
        })
      })
    })

    hooks.once('core.entity.createHandlers', ({ transactionHandlers } : { transactionHandlers: Array<transactionHandler> }) => {
      const datesCreateHandler = {
        prepare: async function (txn) {
          const { args } = txn.context
          args.fields._created = Date.now()
        }
      }

      transactionHandlers.push(datesCreateHandler)
    })

    hooks.on('core.entity.resolverQueryResult', ({ queryResult }) => {
      // console.log(queryResult)
    })
  }
}
