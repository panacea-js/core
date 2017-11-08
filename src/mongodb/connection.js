/**
 * Creates a MongoDB connection object.
 *
 * @returns {Connection|Promise}
 */

export const dbConnection = function () {
  const env = process.env

  const { mongoose } = DI.container

  mongoose.Promise = Promise

  return mongoose.createConnection(`mongodb://${env.MONGODB_HOST}/${env.MONGODB_DBNAME}`, {
    useMongoClient: true
  })
}
