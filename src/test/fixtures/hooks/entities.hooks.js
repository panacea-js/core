export default {
  register: function (hooks) {
    hooks.on('core.graphql.definitions.types', data => {
      // console.log(data)
    })
  }
}
