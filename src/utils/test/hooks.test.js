import test from 'ava'
import { initTasks } from '../../test/setup-test-env.js'
import { getSandboxDir } from '../../test/test-common'
initTasks(test)
const { hooks, fs } = DI.container
const sandboxDir = getSandboxDir()

test('Hook listener can be registered and stored in the _events list', t => {
  hooks.on('listenerIsRegistered', data => {
    // Stub
  })

  t.true(typeof hooks._events.listenerIsRegistered !== 'undefined')
})

test('Hooks can be invoked with a default value made available to listener', t => {
  hooks.on('invokable', data => {
    t.true(data.defaultValue === 'isCorrectlySetAndAvailable')
  })

  hooks.invoke('invokable', {defaultValue: 'isCorrectlySetAndAvailable'})

  // Double invocation should be perfectly fine too.
  hooks.invoke('invokable', {defaultValue: 'isCorrectlySetAndAvailable'})
})

test('Hooks can be invoked without default data where the listeners should receive a null object', t => {
  hooks.on('invokableNoData', data => {
    t.true(data === null)
  })

  hooks.invoke('invokableNoData')
})

test('Multiple listeners can alter the data passed to them which persists', t => {
  hooks.on('persistentData', data => {
    data.addedProperty = 'catchMeIfYouCan'
  })

  hooks.on('persistentData', data => {
    t.true(data.addedProperty === 'catchMeIfYouCan')
    // Double check data from invoke call is still available.
    t.true(data.defaultValue === 'isCorrectlySetAndAvailable')
  })

  hooks.invoke('persistentData', {defaultValue: 'isCorrectlySetAndAvailable'})
})

test('Available hooks can be retrieved', t => {
  t.true(hooks.getAvailableHooks().length > 0)
})

test('Logging of available hooks works as nested', async t => {
  await hooks.logAvailableHooks()

  const mockLoggerContents = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

  t.true(mockLoggerContents.indexOf('Available hooks:') !== -1)
})

test('Logging of available hooks works as not nested', async t => {
  await hooks.logAvailableHooks(false)

  const mockLoggerContents = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

  t.true(mockLoggerContents.indexOf('Available hooks:') !== -1)
})

test('Can load hooks from a directory', async t => {
  t.plan(2)

  // ./ syntax.
  await hooks.loadFromDirectories(['./src/test/fixtures/hooks'])
  t.true(typeof hooks._events['core.graphql.definitions.types'] !== 'undefined')

  // Relative from project root syntax.
  await hooks.loadFromDirectories(['src/test/fixtures/hooks'])
  t.true(typeof hooks._events['core.graphql.definitions.types'] !== 'undefined')
})

test('Fails with error message when hooks directory does not exist', async t => {
  const result = await hooks.loadFromDirectories(['./src/test/fixtures/hooks-dir-doesnt-exist'])
  t.true(result.indexOf('Could not load hooks from src/test/fixtures/hooks-dir-doesnt-exist') !== -1)
})

// Executes before other tests
test.serial('Logging of available hooks displays "None" when there are no hook invocations found', async t => {
  hooks.logAvailableHooks(false)

  const mockLoggerContents = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

  t.true(mockLoggerContents.indexOf('Available hooks: None') !== -1)
})
