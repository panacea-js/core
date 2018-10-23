import * as fs from 'fs-extra'
import * as path from 'path'
import Bootstrap from '../utils/bootstrap'
import fetch from 'node-fetch'
import { TestInterface } from 'ava'

const getTestingKey = function () {
  return `ava-test-${process.pid}`
}

const getSandboxDir = function () {
  const testingKey = getTestingKey()

  return `/tmp/${testingKey}`
}

const initTasks = function (test: TestInterface) {
  const sandboxDir = getSandboxDir()

  // Set up.
  test.before(t => {
    // @ts-ignore
  })

  // Tear down.
  test.after.always(t => {
    fs.removeSync(sandboxDir)
  })
}

const entityHasErrorMessage = function (entity: EntityTypeDefinition, message: string) {
  if (!entity._errors) {
    return false
  }
  return entity._errors.filter(error => error.message === message).length > 0
}

/**
 * Override bootstrap stage 4 so as to statically include core hooks. This is
 * required because istanbul doesn't cover dynamic require statements.
 */
async function staticallyRegisterHooks () {
  const { hooks } = Panacea.container

  // Core hooks.
  require('../core/hooks/entities/dates').default.register(hooks)
  require('../core/hooks/entities/entities').default.register(hooks)
  require('../core/hooks/entities/fields').default.register(hooks)
  require('../core/hooks/entities/revisions').default.register(hooks)
  require('../core/hooks/graphql/resolvers/entities').default.register(hooks)
  require('../core/hooks/graphql/resolvers/entityTypes').default.register(hooks)
  require('../core/hooks/graphql/schema/entities').default.register(hooks)
  require('../core/hooks/graphql/schema/entityTypes').default.register(hooks)
  require('../core/hooks/graphql/schema/filters').default.register(hooks)

  // Test fixture (e.g. plugin) hooks.
  require('./fixtures/plugins/basic-plugin/hooks/testHooks').default.register(hooks)
}

const bootstrap = function (panaceaFile = 'default', runStages: Array<string> = []) {
  const panaceaConfigFile = path.resolve(__dirname, `fixtures/panaceaConfigFiles/${panaceaFile}`)

  const bootstrapInstance = new Bootstrap(panaceaConfigFile)

  bootstrapInstance.chain['20-register-hooks'] = staticallyRegisterHooks

  if (runStages.length > 0) {
    return bootstrapInstance.runStages(runStages)
  }
  return bootstrapInstance.all()
}

const graphqlQuery = async function (query: string, variables?: object, panaceaFile = 'default', fetchOptions = {}) {
  if (typeof Panacea === 'undefined') {
    await bootstrap(panaceaFile)
  }

  const { options, app, _ } = Panacea.container

  const port = await options.main.port

  const isListening = !!app.get('listeningPort')

  if (!isListening) {
    app.set('listeningPort', port)
    await app.listen(port)
  }

  const url = `${options.main.protocol}://${options.main.host}:${port}/${options.main.endpoint}`
  _.defaultsDeep(fetchOptions, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables
    })
  })
  const response = await fetch(url, fetchOptions)
  return response.json()
}

export { bootstrap, graphqlQuery, initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
