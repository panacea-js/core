/**
 * Load main application configuration from distributed file merging in
 * app.config.json in root of application if found
 *
 * @returns Promise
 */
const appConfig = function() {

  return new Promise(function(resolve, reject) {

    const { _, fs} = DI.container

    const distConfigFilePath = './src/app.config.json'
    const overridesConfigFilePath = './app.config.json'

    let config = fs.readJsonSync(distConfigFilePath)

    /* istanbul ignore else */
    if (fs.pathExistsSync(overridesConfigFilePath)) {
      let overridenConfig = fs.readJsonSync(overridesConfigFilePath)
      _.extend(config, overridenConfig)
    }

    return resolve(config)
  })

}

export { appConfig }