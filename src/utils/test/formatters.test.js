import test from 'ava'
import { initTasks } from '../../test/setup-test-env.js'
initTasks(test)

const { formatters } = DI.container

test('compileNestFromDotSeparated can successfully create a nest', t => {
  t.plan(2)

  // Compile a nest for hook 'myTestHook.secondLevel.thirdLevel'
  const hookTop = 'myTestHook'
  const hookSecond = 'secondLevel'
  const hookThird = 'thirdLevel'

  const hook = `${hookTop}.${hookSecond}.${hookThird}`

  const nest = {}
  formatters.compileNestFromDotSeparated(hook, nest)

  t.true(nest.hasOwnProperty(hookTop))

  // Pass the already compiled nest with the hook 'myTestHook.secondLevel.anotherThirdLevel'
  const anotherHookThird = 'anotherThirdLevel'
  const anotherHook = `${hookTop}.${hookSecond}.${anotherHookThird}`

  formatters.compileNestFromDotSeparated(anotherHook, nest)

  t.true(nest[hookTop][hookSecond].hasOwnProperty(anotherHookThird))
})

test('formatNestedObjectKeys can successfully format the output from a nest', t => {
  // Compile a nest for hook 'myTestHook.secondLevel.thirdLevel'
  const hookTop = 'myTestHook'
  const hookSecond = 'secondLevel'
  const hookThird = 'thirdLevel'

  const hook = `${hookTop}.${hookSecond}.${hookThird}`

  const nest = {}
  formatters.compileNestFromDotSeparated(hook, nest)
  const output = formatters.formatNestedObjectKeys(nest)

  const allLevelsCreated = output.indexOf('- myTestHook') !== -1 &&
    output.indexOf('- secondLevel') !== -1 &&
    output.indexOf('- thirdLevel') !== -1

  t.true(allLevelsCreated)
})
