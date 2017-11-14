/**
 * Creates a MongoDB connection object.
 *
 * @returns {Connection|Promise}
 */

const dbConnection = function (options) {

  const { host, dbName } = options

  const { mongoose } = DI.container

  mongoose.Promise = Promise

  return mongoose.createConnection(`mongodb://${host}/${dbName}`, {
    useMongoClient: true
  })
}

export { dbConnection }
