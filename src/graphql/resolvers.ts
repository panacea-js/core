import { IResolvers } from 'graphql-tools/dist/Interfaces'

const { hooks } = Panacea.container

export const graphQLResolvers = function () : IResolvers {
  const resolvers : IResolvers = {
    Query: {},
    Mutation: {}
  }

  hooks.invoke('core.graphql.resolvers', { resolvers })

  return resolvers
}
