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

const graphqlQuery = function (query: string, variables?: object, panaceaFile = 'default', fetchOptions = {}, bootstrapFactory?: any) {
  if (!bootstrapFactory) {
    bootstrapFactory = bootstrap
  }
  return new Promise((resolve, reject) => {
    const graphqlQueryRequest = function (query: string, variables?: object) {
      const { options, _ } = Panacea.container

      return options.main.port.then(port => {
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
          .catch(error => {
            console.error(error)
            return reject(error)
          })
      }).catch(error => {
        console.error(error)
        return reject(error)
      })
    }

    if (typeof Panacea === 'undefined') {
      bootstrapFactory(panaceaFile).then(() => {
        const { app, options } = Panacea.container
        // Test panaceaFile is expected to return port as a Promise to allow
        // portfinder to resolve an available port.
        Promise.resolve(options.main.port).then(port => {
          app.listen(port, () => graphqlQueryRequest(query, variables))
        })
      }).catch((error: Error) => {
        console.error(error)
        reject(error)
      })
    } else {
      graphqlQueryRequest(query, variables)
    }
  })
}

export { bootstrap, graphqlQuery, initTasks, getSandboxDir, getTestingKey, entityHasErrorMessage }
