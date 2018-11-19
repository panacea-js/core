"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, entityTypes } = Panacea.container;
const translateEntityTypeFields = function (fields, prefixes) {
    let output = {
        refsAsStrings: {},
        refsAsModels: {}
    };
    _(fields).forEach((field, _fieldName) => {
        Object.keys(output).forEach((refType) => {
            if (!field._meta) {
                return;
            }
            if (field._excludeGraphQLInput && refType === 'refsAsStrings') {
                return;
            }
            let fieldType;
            if (field.type === 'reference' && typeof field.references !== 'undefined') {
                const referenceType = field.references.length > 1 ? `UnionType_${prefixes.join('_')}_${_fieldName}` : field.references.sort().join('');
                const referenceInput = `UnionInput_${prefixes.join('_')}_${_fieldName}`;
                fieldType = (refType === 'refsAsStrings') ? referenceInput : referenceType;
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
                output[refType][field._meta.camel].fields = translateEntityTypeFields(field.fields, [...prefixes, _fieldName]);
            }
        });
    });
    return output;
};
const discoverUnionTypes = function (fields, prefixes, unionTypes) {
    _(fields).forEach((field, _fieldName) => {
        if (field.type === 'reference') {
            if (Array.isArray(field.references)) {
                const references = field.references.sort();
                if (field.references.length > 1) {
                    const unionTypeName = `UnionType_${prefixes.join('_')}_${_fieldName}`;
                    if (typeof unionTypes[unionTypeName] === 'undefined') {
                        unionTypes[unionTypeName] = references;
                    }
                }
            }
        }
        if (field.type === 'object' && field.fields) {
            discoverUnionTypes(field.fields, [...prefixes, _fieldName], unionTypes);
        }
    });
    return unionTypes;
};
const discoverReferenceInputTypes = function (fields, prefixes, inputs) {
    _(fields).forEach((field, _fieldName) => {
        if (field.type === 'reference') {
            if (Array.isArray(field.references) && !field._excludeGraphQLInput) {
                const references = field.references.sort();
                const nestedCreate = references.reduce((acc, reference) => {
                    acc[`create${reference}`] = {
                        comment: `Fields to create on a new ${reference} and attach reference to this entity`,
                        value: `create${reference}: ${reference}Input`,
                    };
                    return acc;
                }, {});
                const nestedUpdate = references.reduce((acc, reference) => {
                    acc[`update${reference}`] = {
                        comment: `Entity ID and fields to update on an existing ${reference} reference`,
                        value: `update${reference}: ${reference}Input`,
                    };
                    return acc;
                }, {});
                const nestedDelete = references.reduce((acc, reference) => {
                    acc[`delete${reference}`] = {
                        comment: `Entity ID to delete on an existing ${reference} reference. This will not only remove the reference but also delete the referenced entity.`,
                        value: `delete${reference}: ${reference}Input`,
                    };
                    return acc;
                }, {});
                const nestedRemove = references.reduce((acc, reference) => {
                    acc[`remove${reference}`] = {
                        comment: `Entity ID to remove on an existing ${reference} reference. This will not delete the referenced entity itself, only the reference to it.`,
                        value: `remove${reference}: ${reference}Input`,
                    };
                    return acc;
                }, {});
                const inputName = `UnionInput_${prefixes.join('_')}_${_fieldName}`;
                inputs[inputName] = {
                    comment: `Input type for ${prefixes.join('_')}_${_fieldName}`,
                    name: inputName,
                    fields: Object.assign({ existing: {
                            comment: 'A new reference to and existing entity',
                            value: 'existing: ExistingReference'
                        } }, nestedCreate, nestedUpdate, nestedDelete, nestedRemove)
                };
            }
        }
        if (field.type === 'object' && field.fields) {
            discoverReferenceInputTypes(field.fields, [...prefixes, _fieldName], inputs);
        }
    });
};
function getGraphQLSchemaDefinitions() {
    const definitions = {
        types: {},
        unionTypes: {},
        inputs: {},
        queries: {},
        mutations: {}
    };
    definitions.inputs['ExistingReference'] = {
        comment: `Attach an existing entity as a reference`,
        name: 'ExistingReference',
        fields: {
            entityType: {
                comment: 'The entity type of the referenced entity',
                value: 'entityType: String'
            },
            entityId: {
                comment: 'The entity ID of the referenced entity',
                value: 'entityId: String'
            }
        }
    };
    const entityTypeDefinitions = entityTypes.getData();
    _(entityTypeDefinitions).forEach((entityTypeData, entityTypeName) => {
        const definedFields = translateEntityTypeFields(entityTypeData.fields, [entityTypeName]);
        const entityTypePascal = entityTypeData._meta.pascal;
        const camel = entityTypeData._meta.camel;
        const pluralCamel = entityTypeData._meta.pluralCamel;
        definitions.types[entityTypePascal] = {
            comment: `${entityTypePascal} entity type. ${entityTypeData.description}`,
            name: entityTypePascal,
            fields: definedFields.refsAsModels
        };
        discoverUnionTypes(entityTypeData.fields, [entityTypeName], definitions.unionTypes);
        discoverReferenceInputTypes(entityTypeData.fields, [entityTypeName], definitions.inputs);
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
}
exports.default = {
    register(hooks) {
        let definitions;
        hooks.on('core.graphql.definitions.types', ({ types }) => {
            definitions = getGraphQLSchemaDefinitions();
            _.merge(types, definitions.types);
        });
        hooks.on('core.graphql.definitions.unionTypes', ({ unionTypes }) => {
            _.merge(unionTypes, definitions.unionTypes);
        });
        hooks.on('core.graphql.resolvers', ({ resolvers }) => {
            Object.keys(definitions.unionTypes).forEach(unionType => {
                resolvers[unionType] = {
                    __resolveType(obj) {
                        return obj.collection.name;
                    }
                };
            });
        });
        hooks.on('core.graphql.definitions.inputs', ({ inputs }) => {
            _.merge(inputs, definitions.inputs);
        });
        hooks.on('core.graphql.definitions.queries', ({ queries }) => {
            _.merge(queries, definitions.queries);
        });
        hooks.on('core.graphql.definitions.mutations', ({ mutations }) => {
            _.merge(mutations, definitions.mutations);
        });
    }
};
//# sourceMappingURL=entities.js.map