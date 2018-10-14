import { IHooks } from '../../../../utils/hooks';

export default {
  register (hooks: IHooks) {
    hooks.on('core.graphql.definitions.mutations', ({ mutations } : { mutations: GraphQLMutationDefinitions}) => {

    })
  }
}
