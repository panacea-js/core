import { IPanaceaOptionsComplete } from '../../types/globals'

/**
 * Creates a MongoDB connection object.
 *
 * @returns Promise<Mongoose$Connection>
 */

const dbConnection = function (options: IPanaceaOptionsComplete['services']['options']['db']) {
  const { host, dbName, port } = options

  const { mongoose } = Panacea.container

  mongoose.Promise = Promise

  return mongoose.createConnection(`mongodb://${host}:${port}/${dbName}`, { useNewUrlParser: true })
}

export { dbConnection }
