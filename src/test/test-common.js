import fs from 'fs-extra'
import Bootstrap from '../utils/bootstrap'

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

const bootstrap = function (panaceaFile = 'default') {
  const panaceaConfigFile = `${__dirname}/fixtures/panaceaConfigFiles/${panaceaFile}.js`
  new Bootstrap(panaceaConfigFile).all()
}

export { bootstrap, initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
