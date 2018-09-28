// @flow
const { hooks } = Panacea.container

export const graphQLResolvers = function () : GraphQLResolvers {
  const resolvers : GraphQLResolvers = {
    Query: {},
    Mutation: {}
  }

  hooks.invoke('core.graphql.resolvers', { resolvers })

  return resolvers
}
