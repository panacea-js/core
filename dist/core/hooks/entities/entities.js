"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, entityTypes, mongoose, dbConnection } = Panacea.container;
/**
 * Evaluates and recurses an entity type's field definition resolving to a
 * Mongoose schema field definition.
 */
const compileNestedObjects = function (field) {
    let fieldDefinition = {};
    // Skip native _id mapping as this is internal to MongoDB.
    if (field.type !== 'id') {
        if (field.type === 'object' && field.fields) {
            // Objects require recursion to resolve each nested field which themselves
            // could be objects.
            let nestedFieldDefinition = {};
            const nestedFields = _(field.fields).map((nestedField, fieldName) => {
                const compiledNestedObject = compileNestedObjects(nestedField);
                if (typeof compiledNestedObject !== 'undefined') {
                    nestedFieldDefinition[fieldName] = compiledNestedObject;
                }
                return nestedFieldDefinition;
            }).value()[0];
            // Apply the resolved nested fields to the field definition wrapping in
            // an array if the field allows many values.
            fieldDefinition = {
                type: field.many && !field.fields ? [nestedFields] : nestedFields,
                index: !!field.index
            };
            return fieldDefinition;
        }
        // Non nested objects only need their field type resolving and wrapping in
        // an array if the field allows many values.
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
        // Only create a mongoose model if the entity type is for the database.
        if (entityTypeData.storage !== 'db')
            return;
        const definedFields = _(entityTypeData.fields).reduce((acc, field, fieldId) => {
            // Skip native id mapping as MongoDB automatically assigns IDs.
            if (field.type !== 'id') {
                const compiledNestedObject = compileNestedObjects(field);
                if (typeof compiledNestedObject !== 'undefined') {
                    acc[fieldId] = compiledNestedObject;
                }
            }
            return acc;
        }, {});
        const schema = new mongoose.Schema(definedFields);
        // When re-registering model ensure it is removed to prevent mongoose errors.
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