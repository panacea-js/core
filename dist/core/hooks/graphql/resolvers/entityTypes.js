"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, entityTypes, i18n, getClientLanguage } = Panacea.container;
/**
 * Defines resolvers for introspection into the defined entity types and field
 * types.
 *
 * @param {*} resolvers The mutable object of resolver definitions.
 */
const entityTypeResolvers = function (resolvers) {
    const definitions = entityTypes.getData();
    resolvers.Query['_entityType'] = async (parent, { name }, { dbModels }) => {
        // It's possible that a user creates an entity type called 'Revision'.
        // Ignore that case, but otherwise prevent entity types that end with
        // 'Revision' from being queried directly as these are intended only to be
        // nested under their respective entities as the _revisions property.
        // See: hooks/entities/revisions.js
        if (name !== 'Revision' && name.endsWith('Revision')) {
            return null;
        }
        const entityType = definitions[name];
        // Don't expose the native file path.
        delete entityType._filePath;
        return {
            name,
            data: JSON.stringify(entityType)
        };
    };
    resolvers.Query['_entityTypes'] = () => {
        const allEntities = [];
        _(definitions).forEach((entityType, entityTypeName) => {
            // Exclude Revision entity types from being accessed directly.
            if (_(entityTypeName).endsWith('Revision')) {
                return;
            }
            const entityTypeData = definitions[entityTypeName];
            // Don't expose the native file path.
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