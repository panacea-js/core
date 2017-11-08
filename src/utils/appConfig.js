/**
 * Load main application configuration from distributed file merging in
 * app.config.json in root of application if found
 *
 * @returns Promise
 */
export function appConfig () {
  return new Promise(function (resolve, reject) {
    const { fs } = DI.container

    const configFilePath = process.cwd() + '/app.config.json'

    let config = fs.readJsonSync(configFilePath)

    return resolve(config)
  })
}
