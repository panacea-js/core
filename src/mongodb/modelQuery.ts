import * as Mongoose from 'mongoose'

/**
 * Generic entity model query.
 *
 * @param {Model} model The Mongoose model for a collection.
 * @param {*} parent The parent resolver.
 * @param {object} args The GraphQL query arguments.
 */

interface ImodelQuery {
  (
    model: Mongoose.Model<Mongoose.Document>,
    parent: {},
    args: { params: QueryParams }
  ) : Mongoose.DocumentQuery<Mongoose.Document[], Mongoose.Document>
}

const modelQuery = <ImodelQuery>function (model, parent, args) {
  const params = args.params || {
    limit: 100,
    sortBy: null,
    sortDirection: null
  }

  const sortOptions: any = {}

  if (params.sortBy) {
    sortOptions[params.sortBy] = params.sortDirection === 'DESC' ? -1 : 1
  }

  return model.find().limit(params.limit).sort(sortOptions)
}

export { modelQuery }
