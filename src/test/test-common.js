import fs from 'fs-extra'

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

const entityHasErrorMessage = function(entity, message) {
  return entity._errors.filter(error => error.message === message).length > 0
}

export { initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
