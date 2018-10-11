"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { i18n } = Panacea.container;
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
function loadYmlFiles(directory) {
    const { jsYaml, fs, _, glob, path } = Panacea.container;
    let result = {};
    if (!fs.pathExistsSync(directory)) {
        return new Error(i18n.t('core.yaml.noDirectory', { directory })); // Directory {directory} doesn't exist.
    }
    let files = glob.sync(directory + '/*.yml');
    files.map(file => {
        // Entity type name is the file name stub.
        const filePath = path.resolve(file);
        let filename = _(file).split('/').last();
        if (filename) {
            filename = filename.replace('.yml', '');
            const fileContents = jsYaml.safeLoad(fs.readFileSync(file, 'utf8'));
            if (fileContents) {
                fileContents._filePath = filePath;
                result[filename] = fileContents;
            }
        }
    });
    return result;
}
exports.loadYmlFiles = loadYmlFiles;
/**
 * Write yml output to a file from JSON data.
 *
 * @param filepath
 * @param data
 * @param options
 * @returns {*}
 */
function writeYmlFile(filepath, data, options = {}) {
    const { jsYaml, fs } = Panacea.container;
    const ymlData = jsYaml.safeDump(data, options);
    fs.outputFileSync(filepath, ymlData);
    return ymlData;
}
exports.writeYmlFile = writeYmlFile;
//# sourceMappingURL=yaml.js.map