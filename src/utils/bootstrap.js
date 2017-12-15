import path from 'path'
import fs from 'fs-extra'

const Bootstrap = function(panaceaConfigFile = '') {

  if (panaceaConfigFile === '') {
    panaceaConfigFile = path.resolve(process.cwd(), 'panacea.js')
  }

  panaceaConfigFile = path.resolve(panaceaConfigFile)

  if (!fs.existsSync(panaceaConfigFile)) {
    throw Error(`Could not load panacea.js config file at ${panaceaConfigFile}`)
  }

  this.params = require(panaceaConfigFile).default()
  this.defaultAppPriority = 10
  this.defaultPluginPriority = 0
}

Bootstrap.prototype.executeStage = function (stage) {
  if (!typeof this[stage] == 'function') {
    throw Error(`${stage} is not a valid bootstrap stage`)
  }
  this[stage]()
}

Bootstrap.prototype.all = function () {
  for (const method in this) {
    if (method.indexOf('stage') === 0) {
      const stage = method
      this[stage]()
    }
  }
}

Bootstrap.prototype.registryPathDiscoveryProcessor = function(registryType, subPath) {
  const { _, path, fs, registry } = DI.container

  registry[registryType] = this.params[registryType] || {}

  const pluginsRegistrants = _(registry.plugins).toArray().value().map(x => {
    x.path = path.resolve(x.path, subPath)
    return x
  })

  const applicationRegistrant = [{
    path: path.resolve(process.cwd(), subPath),
    priority: this.defaultAppPriority
  }]

  const unprioritizedRegistrants = _.union(applicationRegistrant, pluginsRegistrants)

  const prioritizedRegistrants = unprioritizedRegistrants.sort((a, b) => Number(a.priority) - Number(b.priority))

  const directories = prioritizedRegistrants.filter(x => fs.existsSync(x.path))

  directories.map(x => registry[registryType][x.path] = x)

  return directories
}

/**
 * Register services.
 */
Bootstrap.prototype.stage1 = function() {
  require('./DIContainer').registerServices(this.params)
}

/**
 * Initialize the registry onto the DI container.
 *
 * Adds the application level hooks.
 */
Bootstrap.prototype.stage3 = function() {
  DI.value('registry', {})
}

/**
 * Add plugins to the registry.
 */
Bootstrap.prototype.stage4 = function() {

  const { registry } = DI.container

  if (!this.params.hasOwnProperty('plugins')) {
    registry.plugins = {}
    return
  }

  const { options, path, fs, chalk, resolvePluginPath } = DI.container

  registry.plugins = {}

  this.params.plugins.map(plugin => {

    // Allows plugins to be declared in panacea.js as single string without a priority.
    // Mutate plugin into plugin object structure.
    if (typeof plugin === 'string') {
      plugin = {
        path: plugin
      }
    }

    plugin.priority = plugin.priority || this.defaultPluginPriority

    // Only add plugin to the registry if its path can be resolved.
    if (!resolvePluginPath(plugin.path)) {
      console.error(chalk.bgRed(' 😕  \n' +
      `Plugin ${chalk.underline(plugin.path)} was not found as defined in panacea.js.\n` +
      `If this is a external (contributed) plugin: Check that you have run \`npm install ${plugin.path}\`\n` +
      `If this plugin is part of your application: Check that it can be resolved in the <app_root>/plugins/ directory`))
      return
    }

    console.log(chalk.green(`✔ ${plugin.path} plugin loaded`))

    registry.plugins[plugin.path] = plugin

  })

  console.log('')
}

/**
 * Load application and plugins hooks.
 */
Bootstrap.prototype.stage5 = function() {
  const { hooks } = DI.container
  const directories = this.registryPathDiscoveryProcessor('hooks', 'hooks')
  hooks.loadFromDirectories(directories.map(x => x.path))
}

/**
 * Discover and register application and plugins entities.
 */
Bootstrap.prototype.stage6 = function() {
  this.registryPathDiscoveryProcessor('entities', 'config/entities/schemas')
}

/**
 * Discover and register application and plugins settings.
 */
Bootstrap.prototype.stage7 = function() {
  this.registryPathDiscoveryProcessor('settings', 'config/settings/schemas')
}

export default Bootstrap
