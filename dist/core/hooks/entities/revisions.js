"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, i18n } = Panacea.container;
exports.default = {
    register(hooks) {
        hooks.once('core.entityTypes.definitions', ({ definitions }) => {
            const revisionsText = i18n.t('core.entityTypes.revisions.label'); // Revisions
            for (const entityTypeName of Object.keys(definitions)) {
                const entityType = definitions[entityTypeName];
                if (!entityType.revisions) {
                    continue;
                }
                const revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision';
                const clonedRevision = _.cloneDeep(entityType);
                clonedRevision.plural = `${entityTypeName} ${revisionsText}`;
                clonedRevision.revisions = false;
                clonedRevision._excludeGraphQL = true;
                definitions[revisionEntityType] = clonedRevision;
                // _revision field stores an array of references to the revision entity.
                entityType.fields._revisions = {
                    type: 'reference',
                    references: revisionEntityType,
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
                        const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType];
                        const entityRevision = await new EntityRevisionModel(args.fields).save();
                        args.fields._revisions = args.fields._revisions || [];
                        args.fields._revisions.push(entityRevision._id.toString());
                        txn.context.createdRevisionId = entityRevision._id.toString();
                    }
                },
                rollback: async function (txn) {
                    const { entityData, dbModels, createdRevisionId } = txn.context;
                    if (entityData.revisions && createdRevisionId) {
                        if (entityData._meta && entityData._meta.revisionEntityType) {
                            const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType];
                            EntityRevisionModel.findByIdAndDelete(txn.context.createdRevisionId);
                        }
                    }
                }
            };
            transactionHandlers.push(revisionCreateHandler);
        });
    }
};
//# sourceMappingURL=revisions.js.map