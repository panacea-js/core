import { IHooks } from "../../../utils/hooks";

export default {
  register: function (hooks: IHooks) {
    hooks.on('core.graphql.definitions.types', data => {
      // console.log(data)
    })
  }
}
