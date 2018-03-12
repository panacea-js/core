// Import node core events.
import events from 'events'

// Create a Hooks base object which extends node's event emitter.
const Hooks = events.EventEmitter

/**
 * Registry of hooks that have been invoked
 */
Hooks.availableHooks = []

/**
 * Invoke method sets a one-time listener to capture the resulting data and then invokes all listeners.
 *
 * @param type
 *   The event type (i.e. the hook name)
 *
 * @param defaultData
 *   Optional default value which can be altered by other consuming listeners with the 'on' method.
 *
 * @returns mixed
 */
Hooks.prototype.invoke = function (type, defaultData = null) {
  // Add hook type to the availableHooks registry.
  if (Hooks.availableHooks.indexOf(type) === -1) Hooks.availableHooks.push(type)

  let returnData = null

  this.once(type, function (data) {
    returnData = data
  })
  this.emit(type, defaultData)

  return returnData
}

/**
 * Get a list of available hooks registered in the application.
 *
 * The result may change over time, so it's suggested that this is called late in the bootstrap lifecycle.
 * For example, at the end of the main application entry point file.
 *
 * @returns {Array}
 */
Hooks.prototype.getAvailableHooks = function () {
  return Hooks.availableHooks
}

/**
 * Return formatted output of available hooks registered in the application.
 *
 * The result may change over time, so it's suggested that this is called late in the bootstrap lifecycle.
 * For example, at the end of the main application entry point file.
 *
 * @returns void
 */
Hooks.prototype.getAvailableHooksOutput = function (nested = true) {
  const { formatters } = DI.container

  let output = ''

  if (nested) {
    const nest = {}
    hooks.getAvailableHooks().forEach(hook => formatters.compileNestFromDotSeparated(hook, nest))
    output = formatters.formatNestedObjectKeys(nest)
  } else {
    if (hooks.getAvailableHooks().length > 0) {
      output = '\n  - ' + hooks.getAvailableHooks().join('\n  - ')
    } else {
      output = 'None'
    }
  }

  return `Available hooks: ${output}`
}

/**
 * Load application level hooks to react and alter passed data.
 *
 * @param paths Array
 *   A list of directories to load application level hooks which register listeners via the standard 'on' method.
 */
Hooks.prototype.loadFromDirectories = function (paths) {
  const { path, fs, requireDir, _, log, chalk } = DI.container

  let result = ''

  paths.forEach(function (hooksDirectory) {
    const resolvedPath = path.resolve(hooksDirectory)

    if (!fs.pathExistsSync(resolvedPath)) {
      result = `Could not load hooks from ${resolvedPath}`
      log.warn(result)
      return
    }

    const moduleHookFiles = requireDir(resolvedPath)

    _(moduleHookFiles).forEach(function (exports, file) {
      if (!exports.hasOwnProperty('default')) {
        result = `Hook file ${file} should export as default.`
        log.warn(result)
        return
      }
      if (!exports.default.hasOwnProperty('register')) {
        result = `Could not execute register() in hook file: ${file}.`
        log.warn(result)
        return
      }

      exports.default.register(hooks)

      log.info(chalk.green(`Registered hooks in ${resolvedPath}/${file}.js`))
    })
  })

  return result
}

// The instance gets passed around between modules from the service container.
export const hooks = new Hooks()
