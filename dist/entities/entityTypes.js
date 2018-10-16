"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, log, fs, loadYmlFiles, writeYmlFile, hooks, registry } = Panacea.container;
class EntityTypes {
    constructor() {
        this.definitions = {};
        this.locations = {};
        this.defaults = {
            locationKey: 'app'
        };
        this.fieldTypes = {};
        this.fieldsMapMongo = new Map();
        this.fieldsMapGraphQL = new Map();
        this._errors = [];
    }
    addError(entityTypeData, error) {
        entityTypeData._errors = entityTypeData._errors || [];
        entityTypeData._errors.push(error);
    }
    convertFieldTypeToMongo(type) {
        if (typeof type !== 'string' || type === '') {
            throw TypeError('No type specified in mongo field types conversion mapping');
        }
        if (!this.fieldsMapMongo.has(type)) {
            throw new TypeError(type + ' not found in MongoDB type conversion mapping');
        }
        return this.fieldsMapMongo.get(type) || '';
    }
    convertFieldTypeToGraphQL(type) {
        if (typeof type !== 'string' || type === '') {
            throw TypeError('No type specified in GraphQL field types conversion mapping');
        }
        if (!this.fieldsMapGraphQL.has(type)) {
            throw TypeError(type + ' not found in GraphQL type conversion mapping');
        }
        return this.fieldsMapGraphQL.get(type) || '';
    }
    validate(entityTypeData, entityTypeName, action) {
        const entityTypeValidators = [
            this.validateRequiredProperties
        ];
        hooks.invoke('core.entityTypes.validators', { entityTypeValidators });
        entityTypeValidators.map(validator => validator.call(this, entityTypeData, entityTypeName, action));
        const entityTypeFieldValidators = [
            this.validateRequiredFields
        ];
        hooks.invoke('core.entityTypes.fieldValidators', { entityTypeFieldValidators });
        entityTypeFieldValidators.map(validator => validator.call(this, entityTypeData, entityTypeName, action, entityTypeData.fields));
        return this._errors.length === 0;
    }
    addMeta(entityTypeData, entityTypeName) {
        entityTypeData.description = entityTypeData.description || '';
        const meta = {
            camel: _.camelCase(entityTypeName),
            pascal: _.upperFirst(_.camelCase(entityTypeName)),
            descriptionLowerFirst: entityTypeData.description.charAt(0).toLowerCase() + entityTypeData.description.slice(1),
            pluralCamel: _.camelCase(entityTypeData.plural)
        };
        hooks.invoke('core.entityTypes.meta', { entityTypeName, entityTypeData, meta });
        this.definitions[entityTypeName]._meta = meta;
    }
    addFieldsMeta(fields) {
        _(fields).forEach((field, fieldName) => {
            field.description = field.description || '';
            field._meta = {
                camel: _(fieldName.startsWith('_')) ? fieldName : _(fieldName).camelCase()
            };
            if (field.type === 'object' && field.fields) {
                this.addFieldsMeta(field.fields);
            }
        });
        hooks.invoke('core.entityTypes.fields.meta', { fields });
    }
    clearCache() {
        this.definitions = {};
        this.fieldTypes = {};
        this.fieldsMapMongo = new Map();
        this.fieldsMapGraphQL = new Map();
    }
    getData() {
        if (Object.keys(this.fieldTypes).length === 0) {
            this.registerFieldTypes.call(this);
        }
        if (_(this.definitions).isEmpty()) {
            _.forIn(registry.entityTypes, (registrantData) => {
                this.locations[registrantData.locationKey] = registrantData.path;
                const fileEntityTypes = loadYmlFiles(registrantData.path);
                Object.keys(fileEntityTypes).forEach((entityName) => {
                    fileEntityTypes[entityName]._locationKey = registrantData.locationKey;
                    fileEntityTypes[entityName]._errors = [];
                });
                _.extend(this.definitions, fileEntityTypes);
            });
        }
        hooks.invoke('core.entityTypes.definitions', { definitions: this.definitions });
        _(this.definitions).forEach((entityTypeData, entityTypeName) => {
            this.validate(entityTypeData, entityTypeName, 'load');
            this.addMeta(entityTypeData, entityTypeName);
            this.addFieldsMeta(entityTypeData.fields);
            this.checkObjectsHaveFields.call(this, entityTypeData.fields, entityTypeName);
        });
        return this.definitions;
    }
    save(name, data, locationKey) {
        const result = {
            success: false,
            errorMessage: ''
        };
        let entityTypeData = JSON.parse(JSON.stringify(data));
        hooks.invoke('core.entityTypes.preSave', { name, entityTypeData, locationKey });
        const validates = this.validate(entityTypeData, name, 'save');
        if (!validates && entityTypeData._errors) {
            const validationErrors = entityTypeData._errors.join('\n');
            result.errorMessage = `Entity validation failed on: ${validationErrors}`;
            return result;
        }
        if (_(locationKey).isEmpty()) {
            locationKey = this.defaults.locationKey;
        }
        const basePath = this.locations[locationKey];
        if (!fs.existsSync(basePath)) {
            const errorMessage = `Location key ${locationKey} does not have a valid file path to save the entity.`;
            log.error(errorMessage);
            result.errorMessage = errorMessage;
            return result;
        }
        name = _.upperFirst(_.camelCase(name));
        const filePath = `${basePath}/${name}.yml`;
        try {
            entityTypeData.fields = this.removeFalsyFields(entityTypeData.fields);
            entityTypeData = this.stripMeta(entityTypeData);
            result.success = true;
            writeYmlFile(filePath, entityTypeData);
            hooks.invoke('core.reload', { reason: `entity ${name} was created` });
        }
        catch (error) {
            const errorMessage = `Could not write entity file ${name}.yml to ${basePath}: ${error.message}`;
            log.error(errorMessage);
            result.errorMessage = errorMessage;
            return result;
        }
        hooks.invoke('core.entityTypes.postSave', { name, entityTypeData, locationKey });
        return result;
    }
    stripMeta(data) {
        const clonedData = _.cloneDeep(data);
        _(clonedData).forEach((value, key) => {
            if (typeof clonedData === 'object') {
                clonedData[key] = this.stripMeta(value);
            }
            if (typeof key === 'string' && key.indexOf('_') === 0) {
                delete clonedData[key];
            }
        });
        return clonedData;
    }
    removeFalsyFields(fields) {
        _(fields).forEach((field, fieldName) => {
            _(field).forEach((value, key) => {
                if (_(value).isEmpty() && value !== true) {
                    delete fields[fieldName][key];
                }
            });
            if (field.type === 'object' && field.fields) {
                this.removeFalsyFields(field.fields);
            }
        });
        return fields;
    }
    checkObjectsHaveFields(fields, entityTypeName) {
        _(fields).forEach((fieldData, fieldId) => {
            if (fieldData.type === 'object' && !fieldData.fields) {
                console.warn(`Not loading ${fieldId} field on ${entityTypeName} because it doesn't have any nested fields.`);
                delete fields[fieldId];
            }
            if (fieldData.fields) {
                this.checkObjectsHaveFields.call(this, fieldData.fields, entityTypeName);
            }
        });
    }
    registerFieldTypes() {
        const fieldTypes = {};
        const fieldsMapMongo = new Map();
        const fieldsMapGraphQL = new Map();
        hooks.invoke('core.entityTypes.fields.definitions', { fieldTypes });
        hooks.invoke('core.entityTypes.fields.mapMongo', { fieldsMapMongo });
        hooks.invoke('core.entityTypes.fields.mapGraphQL', { fieldsMapGraphQL });
        this.fieldTypes = fieldTypes;
        this.fieldsMapMongo = fieldsMapMongo;
        this.fieldsMapGraphQL = fieldsMapGraphQL;
    }
    validateRequiredProperties(entityTypeData, entityTypeName, action) {
        if (_(entityTypeData.fields).isEmpty())
            this.addError(entityTypeData, TypeError(`Fields do not exist on entity type: ${entityTypeName}`));
        if (_(entityTypeData.plural).isEmpty())
            this.addError(entityTypeData, TypeError(`A 'plural' key must be set on entity type: ${entityTypeName}`));
        if (_(entityTypeData.storage).isEmpty())
            this.addError(entityTypeData, TypeError(`A 'storage' key must be set on entity type: ${entityTypeName}`));
    }
    validateRequiredFields(entityTypeData, entityTypeName, action, fields) {
        _(fields).forEach((field, fieldName) => {
            if (_(field).isEmpty())
                this.addError(entityTypeData, TypeError(`Field ${fieldName} configuration is empty`));
            if (_(field.type).isEmpty())
                this.addError(entityTypeData, TypeError(`Field type not defined for ${fieldName}`));
            if (this.fieldTypes[field.type] === undefined)
                this.addError(entityTypeData, TypeError(`Field type ${field.type} is invalid for ${fieldName}`));
            if (_(field.label).isEmpty())
                this.addError(entityTypeData, TypeError(`Field label not defined for ${fieldName}`));
            if (field.type === 'object' && field.hasOwnProperty('fields')) {
                this.validateRequiredFields.call(this, entityTypeData, entityTypeName, action, field.fields);
            }
        });
    }
}
const entityTypes = new EntityTypes();
exports.entityTypes = entityTypes;
//# sourceMappingURL=entityTypes.js.map