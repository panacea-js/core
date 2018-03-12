import test from 'ava'
import { initTasks } from './test-common'
import path from 'path'
import panacea from '../../index'

initTasks(test)

test.serial('Fully loaded and bootstrapped panacea core works without errors', async t => {
  panacea(path.resolve(__dirname, 'fixtures/panaceaConfigFiles/default.js')).then(config => {
    t.pass()
  }).catch(err => console.error(err))
})

test.serial('core.reload hook reloads the graphql middleware with a CopyCat entity newly available in graphQLTypeDefinitions and entities registry', async t => {
  t.plan(2)

  const { _, hooks, log, fs, entities, graphQLTypeDefinitions } = DI.container

  await panacea(path.resolve(__dirname, 'fixtures/panaceaConfigFiles/default.js')).then(config => {
    log.on('data', data => {
      if (data.message.indexOf('Reloaded graphql middleware') !== -1) {
        t.true(_(entities.getData()).has('CopyCat'))

        graphQLTypeDefinitions().then(data => {
          t.true(data.indexOf('type CopyCat') !== -1)
        })
      }
    })

    fs.copyFileSync(path.resolve(__dirname, 'fixtures/entities/schemas/Cat.yml'), path.resolve(__dirname, 'fixtures/entities/schemas/CopyCat.yml'))
    hooks.invoke('core.reload', 'testing reload hook')
  }).catch(err => console.error(err))

  fs.unlinkSync(path.resolve(__dirname, 'fixtures/entities/schemas/CopyCat.yml'))
})

test.serial('Attempting to load panacea core searches for panacea.js in cwd() when no path is supplied as the argument', async t => {
  try {
    panacea().then(data => console.log(data)).catch(err => console.log(err))
  } catch (error) {
    // Failure expected as there is no panacea.js file in cwd() for core tests.
    t.true(error.message.indexOf('Could not load panacea.js config file') !== -1)
  }
})
