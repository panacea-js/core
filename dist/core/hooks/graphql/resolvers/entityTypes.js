"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, entityTypes, i18n, getClientLanguage } = Panacea.container;
const entityTypeResolvers = function (resolvers) {
    const definitions = entityTypes.getData();
    resolvers.Query['_entityType'] = async (parent, { name }, { dbModels }) => {
        if (name !== 'Revision' && name.endsWith('Revision')) {
            return null;
        }
        const entityType = definitions[name];
        delete entityType._filePath;
        return {
            name,
            data: JSON.stringify(entityType)
        };
    };
    resolvers.Query['_entityTypes'] = () => {
        const allEntities = [];
        _(definitions).forEach((entityType, entityTypeName) => {
            if (_(entityTypeName).endsWith('Revision')) {
                return;
            }
            const entityTypeData = definitions[entityTypeName];
            delete entityTypeData._filePath;
            allEntities.push({
                name: entityTypeName,
                data: JSON.stringify(entityTypeData)
            });
        });
        return allEntities;
    };
    resolvers.Query['_fieldTypes'] = (parent, args, { req }) => {
        const language = getClientLanguage(req);
        return _(entityTypes.fieldTypes).reduce((result, attributes, type) => {
            result.push({
                type,
                label: i18n.t(attributes.label, language),
                description: i18n.t(attributes.description, language)
            });
            return result;
        }, []);
    };
    resolvers.Mutation['_createEntityType'] = async (parent, { name, data, locationKey }) => {
        const saveResult = entityTypes.save(name, JSON.parse(data), locationKey);
        if (!saveResult.success) {
            return new Error(saveResult.errorMessage);
        }
        return {
            name,
            data
        };
    };
};
exports.default = {
    register(hooks) {
        hooks.on('core.graphql.resolvers', ({ resolvers }) => {
            entityTypeResolvers(resolvers);
        });
    }
};
//# sourceMappingURL=entityTypes.js.map