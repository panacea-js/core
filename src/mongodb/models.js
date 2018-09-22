// @flow
const { hooks } = Panacea.container

/**
 * Loads entity types from yml files to define MongoDB models.
 * @returns {object}
 */
export const dbModels = function () : dbModels {
  const models = {}
  hooks.invoke('core.mongo.models', { models })

  return models
}
