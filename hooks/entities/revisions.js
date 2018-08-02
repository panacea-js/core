// @flow
const { _, i18n } = Panacea.container

export default {
  register (hooks: events$EventEmitter) {
    hooks.once('core.entities.definitions', entityTypes => {
      const revisionsText = i18n.t('core.entities.revisions.label') // Revisions

      _(entityTypes).forEach((entityType, entityTypeName) => {
        if (!entityType.revisions) {
          return
        }
        const revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision'

        entityTypes[revisionEntityType] = _.cloneDeep(entityType)
        entityTypes[revisionEntityType].plural = `${entityTypeName} ${revisionsText}`
        entityTypes[revisionEntityType].revisions = false
        entityTypes[revisionEntityType]._excludeGraphQL = true

        // _revision field stores an array of references to the revision entity.
        entityType.fields._revisions = {
          type: 'reference',
          references: revisionEntityType,
          label: revisionsText,
          description: i18n.t('core.entities.revisions.description', {entityTypeName}), // Revisions for ${entityTypeName},
          many: true
        }
      })
    })

    hooks.on('core.entities.meta', args => {
      const meta: Meta = args.meta
      const entityTypeData: EntityType = args.entityTypeData
      const entityTypeName: string = args.entityTypeName

      if (entityTypeData.revisions) {
        meta.revisionEntityType = _.upperFirst(_.camelCase(entityTypeName)) + 'Revision'
      }
    })

    hooks.on('core.entities.entityCreateHandlers', handlers => {
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
            const { entityData, dbModels } = txn.context
            const EntityRevisionModel = dbModels[entityData._meta.revisionEntityType]
            EntityRevisionModel.findByIdAndDelete(txn.context.createdRevisionId)
          }
        }
      }

      handlers.push(revisionCreateHandler)
    })
  }
}
