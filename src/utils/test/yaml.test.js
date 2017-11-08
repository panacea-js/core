import test from 'ava'
import { initTasks } from '../../test/setup-test-env.js'
initTasks(test)

const { loadYmlFiles, glob } = DI.container

test('Calling loadYmlFiles should throw Error when no directory is provided', t => {
  t.throws(() => loadYmlFiles(), Error)
})

test('Glob returns a non-empty array when files are found', t => {
  const directory = './src/test/fixtures/yml'
  let files = glob.sync(directory + '/*.yml')
  t.true(files.length > 0)
})

test('Call to loadYmlFiles returns a non empty object when YML files are available', t => {
  const directory = './src/test/fixtures/yml'
  const results = loadYmlFiles(directory)
  t.true(results !== {})
})

test('Call to loadYmlFiles returns correct structured data', t => {
  const directory = './src/test/fixtures/yml'
  const results = loadYmlFiles(directory)

  const test1 = results.hasOwnProperty('Cat')
  const test2 = results.Cat.hasOwnProperty('description')
  const test3 = results.Cat.description === 'Lovely furry thing'
  const test4 = results.Cat.fields.breed.label === 'Breed'

  t.true(test1 && test2 && test3 && test4)
})
