import { IHooks } from '../../../utils/hooks'
import { Transaction, TransactionHandler } from '../../../utils/transaction'
import { DbModels } from '../../../mongodb/models'
import * as Mongoose from 'mongoose';

const { _, i18n } = Panacea.container

export default {
  register (hooks: IHooks) {
    hooks.on('core.entityTypes.definitions', ({ definitions }: { definitions: EntityTypeDefinitions }) => {
      const revisionsText = i18n.t('core.entityTypes.revisions.label') // Revisions

      for (const entityTypeName of Object.keys(definitions)) {

        const entityType: EntityTypeDefinition = definitions[entityTypeName]

        // Skip this entity type is it's not revisionable or already has revisions applied.
        if (!entityType.revisions || entityType.fields._revisions) {
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
          _excludeGraphQLInput: true,
          type: 'reference',
          references: [revisionEntityType],
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

    hooks.on('core.entity.createHandlers', ({ transactionHandlers }: { transactionHandlers: Array<TransactionHandler> }) => {
      const revisionCreateHandler = {
        prepare: async function (txn: Transaction) {
          const { entityData, dbModels, args } = txn.context
          if (entityData.revisions) {
            const revisionEntityType = entityData._meta.revisionEntityType
            const EntityRevisionModel = dbModels[revisionEntityType]
            const entityRevision = await new EntityRevisionModel(args.fields).save()
            args.fields._revisions = args.fields._revisions || []
            args.fields._revisions.push(`${revisionEntityType}|${entityRevision._id}`)
            txn.context.createdRevisionId = `${revisionEntityType}|${entityRevision._id}`
          }
        },
        rollback: async function (txn: Transaction) {
          const { entityData, dbModels, createdRevisionId, createdEntity }: { entityData: EntityTypeDefinition, dbModels: DbModels, createdRevisionId: string, createdEntity: Mongoose.Document } = txn.context
          if (entityData.revisions && createdRevisionId) {
            if (entityData._meta && entityData._meta.revisionEntityType) {
              const [revisionEntityType, revisionEntityId] = createdRevisionId.split('|')
              const EntityRevisionModel = dbModels[revisionEntityType]
              // Delete revision entity.
              await EntityRevisionModel.findByIdAndDelete(revisionEntityId).exec()
            }
          }
        }
      }

      transactionHandlers.push(revisionCreateHandler)
    })
  }
}
