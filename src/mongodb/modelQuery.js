/**
 * Generic entity model query.
 *
 * @param {Model} model The Mongoose model for a collection.
 * @param {*} parent The parent resolver.
 * @param {object} args The GraphQL query arguments.
 */
const modelQuery = function (
  model: Mongoose$Collection,
  parent: {},
  args: { params: QueryParams }
) : typeof Mongoose$Query {
  const params = args.params || {
    limit: 100,
    sortBy: null,
    sortDirection: null
  }

  const sortOptions = {}

  if (params.sortBy) {
    sortOptions[params.sortBy] = params.sortDirection === 'DESC' ? -1 : 1
  }

  return model.find().limit(params.limit).sort(sortOptions)
}

export { modelQuery }
