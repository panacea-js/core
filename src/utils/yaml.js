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
export function loadYmlFiles (directory) {
  const { jsYaml, fs, _, glob, path } = DI.container

  let result = {}

  if (!fs.pathExistsSync(directory)) throw Error(`Directory ${directory} doesn't exist.`)

  let files = glob.sync(directory + '/*.yml')

  files.map(file => {
    // Entity type name is the file name stub.
    const filePath = path.resolve(file)
    let filename = _(file).split('/').last().replace('.yml', '')
    const fileContents = jsYaml.safeLoad(fs.readFileSync(file, 'utf8'))
    if (fileContents) {
      fileContents._filePath = filePath
      result[filename] = fileContents
    }
  })

  return result
}
