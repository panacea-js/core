"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, i18n } = Panacea.container;
exports.default = {
    register(hooks) {
        hooks.on('core.entityTypes.definitions', ({ definitions }) => {
            const revisionsText = i18n.t('core.entityTypes.revisions.label');
            for (const entityTypeName of Object.keys(definitions)) {
                const entityType = definitions[entityTypeName];
                if (!entityType.revisions || entityType.fields._revisions) {
                    continue;
                }
                const revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision';
                const clonedRevision = _.cloneDeep(entityType);
                clonedRevision.plural = `${entityTypeName} ${revisionsText}`;
                clonedRevision.revisions = false;
                clonedRevision._excludeGraphQL = true;
                definitions[revisionEntityType] = clonedRevision;
                entityType.fields._revisions = {
                    _excludeGraphQLInput: true,
                    type: 'reference',
                    references: [revisionEntityType],
                    label: revisionsText,
                    description: i18n.t('core.entityTypes.revisions.description', { entityTypeName }),
                    many: true
                };
            }
        });
        hooks.on('core.entityTypes.meta', args => {
            const meta = args.meta;
            const entityTypeData = args.entityTypeData;
            const entityTypeName = args.entityTypeName;
            if (entityTypeData.revisions) {
                meta.revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision';
            }
        });
        hooks.on('core.entity.createHandlers', ({ transactionHandlers }) => {
            const revisionCreateHandler = {
                prepare: async function (txn) {
                    const { entityData, dbModels, args } = txn.context;
                    if (entityData.revisions) {
                        const revisionEntityType = entityData._meta.revisionEntityType;
                        const EntityRevisionModel = dbModels[revisionEntityType];
                        const entityRevision = await new EntityRevisionModel(args.fields).save();
                        args.fields._revisions = args.fields._revisions || [];
                        args.fields._revisions.push(`${revisionEntityType}|${entityRevision._id}`);
                        txn.context.createdRevisionId = `${revisionEntityType}|${entityRevision._id}`;
                    }
                },
                rollback: async function (txn) {
                    const { entityData, dbModels, createdRevisionId, createdEntity } = txn.context;
                    if (entityData.revisions && createdRevisionId) {
                        if (entityData._meta && entityData._meta.revisionEntityType) {
                            const [revisionEntityType, revisionEntityId] = createdRevisionId.split('|');
                            const EntityRevisionModel = dbModels[revisionEntityType];
                            await EntityRevisionModel.findByIdAndDelete(revisionEntityId).exec();
                        }
                    }
                }
            };
            transactionHandlers.push(revisionCreateHandler);
        });
    }
};
//# sourceMappingURL=revisions.js.map