"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, i18n, GraphQLScalarType } = Panacea.container;
exports.default = {
    register(hooks) {
        hooks.once('core.graphql.definitions.scalars', ({ scalars }) => {
            scalars.push('Date');
        });
        hooks.on('core.entityTypes.fields.definitions', ({ fieldTypes }) => {
            fieldTypes.date = {
                label: 'core.entityTypes.fields.date.label',
                description: 'core.entityTypes.fields.date.description'
            };
        });
        hooks.on('core.entityTypes.fields.mapMongo', ({ fieldsMapMongo }) => {
            fieldsMapMongo.set('date', 'Date');
        });
        hooks.on('core.entityTypes.fields.mapGraphQL', ({ fieldsMapGraphQL }) => {
            fieldsMapGraphQL.set('date', 'Date');
        });
        hooks.once('core.graphql.resolvers', ({ resolvers }) => {
            resolvers.Date = new GraphQLScalarType({
                name: 'Date',
                description: 'ISO8601 Date value',
                serialize: value => value,
                parseValue: value => value,
                parseLiteral(ast) {
                    return null;
                }
            });
        });
        hooks.once('core.entityTypes.definitions', ({ definitions }) => {
            const dateFields = ['created', 'updated', 'deleted'];
            _(definitions).forEach((entityType) => {
                dateFields.forEach(dateFieldName => {
                    entityType.fields[`_${dateFieldName}`] = {
                        type: 'date',
                        label: i18n.t(`core.entityTypes.dates.${dateFieldName}.label`),
                        description: i18n.t(`core.entityTypes.dates.${dateFieldName}.description`),
                        index: true
                    };
                });
            });
        });
        hooks.once('core.entity.createHandlers', ({ transactionHandlers }) => {
            const datesCreateHandler = {
                prepare: async function (txn) {
                    const { args } = txn.context;
                    args.fields._created = Date.now();
                }
            };
            transactionHandlers.push(datesCreateHandler);
        });
        hooks.on('core.entity.resolverQueryResult', ({ queryResult }) => {
        });
    }
};
//# sourceMappingURL=dates.js.map