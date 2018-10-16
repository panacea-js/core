"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, entityTypes, mongoose, dbConnection } = Panacea.container;
const compileNestedObjects = function (field) {
    let fieldDefinition = {};
    if (field.type !== 'id') {
        if (field.type === 'object' && field.fields) {
            let nestedFieldDefinition = {};
            const nestedFields = _(field.fields).map((nestedField, fieldName) => {
                const compiledNestedObject = compileNestedObjects(nestedField);
                if (typeof compiledNestedObject !== 'undefined') {
                    nestedFieldDefinition[fieldName] = compiledNestedObject;
                }
                return nestedFieldDefinition;
            }).value()[0];
            fieldDefinition = {
                type: field.many && !field.fields ? [nestedFields] : nestedFields,
                index: !!field.index
            };
            return fieldDefinition;
        }
        fieldDefinition = {
            type: field.many ? [entityTypes.convertFieldTypeToMongo(field.type)] : entityTypes.convertFieldTypeToMongo(field.type),
            index: !!field.index
        };
        return fieldDefinition;
    }
};
const addEntityTypeModels = function ({ models }) {
    const db = dbConnection;
    const entityTypeDefinitions = entityTypes.getData();
    _(entityTypeDefinitions).forEach((entityTypeData, entityTypeName) => {
        if (entityTypeData.storage !== 'db')
            return;
        const definedFields = _(entityTypeData.fields).reduce((acc, field, fieldId) => {
            if (field.type !== 'id') {
                const compiledNestedObject = compileNestedObjects(field);
                if (typeof compiledNestedObject !== 'undefined') {
                    acc[fieldId] = compiledNestedObject;
                }
            }
            return acc;
        }, {});
        const schema = new mongoose.Schema(definedFields);
        delete db.models[entityTypeName];
        models[entityTypeName] = db.model(entityTypeName, schema);
    });
};
const entityCreateHandler = {
    operation: async function (txn) {
        const { entityData, dbModels, args } = txn.context;
        const EntityModel = dbModels[entityData._meta.pascal];
        const entity = await new EntityModel(args.fields).save();
        txn.context.createdEntity = entity;
    }
};
exports.default = {
    register(hooks) {
        hooks.on('core.entity.createHandlers', ({ transactionHandlers }) => {
            transactionHandlers.push(entityCreateHandler);
        });
        hooks.on('core.mongo.models', ({ models }) => {
            addEntityTypeModels({ models });
        });
    }
};
//# sourceMappingURL=entities.js.map