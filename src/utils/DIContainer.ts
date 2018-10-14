// Dependency injection container library.
import * as Bottle from 'bottlejs'
import { IPanaceaOptionsComplete } from '../../types/globals'

interface IServicesBuilderProto {
  alias: (
    this: IServicesBuilder,
    alias: string,
    location: string
  ) => void
  add: (
    this: IServicesBuilder,
    serviceName: string,
    location: string,
    property?: string,
    callbackArguments?: Array<any>
  ) => void
}

export interface IServicesBuilder extends IServicesBuilderProto {
  services: {
    [serviceName: string]: any
  }
  aliases: {
    [aliasName: string]: any
  }
}

/**
 * Service builder helper to pass to services file.
 */
const ServicesBuilder = function (this: IServicesBuilder) {
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
ServicesBuilder.prototype.add = function (serviceName, location, property, callbackArguments) {
  // Process aliases.
  for (let alias in this.aliases) {
    location = location.replace(alias, this.aliases[alias])
  }

  this.services[serviceName] = {
    location,
    property,
    callbackArguments
  }
} as IServicesBuilderProto['add']

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
} as IServicesBuilderProto['alias']

/**
 * Register a service container from a file.
 *
 * @param params
 *   An object containing parameters to be injected into the services constructor.
 *
 * @returns Bottle
 */
export const registerServices = function (params: typeof Panacea.options) {
  const defaultsDeep = require('lodash/defaultsDeep')
  const path = require('path')

  const services = new (ServicesBuilder as any)()

  const coreServices = path.resolve(__dirname, '../default.services')
  const defaultOptions = require(coreServices).servicesConfig()

  // Prioritize passed in params then default.services.js.
  const options: IPanaceaOptionsComplete = defaultsDeep(params || {}, defaultOptions)

  require(options.services.file).registerServices(services, options)

  const bottle = new Bottle()

  for (let serviceName in services.services) {
    const location = services.services[serviceName].location
    const property = services.services[serviceName].property
    const callbackArguments = services.services[serviceName].callbackArguments

    const provider = function () {
      // @ts-ignore
    }
    provider.prototype.$get = function () {
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

  // @ts-ignore
  global[options.services.globalVariable] = bottle

  return bottle
}
