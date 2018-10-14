import { IHooks } from '../../../../../utils/hooks'

export default {
  register (hooks: IHooks) {
    hooks.on('basicPluginIsListening', data => {
      // Nothing to do here - it's registered.
    })
  }
}
