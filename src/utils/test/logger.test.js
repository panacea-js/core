import test from 'ava'
import { initTasks, getSandboxDir } from '../../test/setup-test-env.js'
initTasks(test)

const { fs, log } = DI.container

test('Logger can write some text to combined log file', t => {
  t.plan(2)

  const sandboxDir = getSandboxDir()

  console.log(`${sandboxDir}/logs`)

  t.true(fs.existsSync(`${sandboxDir}/logs`))

  const testString = 'Some text to try and write'

  log.info(testString)

  const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8')

  t.true(logFileContent.indexOf(testString) !== -1)
})
