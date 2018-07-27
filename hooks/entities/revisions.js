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
  }
}
