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

const graphqlQuery = function (query, panaceaFile = 'default') {
  return new Promise((resolve, reject) => {
    const graphqlQueryRequest = function (query) {
      const { options } = Panacea.container
      const url = `${options.main.protocol}://${options.main.host}:${options.main.port}/${options.main.endpoint}`
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      .then(response => resolve(response.json()))
      .catch(error => console.error(error) && reject(error))
    }

    if (typeof Panacea === 'undefined') {
      bootstrap(panaceaFile).then(() => {
        const { options, app } = Panacea.container
        app.listen(options.main.port, graphqlQueryRequest(query))
      })
    } else {
      graphqlQueryRequest(query)
    }
  })
}

export { bootstrap, graphqlQuery, initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
