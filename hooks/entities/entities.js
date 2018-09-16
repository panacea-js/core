// @flow
export default {
  register (hooks: events$EventEmitter) {
    hooks.on('core.entities.entityCreateHandlers', ({ transactionHandlers } : { transactionHandlers: Array<transactionHandler> }) => {
      const entityCreateHandler = {
        operation: async function (txn) {
          const { entityData, dbModels, args } = txn.context
          const EntityModel = dbModels[entityData._meta.pascal]
          const entity = await new EntityModel(args.fields).save()
          txn.context.createdEntity = entity
        }
      }

      transactionHandlers.push(entityCreateHandler)
    })
  }
}
