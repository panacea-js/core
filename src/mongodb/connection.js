// @flow
/**
 * Creates a MongoDB connection object.
 *
 * @returns Promise<Mongoose$Connection>
 */

const dbConnection = function (options: typeof Panacea.options.services.options.db) {
  const { host, dbName, port } = options

  const { mongoose } = Panacea.container

  mongoose.Promise = Promise

  return mongoose.createConnection(`mongodb://${host}:${port}/${dbName}`, { useNewUrlParser: true })
}

export { dbConnection }
