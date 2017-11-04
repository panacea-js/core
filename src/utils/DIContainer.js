// Dependency injection container library.
import Bottle from 'bottlejs'

/**
 * Register a service container based an module export.
 *
 * Once registered any module can access the container items with, for example:
 * const { service1, otherservice } = global.DI.container; or simply:
 * const { service1, otherservice } = DI.container
 *
 * @param file
 *   The file containing the services to use in the application relative to the project root.
 *   The file should export an object where the key is the name to register for the service
 *   and the value is the service itself.
 *
 * @param globalVariable
 *   The key to register against on the global object.
 *
 * @returns Bottle
 */
export const registerServicesFromFile = function(file, globalVariable = 'DI') {

  const startTime = Date.now()

  const servicesFile = `${file}`

  const services = require(servicesFile).default

  const bottle = new Bottle()

  for (let key in services) {
    bottle.factory(key, () => services[key])
  }

  global[globalVariable] = bottle

  const elapsedTime = `${Date.now() - startTime}ms`

  console.info(`(${elapsedTime}) Registered DI service container on global.${globalVariable}.container from ${servicesFile}`)

  return bottle

};