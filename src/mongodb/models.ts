import * as Mongoose from 'mongoose'

const { hooks } = Panacea.container
export interface dbModels {
  [name: string]: Mongoose.Model<Mongoose.Document>
}

/**
 * Loads entity types from yml files to define MongoDB models.
 * @returns {object}
 */
export const dbModels = function () : dbModels {
  const models: dbModels = {}
  hooks.invoke('core.mongo.models', { models })

  return models
}
