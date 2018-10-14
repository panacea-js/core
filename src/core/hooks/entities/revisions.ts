import { IHooks } from '../../../utils/hooks';
import { Transaction, transactionHandler } from '../../../utils/transaction'
import { dbModels } from '../../../mongodb/models';

const { _, i18n } = Panacea.container

export default {
  register (hooks: IHooks) {
    hooks.once('core.entityTypes.definitions', ({ definitions } : { definitions: EntityTypeDefinitions }) => {
      const revisionsText = i18n.t('core.entityTypes.revisions.label') // Revisions

      for (const entityTypeName of Object.keys(definitions)) {
        const entityType: EntityTypeDefinition = definitions[entityTypeName]
        if (!entityType.revisions) {
          continue
        }
        const revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision'

        const clonedRevision: EntityTypeDefinition = _.cloneDeep(entityType)
        clonedRevision.plural = `${entityTypeName} ${revisionsText}`
        clonedRevision.revisions = false
        clonedRevision._excludeGraphQL = true
        definitions[revisionEntityType] = clonedRevision

        // _revision field stores an array of references to the revision entity.
        entityType.fields._revisions = {
          type: 'reference',
          references: revisionEntityType,
          label: revisionsText,
          description: i18n.t('core.entityTypes.revisions.description', { entityTypeName }), // Revisions for ${entityTypeName},
          many: true
        }
      }
    })

    hooks.on('core.entityTypes.meta', args => {
      const meta: Meta = args.meta
      const entityTypeData: EntityTypeDefinition = args.entityTypeData
      const entityTypeName: string = args.entityTypeName

      if (entityTypeData.revisions) {
        meta.revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision'
      }
    })

    hooks.on('core.entity.createHandlers', ({ transactionHandlers } : { transactionHandlers: Array<transactionHandler> }) => {
      const revisionCreateHandler = {
        prepare: async function (txn: Transaction) {
          const { entityData, dbModels, args } = txn.context
          if (entityData.revisions) {
            const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType]
            const entityRevision = await new EntityRevisionModel(args.fields).save()
            args.fields._revisions = args.fields._revisions || []
            args.fields._revisions.push(entityRevision._id.toString())
            txn.context.createdRevisionId = entityRevision._id.toString()
          }
        },
        rollback: async function (txn: Transaction) {
          const { entityData, dbModels, createdRevisionId } : { entityData: EntityTypeDefinition, dbModels: dbModels, createdRevisionId: string } = txn.context
          if (entityData.revisions && createdRevisionId) {
            if (entityData._meta && entityData._meta.revisionEntityType) {
              const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType]
              EntityRevisionModel.findByIdAndDelete(txn.context.createdRevisionId)
            }
          }
        }
      }

      transactionHandlers.push(revisionCreateHandler)
    })
  }
}
