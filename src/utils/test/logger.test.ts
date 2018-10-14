import test from 'ava'
import { bootstrap, initTasks, getSandboxDir } from '../../test/testCommon'

initTasks(test)
bootstrap()

const { Logger } = require('../logger')
const { fs, log } = Panacea.container

test('Check log sandbox directory exists', async t => {
  const sandboxDir = getSandboxDir()
  t.true(fs.existsSync(`${sandboxDir}/logs`))
})

test('Logger can write some text to combined log file', t => {
  return new Promise((resolve, reject) => {
    const sandboxDir = getSandboxDir()

    const testString = 'Some text to try and write'

    log.info(testString)

    // Wait 100ms to give logger a chance to write file before
    // checking contents.
    setTimeout(() => {
      const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

      if (logFileContent.indexOf(testString) !== -1) {
        resolve(t.pass())
      }
      reject(Error(`Could not find testString in ${sandboxDir}/logs/combined.log`))
    }, 100)
  })
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
      t.fail('File transport found when it should not')
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
      t.fail('Console transport found when it should not')
    }
  }

  t.pass()
})
