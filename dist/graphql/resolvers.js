"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { hooks } = Panacea.container;
exports.graphQLResolvers = function () {
    const resolvers = {
        Query: {},
        Mutation: {}
    };
    hooks.invoke('core.graphql.resolvers', { resolvers });
    return resolvers;
};
//# sourceMappingURL=resolvers.js.map