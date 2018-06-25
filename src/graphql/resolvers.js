// @flow
import { IResolvers } from 'graphql-tools/dist/Interfaces' // eslint-disable-line no-unused-vars
const { entities, hooks, i18n, accepts } = Panacea.container

/**
 * Get the client's preferred language based on the request's
 * PANACEA-CMS-LANGUAGE cookie value. Falls back to the client's Accept-Language
 * header using the accepts module.
 *
 * @param {Request} req The request object
 *
 * @returns {String|Boolean} If an available language match is found then a
 *   string is returned, otherwise false
 */
const getClientLanguage = function (req: express$Request) {
  const availableLanguages = Object.keys(i18n.messages)

  let cookieLanguage = ''

  if (typeof req.headers.cookie !== 'undefined') {
    req.headers.cookie.split('; ').map(cookie => {
      const [ key, value ] = cookie.split('=')
      if (key === 'PANACEA-CMS-LANGUAGE') {
        cookieLanguage = value
      }
    })

    if (cookieLanguage.length > 0 && i18n.messages.hasOwnProperty(cookieLanguage)) {
      return cookieLanguage
    }
  }

  // Fallback to client's Accept-Language header.
  return accepts(req).language(availableLanguages)
}

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
) : Mongoose$Query<any, any> {
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

export const graphQLResolvers = function () : IResolvers {
  const entityTypes = entities.getData()

  const resolvers = {
    Query: {},
    Mutation: {}
  }

  hooks.invoke('core.graphql.resolvers', { resolvers, entityTypes, modelQuery, getClientLanguage })

  return resolvers
}
