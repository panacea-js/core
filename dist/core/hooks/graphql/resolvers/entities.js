"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, log, hooks, entityTypes, Transaction, modelQuery } = Panacea.container;
const resolveNestedFieldTypes = function (types, currentType, fields) {
    _(fields).forEach((field, fieldName) => {
        if (field.type === 'object' && field.fields) {
            resolveNestedFieldTypes(types, `${currentType}_${fieldName}`, field.fields);
        }
        if (field.type === 'reference') {
            types[currentType] = types[currentType] || {};
            types[currentType][fieldName] = function (sourceDocument, args, { dbModels }) {
                if (!field.references) {
                    return;
                }
                if (field.many) {
                    let targetEntities = [];
                    sourceDocument[fieldName].map((target) => {
                        const [targetEntityType, targetId] = target.split('|');
                        if (!dbModels[targetEntityType]) {
                            return;
                        }
                        const targetEntity = dbModels[targetEntityType].findById(targetId);
                        targetEntities.push(targetEntity);
                    });
                    return targetEntities.filter(x => !!x);
                }
                const [targetEntityType, targetId] = sourceDocument[fieldName].split('|');
                if (!dbModels[targetEntityType]) {
                    return;
                }
                const targetEntity = dbModels[targetEntityType].findById(targetId);
                return targetEntity;
            };
        }
    });
};
const resolveInputArguments = async function (args, context, currentArgsIndex, fields, resolvers, entityTypeDefinitions) {
    for (const fieldName of Object.keys(fields)) {
        const field = fields[fieldName];
        if (field.type === 'object' && field.fields) {
            await resolveInputArguments(args, context, [...currentArgsIndex, fieldName], field.fields, resolvers, entityTypeDefinitions);
        }
        if (field.type === 'reference') {
            let argData = _.get(args, [...currentArgsIndex, fieldName]);
            if (argData) {
                if (!field.many) {
                    argData = [argData];
                }
                const referenceDefinitions = argData;
                for (const referenceItemIndex in referenceDefinitions) {
                    const referencedItemData = referenceDefinitions[referenceItemIndex];
                    if (referencedItemData.existing && referencedItemData.existing.entityType && referencedItemData.existing.entityId) {
                        const value = `${referencedItemData.existing.entityType}|${referencedItemData.existing.entityId}`;
                        if (field.many) {
                            _.set(args, [...currentArgsIndex, fieldName, referenceItemIndex], value);
                            continue;
                        }
                        _.set(args, [...currentArgsIndex, fieldName], value);
                        continue;
                    }
                    const action = Object.keys(referencedItemData).length > 0 ? Object.keys(referencedItemData)[0] : null;
                    if (action && resolvers.Mutation && resolvers.Mutation[action] && typeof resolvers.Mutation[action] === 'function') {
                        const actionWords = action.match(/[A-Z]?[a-z]+/g) || [];
                        const actionType = actionWords[0];
                        actionWords.shift();
                        const referencedEntityType = actionWords.join('');
                        const referencedEntityContext = _.cloneDeep(context);
                        referencedEntityContext.entityType = referencedEntityType;
                        referencedEntityContext.entityTypeData = entityTypeDefinitions[referencedEntityType];
                        const processedEntity = await resolvers.Mutation[action].apply(null, [null, referencedItemData[action], referencedEntityContext]);
                        if (actionType === 'create' || actionType === 'update') {
                            const storedReferenceValue = `${referencedEntityType}|${processedEntity._id}`;
                            if (field.many) {
                                _.set(args, [...currentArgsIndex, fieldName, referenceItemIndex], storedReferenceValue);
                                continue;
                            }
                            _.set(args, [...currentArgsIndex, fieldName], storedReferenceValue);
                            continue;
                        }
                    }
                    if (field.many) {
                        _.unset(args, [...currentArgsIndex, fieldName, referenceItemIndex]);
                    }
                    _.unset(args, [...currentArgsIndex, fieldName]);
                }
            }
        }
    }
};
const ensureDocumentHasDefaultValues = function (fields, documentPartial) {
    const applyDefaultValues = function (item, field, fieldId) {
        if (field.required && _.isEmpty(item[fieldId])) {
            if (field.default) {
                item[fieldId] = field.default;
                return;
            }
            if (['int', 'float', 'boolean'].includes(field.type)) {
                item[fieldId] = 0;
                return;
            }
            item[fieldId] = '';
        }
    };
    _(fields).forEach((field, fieldId) => {
        if (field.fields && documentPartial[fieldId]) {
            ensureDocumentHasDefaultValues(field.fields, documentPartial[fieldId]);
        }
        if (Array.isArray(documentPartial)) {
            documentPartial.forEach(item => applyDefaultValues(item, field, fieldId));
            return;
        }
        applyDefaultValues(documentPartial, field, fieldId);
    });
};
const entityResolvers = function (resolvers) {
    const types = {};
    const definitions = entityTypes.getData();
    _(definitions).forEach((entityData) => {
        if (entityData._excludeGraphQL) {
            resolveNestedFieldTypes(types, entityData._meta.pascal, entityData.fields);
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
            resolvers.Mutation[`create${entityData._meta.pascal}`] = async (parent, args, context) => {
                if (!args.fields) {
                    args = { fields: args };
                }
                const transactionContext = {
                    parent,
                    args,
                    dbModels: context.dbModels,
                    entityType: context.entityType ? context.entityType : entityData._meta.pascal,
                    entityData: context.entityData ? context.entityData : entityData
                };
                await resolveInputArguments(args, context, ['fields'], entityData.fields, resolvers, definitions);
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
        resolveNestedFieldTypes(types, entityData._meta.pascal, entityData.fields);
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