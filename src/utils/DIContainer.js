// Dependency injection container library.
import Bottle from 'bottlejs'

/**
 * Service builder helper to pass to services file.
 */
const ServicesBuilder = function () {
  this.services = {}
  this.aliases = {}
}

/**
 * Add service to the service builder.
 *
 * @param serviceName String
 * @param location String
 *   Without trailing characters are global modules
 *   Local modules need full path resolving
 * @param property String
 *   A property for reference from the module import, or
 *   if callbackArguments is not empty then this param is
 *   considered to be a callback
 * @param callbackArguments Array|null
 *   Arguments as an array to pass to the instantiating call.
 */
ServicesBuilder.prototype.add = function (serviceName, location, property = null, callbackArguments = null) {
  // Process aliases.
  for (let alias in this.aliases) {
    location = location.replace(alias, this.aliases[alias])
  }

  this.services[serviceName] = {
    location,
    property,
    callbackArguments
  }
}

/**
 * Add an alias for path resolution.
 *
 * Aliases need to be set before importing any services using the alias.
 *
 * @param alias String
 *   Recommend to use a percent symbol prefix to avoid conflict
 *   E.g. '%core'
 *
 * @param location
 *   The absolute location to replace the alias when found.
 */
ServicesBuilder.prototype.alias = function (alias, location) {
  this.aliases[alias] = location
}

/**
 * Register a service container from a file.
 *
 * @param params
 *   An object containing parameters to be injected into the services constructor.
 *
 * @returns Bottle
 */
export const registerServices = function (params) {
  const defaultsDeep = require('lodash/defaultsDeep')
  const path = require('path')
  const fs = require('fs')

  const services = new ServicesBuilder()

  const coreServices = path.resolve(__dirname, '../default.services.js')
  const defaultOptions = require(coreServices).servicesConfig()

  // Prioritize passed in params then default.services.js.
  const options = defaultsDeep(params || {}, defaultOptions)

  require(options.services.file).registerServices(services, options)

  const bottle = new Bottle()

  for (let serviceName in services.services) {
    const location = services.services[serviceName].location
    const property = services.services[serviceName].property
    const callbackArguments = services.services[serviceName].callbackArguments

    const provider = function () {}
    provider.prototype.$get = function (container) {
      if (property) {
        if (Array.isArray(callbackArguments)) {
          return require(location)[property].apply(null, callbackArguments)
        }
        return require(location)[property]
      }
      return require(location)
    }

    bottle.provider(serviceName, provider)
  }

  // Add options from panacea config file.
  const panaceaConfigFile = path.resolve(process.cwd(), 'panacea.js')
  if (fs.existsSync(panaceaConfigFile)) {
    options.panacea = require(panaceaConfigFile).default()
  }

  // Set resolved options to be accessible on the container.
  bottle.value('options', options)

  global[options.services.globalVariable] = bottle

  return bottle
}
