// @flow
export default {
  register (hooks: events$EventEmitter) {
    hooks.on('core.entities.entityCreateHandlers', (handlers: Array<transactionHandler>) => {
      const entityCreateHandler = {
        operation: async function (txn) {
          const { entityData, dbModels, args } = txn.context
          const EntityModel = dbModels[entityData._meta.pascal]
          const entity = await new EntityModel(args.fields).save()
          txn.context.createdEntity = entity
        }
      }

      handlers.push(entityCreateHandler)
    })
  }
}
