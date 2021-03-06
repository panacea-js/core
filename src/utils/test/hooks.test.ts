import test from 'ava'
import { bootstrap, initTasks } from '../../test/testCommon'
initTasks(test)
bootstrap()

const { hooks } = Panacea.container

test('Hook listener can be registered and stored in the _events list', t => {
  hooks.on('listenerIsRegistered', data => {
    // Nothing to do here - it's registered.
  })

  t.true(hooks.eventNames().includes('listenerIsRegistered'))
})

test('Hooks can be invoked (twice) with a default value made available to listener', t => {
  t.plan(2)

  hooks.on('invokable', data => {
    t.true(data.defaultValue === 'isCorrectlySetAndAvailable')
  })

  hooks.invoke('invokable', { defaultValue: 'isCorrectlySetAndAvailable' })

  // Double invocation should be perfectly fine too.
  hooks.invoke('invokable', { defaultValue: 'isCorrectlySetAndAvailable' })
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

  hooks.invoke('persistentData', { defaultValue: 'isCorrectlySetAndAvailable' })
})

test('Available hooks can be retrieved', t => {
  t.true(hooks.getAvailableHooks().length > 0)
})

test('Logging of available hooks works as nested', t => {
  t.plan(2)

  hooks.invoke('invokable.NestedProperty')

  const availableHooks = hooks.getAvailableHooksOutput()

  t.true(availableHooks.indexOf(' - invokable') !== -1)
  t.true(availableHooks.indexOf('   - NestedProperty') !== -1)
})

test('Logging of available hooks works as not nested', t => {
  t.plan(5)

  const availableHooks = hooks.getAvailableHooksOutput(false)

  t.true(availableHooks.indexOf('Available hooks') !== -1)
  t.true(availableHooks.indexOf('  - invokable') !== -1)
  t.true(availableHooks.indexOf('  - invokable.NestedProperty') !== -1)
  t.true(availableHooks.indexOf('  - invokableNoData') !== -1)
  t.true(availableHooks.indexOf('  - persistentData') !== -1)
})

test('Can load hooks from a directory', async t => {
  t.plan(2)

  // ./ syntax.
  await hooks.loadFromDirectories(['./dist/test/fixtures/hooks'])
  t.true(hooks.eventNames().includes('core.graphql.definitions.types'))

  // Relative from project root syntax.
  await hooks.loadFromDirectories(['dist/test/fixtures/hooks'])
  t.true(hooks.eventNames().includes('core.graphql.definitions.types'))
})

test('Fails with error message when hooks directory does not exist', async t => {
  const result = await hooks.loadFromDirectories(['./dist/test/fixtures/hooks-dir-doesnt-exist'])
  t.true(result.indexOf('Could not load hooks from') !== -1)
})
