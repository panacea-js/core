"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, entityTypes } = Panacea.container;
const translateEntityTypeFields = function (fields) {
    let output = {
        refsAsStrings: {},
        refsAsModels: {}
    };
    _(fields).forEach((field, _fieldName) => {
        Object.keys(output).forEach((refType) => {
            if (!field._meta) {
                return;
            }
            let fieldType;
            if (field.type === 'reference') {
                fieldType = (refType === 'refsAsStrings') ? 'String' : field.references;
            }
            else {
                fieldType = entityTypes.convertFieldTypeToGraphQL(field.type);
            }
            field.required && (fieldType = `${fieldType}!`);
            field.many && (fieldType = `[${fieldType}]`);
            output[refType][field._meta.camel] = {
                comment: field.description,
                value: `${field._meta.camel}: ${fieldType}`
            };
            if (field.type === 'object' && field.fields) {
                output[refType][field._meta.camel].fields = translateEntityTypeFields(field.fields);
            }
        });
    });
    return output;
};
const getDefinitions = function () {
    const entityTypeDefinitions = entityTypes.getData();
    const definitions = {
        types: {},
        inputs: {},
        queries: {},
        mutations: {}
    };
    _(entityTypeDefinitions).forEach((entityTypeData) => {
        const definedFields = translateEntityTypeFields(entityTypeData.fields);
        const entityTypePascal = entityTypeData._meta.pascal;
        const camel = entityTypeData._meta.camel;
        const pluralCamel = entityTypeData._meta.pluralCamel;
        definitions.types[entityTypePascal] = {
            comment: `${entityTypePascal} entity type. ${entityTypeData.description}`,
            name: entityTypePascal,
            fields: definedFields.refsAsModels
        };
        if (entityTypeData._excludeGraphQL) {
            return;
        }
        const inputFields = definedFields.refsAsStrings;
        delete inputFields.id;
        const countFields = Object.keys(inputFields).length;
        if (countFields > 0) {
            definitions.inputs[`${entityTypePascal}Input`] = {
                comment: `Input type for ${entityTypePascal}`,
                name: `${entityTypePascal}Input`,
                fields: inputFields
            };
            definitions.mutations[entityTypePascal] = {
                create: {
                    comment: `Create a ${entityTypePascal} entity`,
                    name: `create${entityTypePascal}`,
                    arguments: {
                        fields: `${entityTypePascal}Input`
                    },
                    returnType: `${entityTypePascal}!`
                },
                update: {
                    comment: `Partially update selected fields on a ${entityTypePascal}`,
                    name: `update${entityTypePascal}`,
                    arguments: {
                        id: `String!`,
                        fields: `${entityTypePascal}Input`
                    },
                    returnType: `${entityTypePascal}!`
                },
                replace: {
                    comment: `Replace a ${entityTypePascal} entity with the defined fields - existing data will be overwritten or deleted`,
                    name: `replace${entityTypePascal}`,
                    arguments: {
                        id: `String!`,
                        fields: `${entityTypePascal}Input`
                    },
                    returnType: `${entityTypePascal}!`
                },
                delete: {
                    comment: `Delete a ${entityTypePascal} entity`,
                    name: `delete${entityTypePascal}`,
                    arguments: {
                        id: `String!`
                    },
                    returnType: `String`
                }
            };
        }
        definitions.queries[entityTypePascal] = {
            all: {
                comment: `Get all ${entityTypeData.plural}.`,
                name: pluralCamel,
                arguments: {
                    params: `QueryParams`
                },
                returnType: `[${entityTypePascal}!]`
            },
            single: {
                comment: `Get a single ${entityTypePascal}`,
                name: camel,
                arguments: {
                    id: `String!`
                },
                returnType: `${entityTypePascal}`
            }
        };
    });
    return definitions;
};
exports.default = {
    register(hooks) {
        hooks.on('core.graphql.definitions.types', ({ types }) => {
            const definitions = getDefinitions();
            _.merge(types, definitions.types);
        });
        hooks.on('core.graphql.definitions.inputs', ({ inputs }) => {
            const definitions = getDefinitions();
            _.merge(inputs, definitions.inputs);
        });
        hooks.on('core.graphql.definitions.queries', ({ queries }) => {
            const definitions = getDefinitions();
            _.merge(queries, definitions.queries);
        });
        hooks.on('core.graphql.definitions.mutations', ({ mutations }) => {
            const definitions = getDefinitions();
            _.merge(mutations, definitions.mutations);
        });
    }
};
//# sourceMappingURL=entities.js.map