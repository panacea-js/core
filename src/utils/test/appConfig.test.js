import test from 'ava'
import { initTasks } from '../../test/setup-test-env.js'
initTasks(test)

const { appConfig } = DI.container

test.serial('appConfig object loads correctly first time', async t => {

  return new Promise((resolve, reject) => {
    appConfig().then(config => {
      resolve(config.hasOwnProperty('directories') ? t.pass() : t.fail('Directories property not found on config object'))
    }).catch((error) => {
      reject(t.fail(error))
    })
  })

})

test.serial('appConfig object loads correctly from static cache', async t => {

  return new Promise((resolve, reject) => {
    appConfig().then(config => {
      resolve(config.hasOwnProperty('directories') ? t.pass() : t.fail('Directories property not found on config object'))
    }).catch((error) => {
      reject(t.fail(error))
    })
  })

})