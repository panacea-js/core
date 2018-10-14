import * as Mongoose from 'mongoose'

const { hooks } = Panacea.container
export interface DbModels {
  [name: string]: Mongoose.Model<Mongoose.Document>
}

/**
 * Loads entity types from yml files to define MongoDB models.
 * @returns {object}
 */
export const dbModels = function (): DbModels {
  const models: DbModels = {}
  hooks.invoke('core.mongo.models', { models })

  return models
}
