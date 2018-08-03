/**
 * Creates a MongoDB connection object.
 *
 * @returns {Connection|Promise}
 */

const dbConnection = function (options) {
  const { host, dbName, port } = options

  const { mongoose } = Panacea.container

  mongoose.Promise = Promise

  return mongoose.createConnection(`mongodb://${host}:${port}/${dbName}`, { useNewUrlParser: true })
}

export { dbConnection }
