"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    register(hooks) {
        hooks.on('core.entityTypes.fields.definitions', ({ fieldTypes }) => {
            fieldTypes.id = {
                label: 'core.entityTypes.fields.id.label',
                description: 'core.entityTypes.fields.id.description'
            };
            fieldTypes.string = {
                label: 'core.entityTypes.fields.string.label',
                description: 'core.entityTypes.fields.string.description'
            };
            fieldTypes.password = {
                label: 'core.entityTypes.fields.password.label',
                description: 'core.entityTypes.fields.password.description'
            };
            fieldTypes.text = {
                label: 'core.entityTypes.fields.text.label',
                description: 'core.entityTypes.fields.text.description'
            };
            fieldTypes.float = {
                label: 'core.entityTypes.fields.float.label',
                description: 'core.entityTypes.fields.float.description'
            };
            fieldTypes.int = {
                label: 'core.entityTypes.fields.int.label',
                description: 'core.entityTypes.fields.int.description'
            };
            fieldTypes.boolean = {
                label: 'core.entityTypes.fields.boolean.label',
                description: 'core.entityTypes.fields.boolean.description'
            };
            fieldTypes.reference = {
                label: 'core.entityTypes.fields.reference.label',
                description: 'core.entityTypes.fields.reference.description'
            },
                fieldTypes.object = {
                    label: 'core.entityTypes.fields.object.label',
                    description: 'core.entityTypes.fields.object.description'
                };
        });
        hooks.on('core.entityTypes.fields.mapMongo', ({ fieldsMapMongo }) => {
            fieldsMapMongo.set('string', 'String');
            fieldsMapMongo.set('password', 'String');
            fieldsMapMongo.set('text', 'String');
            fieldsMapMongo.set('float', 'Number');
            fieldsMapMongo.set('int', 'Number');
            fieldsMapMongo.set('boolean', 'Number');
            fieldsMapMongo.set('reference', 'String');
            fieldsMapMongo.set('object', 'Object');
        });
        hooks.on('core.entityTypes.fields.mapGraphQL', ({ fieldsMapGraphQL }) => {
            fieldsMapGraphQL.set('id', 'String');
            fieldsMapGraphQL.set('string', 'String');
            fieldsMapGraphQL.set('password', 'String');
            fieldsMapGraphQL.set('text', 'String');
            fieldsMapGraphQL.set('float', 'Float');
            fieldsMapGraphQL.set('int', 'Int');
            fieldsMapGraphQL.set('boolean', 'Boolean');
            fieldsMapGraphQL.set('reference', 'String');
            fieldsMapGraphQL.set('object', '__NestedObject');
        });
    }
};
//# sourceMappingURL=fields.js.map