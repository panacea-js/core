// Dependency injection container library.
import Bottle from 'bottlejs'

/**
 * Service builder helper to pass to services file.
 */
const servicesBuilder = function() {
  this.services = {}
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
servicesBuilder.prototype.add = function(serviceName, location, property = null, callbackArguments = null) {
  this.services[serviceName] = {
    location,
    property,
    callbackArguments
  }
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

  require('dotenv-safe').load()
  const path = require('path')

  const startTime = Date.now()

  const services = new servicesBuilder()

  if (!params.services) {
    params.services = {}
  }
  if (!params.services.file) {
    params.services.file = path.resolve(__dirname, '../default.services.js')
  }

  const defaultOptions = require(params.services.file).defaultOptions()
  const defaultsDeep = require('lodash/defaultsDeep')
  const options = defaultsDeep(params || {}, defaultOptions)

  require(options.services.file).registerServices(services, options)

  const bottle = new Bottle()

  for (let serviceName in services.services) {

    const location = services.services[serviceName].location
    const property = services.services[serviceName].property
    const callbackArguments = services.services[serviceName].callbackArguments

    const provider = function() {}
    provider.prototype.$get = function() {
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

  // Set resolved options to be accessible on the container.
  bottle.value('options', options)

  global[options.services.globalVariable] = bottle

  const elapsedTime = `${Date.now() - startTime}ms`

  console.info(`(${elapsedTime}) Registered DI service container on global.${options.services.globalVariable}.container from ${options.services.file}`)

  return bottle
}
