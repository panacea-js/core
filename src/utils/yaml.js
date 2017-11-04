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
export const loadYmlFiles = function(directory) {

  const { js_yaml, fs, _, glob } = DI.container

  let result = {}

  if (!fs.pathExistsSync(directory)) throw Error(`Directory ${directory} doesn't exist.`)

  let files = glob.sync(directory + '/*.yml')

  files.map(file => {
    // Entity type name is the file name stub.
    let filename = _(file).split('/').last().replace('.yml', '')
    result[filename] = js_yaml.safeLoad(fs.readFileSync(file, 'utf8'));
  })

  return result
}