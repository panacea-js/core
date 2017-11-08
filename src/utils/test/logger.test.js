import test from 'ava'
import { initTasks, getSandboxDir } from '../../test/setup-test-env.js'
initTasks(test)

const { fs, log } = DI.container

test('Logger can ensure log directory can by made in /tmp', t => {
  t.true(fs.existsSync(`/tmp/ava-test-${process.pid}/logs`))
})

test('Logger can write some text to combined log file', t => {
  t.plan(2)

  const sandboxDir = getSandboxDir()

  t.true(fs.existsSync(`${sandboxDir}/logs/combined.log`))

  const testString = 'Some text to try and write'

  log.info(testString)

  const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

  t.true(logFileContent.indexOf(testString) !== -1)
})
