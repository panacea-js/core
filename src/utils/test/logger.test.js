import test from 'ava'
import { initTasks, getSandboxDir } from '../../test/test-common'
import { Logger } from '../logger'
initTasks(test)

const { fs, log } = DI.container

test('Logger can write some text to combined log file', t => {
  t.plan(2)

  const sandboxDir = getSandboxDir()

  t.true(fs.existsSync(`${sandboxDir}/logs`))

  const testString = 'Some text to try and write'

  log.info(testString)

  const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

  t.true(logFileContent.indexOf(testString) !== -1)
})

test('Logger should ignore file transports when option is set', t => {

  const sandboxDir = getSandboxDir()

  const options = {
    directory: `${sandboxDir}/logs`,
    maxSize: 1048576,
    showLogsInConsole: true,
    logToFiles: false // << This is what's being tested
  }

  const mockLogger = Logger(options)

  for (let transport in mockLogger.transports) {
    if (mockLogger.transports[transport].dirname !== undefined) {
      t.fail("File transport found when it should not")
    }
  }

  t.pass()

})

test('Logger should ignore console transports when option is set', t => {

  const sandboxDir = getSandboxDir()

  const options = {
    directory: `${sandboxDir}/logs`,
    maxSize: 1048576,
    showLogsInConsole: false, // << This is what's being tested
    logToFiles: true
  }

  const mockLogger = Logger(options)

  for (let transport in mockLogger.transports) {
    if (mockLogger.transports[transport].dirname === undefined) {
      t.fail("Console transport found when it should not")
    }
  }

  t.pass()

})