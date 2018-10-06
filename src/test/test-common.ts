import * as fs from 'fs-extra'
import Bootstrap from '../utils/bootstrap'
import fetch from 'node-fetch'
import { RegisterContextual } from 'ava';

const getTestingKey = function () {
  return `ava-test-${process.pid}`
}

const getSandboxDir = function () {
  const testingKey = getTestingKey()

  return `/tmp/${testingKey}`
}

const initTasks = function (test: RegisterContextual<any>) {
  const sandboxDir = getSandboxDir()

  // Set up.
  test.before(t => {
  })

  // Tear down.
  test.after.always(t => {
    fs.removeSync(sandboxDir)
  })
}

const entityHasErrorMessage = function (entity: EntityType, message: string) {
  if (!entity._errors) {
    return false
  }
  return entity._errors.filter(error => error.message === message).length > 0
}

const bootstrap = function (panaceaFile = 'default', runStages = []) {
  const panaceaConfigFile: string = `${__dirname}/fixtures/panaceaConfigFiles/${panaceaFile}.js`
  if (runStages.length > 0) {
    return new (Bootstrap as any)(panaceaConfigFile).runStages(runStages)
  }
  return new (Bootstrap as any)(panaceaConfigFile).all()
}

const graphqlQuery = function (query: string, variables: object, panaceaFile = 'default', fetchOptions = {}) {
  return new Promise((resolve, reject) => {
    const graphqlQueryRequest = function (query: string, variables: object) {
      const { options, _ } = Panacea.container

      options.main.port.then(port => {
        const url = `${options.main.protocol}://${options.main.host}:${port}/${options.main.endpoint}`
        _.defaultsDeep(fetchOptions, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables
          })
        })

        return fetch(url, fetchOptions)
          .then(response => resolve(response.json()))
          .catch(error => console.error(error) && reject(error))
      }).catch(error => console.error(error) && reject(error))
    }

    if (typeof Panacea === 'undefined') {
      bootstrap(panaceaFile).then(() => {
        const { app, options } = Panacea.container
        // Test panaceaFile is expected to return port as a Promise to allow
        // portfinder to resolve an available port.
        Promise.resolve(options.main.port).then(port => {
          app.listen(port, graphqlQueryRequest(query, variables))
        })
      }).catch((error: Error) => console.error(error) && reject(error))
    } else {
      graphqlQueryRequest(query, variables)
    }
  })
}

export { bootstrap, graphqlQuery, initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
