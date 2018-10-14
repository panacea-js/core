const { i18n } = Panacea.container

/**
 * Get structures data from stored yml files in a directory.
 *
 * @param directory String
 *   The directory to search for yml files.
 *
 * @returns object
 *   Keyed by the filename.
 *   Value is a parsed YAML to JSON.
 */
export function loadYmlFiles (directory: string) {
  const { jsYaml, fs, _, glob, path } = Panacea.container

  let result: any = {}

  if (!fs.pathExistsSync(directory)) {
    return new Error(i18n.t('core.yaml.noDirectory', { directory })) // Directory {directory} doesn't exist.
  }

  let files = glob.sync(directory + '/*.yml')

  files.map(file => {
    // Entity type name is the file name stub.
    const filePath = path.resolve(file)
    let filename = _(file).split('/').last()
    if (filename) {
      filename = filename.replace('.yml', '')
      const fileContents = jsYaml.safeLoad(fs.readFileSync(file, 'utf8'))
      if (fileContents) {
        fileContents._filePath = filePath
        result[filename] = fileContents
      }
    }
  })

  return result
}

/**
 * Write yml output to a file from JSON data.
 *
 * @param filepath
 * @param data
 * @param options
 * @returns {*}
 */
export function writeYmlFile (filepath: string, data: any, options = {}): string {
  const { jsYaml, fs } = Panacea.container
  const ymlData = jsYaml.safeDump(data, options)
  fs.outputFileSync(filepath, ymlData)
  return ymlData
}
