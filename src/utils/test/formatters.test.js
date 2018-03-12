import test from 'ava'
import { bootstrap, initTasks } from '../../test/test-common'
initTasks(test)
bootstrap()

const { formatters } = Panacea.container

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

test('convertFileSizeShortHandToBytes works for 2 kilobytes', t => {
  t.plan(5)
  const expected = 2 * Math.pow(1024, 1)
  t.true(formatters.convertFileSizeShortHandToBytes('2k') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2K') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2KB') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2Kb') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2kb') === expected)
})

test('convertFileSizeShortHandToBytes works for 2 megabytes', t => {
  t.plan(5)
  const expected = 2 * Math.pow(1024, 2)
  t.true(formatters.convertFileSizeShortHandToBytes('2m') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2M') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2MB') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2Mb') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2mb') === expected)
})

test('convertFileSizeShortHandToBytes works for 2 gigabytes', t => {
  t.plan(5)
  const expected = 2 * Math.pow(1024, 3)
  t.true(formatters.convertFileSizeShortHandToBytes('2g') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2G') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2GB') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2Gb') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2gb') === expected)
})

test('convertFileSizeShortHandToBytes works for 2 terabytes', t => {
  t.plan(5)
  const expected = 2 * Math.pow(1024, 4)
  t.true(formatters.convertFileSizeShortHandToBytes('2t') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2T') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2TB') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2Tb') === expected)
  t.true(formatters.convertFileSizeShortHandToBytes('2tb') === expected)
})

test('convertFileSizeShortHandToBytes throws error on unsolvable string', t => {
  t.throws(() => formatters.convertFileSizeShortHandToBytes('2iB'))
})

test('convertFileSizeShortHandToBytes returns the input value when not a string', t => {
  t.true(formatters.convertFileSizeShortHandToBytes(200) === 200)
})

test('convertFileSizeShortHandToBytes converts value without any suffix to integer', t => {
  t.true(formatters.convertFileSizeShortHandToBytes('200') === 200)
})
