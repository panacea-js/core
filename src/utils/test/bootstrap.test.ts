import test from 'ava'
import { initTasks } from '../../test/testCommon'
import * as path from 'path'
import panacea from '../../index'
import Bootstrap from '../bootstrap'
import { LogEntry } from 'winston';

initTasks(test)

const testDir = path.resolve(__dirname, '../../test')

test.serial('Fully loaded and bootstrapped panacea core works without errors', async t => {
  panacea(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js')).then((message: string) => {
    t.true(message.indexOf('Completed full bootstrap') !== -1)
  }).catch((err: Error) => console.error(err))
})

test.serial('core.reload hook reloads the graphql middleware with a CopyCat entity newly available in graphQLTypeDefinitions and entity types registry', async t => {
  t.plan(3)

  const { _, hooks, log, fs, entityTypes, graphQLTypeDefinitions } = Panacea.container

  await panacea(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js')).then((message: string) => {
    t.true(message.indexOf('Completed full bootstrap') !== -1)

    log.on('data', (data: LogEntry) => {
      if (data.message.indexOf('Reloaded graphql middleware') !== -1) {
        t.true(_(entityTypes.getData()).has('CopyCat'))

        graphQLTypeDefinitions().then(data => {
          t.true(data.indexOf('type CopyCat') !== -1)
        })
      }
    })

    fs.copyFileSync(path.resolve(testDir, 'fixtures/entityTypes/schemas/Cat.yml'), path.resolve(testDir, 'fixtures/entityTypes/schemas/CopyCat.yml'))
    hooks.invoke('core.reload', { reason: 'testing reload hook' })
  }).catch((err: Error) => console.error(err))

  fs.unlinkSync(path.resolve(testDir, 'fixtures/entityTypes/schemas/CopyCat.yml'))
})

test.serial('Attempting to load panacea core, searches for panacea.js in cwd() when no path is supplied as the argument', t => {
  try {
    panacea().then((data: any) => console.log(data)).catch((err: Error) => console.log(err))
  } catch (error) {
    // Failure expected as there is no panacea.js file in cwd() for core tests.
    t.true(error.message.indexOf('Could not load panacea.js config file') !== -1)
  }
})

test.serial('Can bootstrap individual stages', async t => {
  t.plan(2)
  const bootstrap = await new (Bootstrap as any)(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js'))
  t.true(typeof bootstrap.container === 'undefined')
  bootstrap.runStages([1, 2, 3])
  t.true(typeof bootstrap.container === 'object')
})

test.serial('Throws error when bootstrapping with invalid parameter', async t => {
  t.plan(3)
  const bootstrap = await new (Bootstrap as any)(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js'))
  t.true(typeof bootstrap.container === 'undefined')
  const error = t.throws(() => bootstrap.runStages('1'))
  t.is(error.message, 'Stages parameter is invalid - should be an array of integers')
})

test.serial('Throws error when bootstrapping with no parameter', async t => {
  t.plan(3)
  const bootstrap = await new (Bootstrap as any)(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js'))
  t.true(typeof bootstrap.container === 'undefined')
  const error = t.throws(() => bootstrap.runStages())
  t.is(error.message, 'Stages parameter is invalid - should be an array of integers')
})

test.serial('Throws error when bootstrapping with invalid stage (not a function)', async t => {
  t.plan(3)
  const bootstrap = await new (Bootstrap as any)(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js'))
  t.true(typeof bootstrap.container === 'undefined')
  const error = t.throws(() => bootstrap.runStages([1000]))
  t.is(error.message, 'Stage 1000 specified is invalid')
})

test.serial('Throws error when bootstrapping with invalid stage (not a number)', async t => {
  t.plan(3)
  const bootstrap = await new (Bootstrap as any)(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.js'))
  t.true(typeof bootstrap.container === 'undefined')
  const error = t.throws(() => bootstrap.runStages(['one']))
  t.is(error.message, 'Stage one specified is invalid')
})
