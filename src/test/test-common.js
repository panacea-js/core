import fs from 'fs-extra'
import Bootstrap from '../utils/bootstrap'
import fetch from 'node-fetch'

const getTestingKey = function () {
  return `ava-test-${process.pid}`
}

const getSandboxDir = function () {
  const testingKey = getTestingKey()

  return `/tmp/${testingKey}`
}

const initTasks = function (test) {
  const sandboxDir = getSandboxDir()

  // Set up.
  test.before(t => {
  })

  // Tear down.
  test.after.always(t => {
    fs.removeSync(sandboxDir)
  })
}

const entityHasErrorMessage = function (entity, message) {
  return entity._errors.filter(error => error.message === message).length > 0
}

const bootstrap = function (panaceaFile = 'default', runStages = []) {
  const panaceaConfigFile = `${__dirname}/fixtures/panaceaConfigFiles/${panaceaFile}.js`
  if (runStages.length > 0) {
    return new Bootstrap(panaceaConfigFile).runStages(runStages)
  }
  return new Bootstrap(panaceaConfigFile).all()
}

/**
 * Get a unique port for testing between 30000 and 49999 based on the process
 * id. This creates isolation between test files which ava runs as separate
 * processes.
 */
const uniquePort = function () {
  return 30000 + (process.pid % 20000)
}

const graphqlQuery = function (query, panaceaFile = 'default', fetchOptions = {}) {
  const port = uniquePort()
  return new Promise((resolve, reject) => {
    const graphqlQueryRequest = function (query) {
      const { options, _ } = Panacea.container
      const url = `${options.main.protocol}://${options.main.host}:${port}/${options.main.endpoint}`
      _.defaultsDeep(fetchOptions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      return fetch(url, fetchOptions)
      .then(response => resolve(response.json()))
      .catch(error => console.error(error) && reject(error))
    }

    if (typeof Panacea === 'undefined') {
      bootstrap(panaceaFile).then(() => {
        const { app } = Panacea.container
        app.listen(port, graphqlQueryRequest(query))
      })
    } else {
      graphqlQueryRequest(query)
    }
  })
}

export { bootstrap, graphqlQuery, initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
