// @flow
const { _, i18n } = Panacea.container

export default {
  register (hooks: events$EventEmitter) {
    hooks.once('core.entities.definitions', (entityTypes: EntityTypes) => {
      const revisionsText = i18n.t('core.entities.revisions.label') // Revisions

      for (const entityTypeName of Object.keys(entityTypes)) {
        const entityType: EntityType = entityTypes[entityTypeName]
        if (!entityType.revisions) {
          return
        }
        const revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision'

        const clonedRevision: EntityType = _.cloneDeep(entityType)
        clonedRevision.plural = `${entityTypeName} ${revisionsText}`
        clonedRevision.revisions = false
        clonedRevision._excludeGraphQL = true
        entityTypes[revisionEntityType] = clonedRevision

        // _revision field stores an array of references to the revision entity.
        entityType.fields._revisions = {
          type: 'reference',
          references: revisionEntityType,
          label: revisionsText,
          description: i18n.t('core.entities.revisions.description', {entityTypeName}), // Revisions for ${entityTypeName},
          many: true
        }
      }
    })

    hooks.on('core.entities.meta', args => {
      const meta: Meta = args.meta
      const entityTypeData: EntityType = args.entityTypeData
      const entityTypeName: string = args.entityTypeName

      if (entityTypeData.revisions) {
        meta.revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision'
      }
    })

    hooks.on('core.entities.entityCreateHandlers', (handlers: Array<transactionHandler>) => {
      const revisionCreateHandler = {
        prepare: async function (txn) {
          const { entityData, dbModels, args } = txn.context
          if (entityData.revisions) {
            const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType]
            const entityRevision = await new EntityRevisionModel(args.fields).save()
            args.fields._revisions = args.fields._revisions || []
            args.fields._revisions.push(entityRevision._id.toString())
            txn.context.createdRevisionId = entityRevision._id.toString()
          }
        },
        rollback: async function (txn) {
          if (txn.context.createdRevisionId) {
            const entityData: EntityType = txn.context.entityData
            const dbModels: dbModels = txn.context.dbModels
            const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType]
            EntityRevisionModel.findByIdAndDelete(txn.context.createdRevisionId)
          }
        }
      }

      handlers.push(revisionCreateHandler)
    })
  }
}
