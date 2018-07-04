export default {
  register (hooks) {
    hooks.on('basicPluginIsListening', data => {
      // Nothing to do here - it's registered.
    })
  }
}
