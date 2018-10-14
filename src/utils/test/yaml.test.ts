import test from 'ava'
import { bootstrap, initTasks, getSandboxDir } from '../../test/testCommon'
initTasks(test)
bootstrap()

const { loadYmlFiles, writeYmlFile, glob, path } = Panacea.container

test('Calling loadYmlFiles should throw Error when no directory is provided', t => {
  t.true(loadYmlFiles() instanceof Error)
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

test('Writing a yaml file is successful', t => {
  const sandboxDir = getSandboxDir()
  const testFile = path.join(sandboxDir, 'writeYamlFileWithData.yml')
  const testData = {
    something: {
      appears: 'here'
    }
  }

  writeYmlFile(testFile, testData)

  const loadedYmlFiles = loadYmlFiles(sandboxDir)

  t.true(loadedYmlFiles.writeYamlFileWithData.something.appears === 'here')
})
