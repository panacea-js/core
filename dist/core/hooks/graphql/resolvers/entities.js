"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, log, hooks, entityTypes, Transaction, modelQuery } = Panacea.container;
const resolveNestedFields = function (types, currentType, fields) {
    _(fields).forEach((field, fieldName) => {
        if (field.type === 'object' && field.fields) {
            resolveNestedFields(types, `${currentType}_${fieldName}`, field.fields);
        }
        if (field.type === 'reference') {
            types[currentType] = types[currentType] || {};
            types[currentType][fieldName] = function (sourceDocument, args, { dbModels }) {
                if (!field.references || !dbModels[field.references]) {
                    return;
                }
                if (field.many) {
                    let targetEntities = [];
                    sourceDocument[fieldName].map((targetId) => {
                        field.references && targetEntities.push(dbModels[field.references].findById(targetId));
                    });
                    return targetEntities;
                }
                return dbModels[field.references].findById(sourceDocument[fieldName]);
            };
        }
    });
};
const ensureDocumentHasDefaultValues = function (fields, documentPartial) {
    _(fields).forEach((field, fieldId) => {
        if (field.fields && documentPartial[fieldId]) {
            ensureDocumentHasDefaultValues(field.fields, documentPartial[fieldId]);
        }
        if (field.required && _.isEmpty(documentPartial[fieldId])) {
            if (field.default) {
                documentPartial[fieldId] = field.default;
                return;
            }
            if (['int', 'float', 'boolean'].includes(field.type)) {
                documentPartial[fieldId] = 0;
                return;
            }
            documentPartial[fieldId] = '';
        }
    });
};
const entityResolvers = function (resolvers) {
    const types = {};
    const definitions = entityTypes.getData();
    _(definitions).forEach((entityData) => {
        if (entityData._excludeGraphQL) {
            resolveNestedFields(types, entityData._meta.pascal, entityData.fields);
            return;
        }
        types[entityData._meta.pascal] = {};
        const hasFields = Object.keys(entityData.fields).length > 1;
        resolvers.Query[entityData._meta.camel] = async (parent, args, { dbModels }) => {
            let document = {};
            let error;
            await dbModels[entityData._meta.pascal].findById(args.id).exec()
                .then(doc => {
                document = doc;
            })
                .catch(err => {
                error = err;
            });
            if (error) {
                return error;
            }
            ensureDocumentHasDefaultValues(entityData.fields, document);
            hooks.invoke('core.entity.resolvedQuery', {
                query: entityData._meta.camel,
                parent,
                args,
                dbModels,
                document
            });
            return document;
        };
        resolvers.Query[entityData._meta.pluralCamel] = async (parent, args, { dbModels }) => {
            let documents = [];
            let error;
            await modelQuery(dbModels[entityData._meta.pascal], parent, args).exec()
                .then((docs) => {
                documents = docs;
            })
                .catch((err) => {
                error = err;
            });
            if (error) {
                return error;
            }
            documents.forEach(document => ensureDocumentHasDefaultValues(entityData.fields, document));
            hooks.invoke('core.entity.resolvedQuery', {
                query: entityData._meta.pluralCamel,
                parent,
                args,
                dbModels,
                documents
            });
            return documents;
        };
        if (hasFields) {
            resolvers.Mutation[`create${entityData._meta.pascal}`] = async (parent, args, { dbModels }) => {
                const transactionContext = {
                    parent,
                    args,
                    dbModels,
                    entityType: entityData._meta.pascal,
                    entityData
                };
                const transactionHandlers = [];
                hooks.invoke('core.entity.createHandlers', { transactionHandlers });
                return new Transaction(transactionHandlers, transactionContext).execute()
                    .then((txn) => {
                    if (txn.status === 'complete') {
                        const createdEntity = txn.context.createdEntity;
                        createdEntity._id = createdEntity._id.toString();
                        return createdEntity;
                    }
                    return txn.error;
                })
                    .catch(error => log.error(error));
            };
            resolvers.Mutation[`delete${entityData._meta.pascal}`] = (parent, args, { dbModels }) => {
                return new Promise((resolve, reject) => {
                    dbModels[entityData._meta.pascal].findById(args.id).exec((err, entity) => {
                        if (err) {
                            return err;
                        }
                        if (entity === null) {
                            return new Error(`Cannot find ${entityData._meta.camel} with id: ${args.id}`);
                        }
                        entity.remove().then(() => {
                            resolve(args.id);
                        }).catch(function (error) {
                            const errorMessage = `Could not delete ${entityData._meta.camel} with ID ${args.id}. Error message: ${error}`;
                            log.error(errorMessage);
                            reject(errorMessage);
                        });
                    });
                });
            };
        }
        resolveNestedFields(types, entityData._meta.pascal, entityData.fields);
    });
    for (const type in types) {
        resolvers[type] = types[type];
    }
};
exports.default = {
    register(hooks) {
        hooks.on('core.graphql.resolvers', ({ resolvers }) => {
            entityResolvers(resolvers);
        });
    }
};
//# sourceMappingURL=entities.js.map