"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { i18n } = Panacea.container;
function loadYmlFiles(directory) {
    const { jsYaml, fs, _, glob, path } = Panacea.container;
    let result = {};
    if (!fs.pathExistsSync(directory)) {
        return new Error(i18n.t('core.yaml.noDirectory', { directory }));
    }
    let files = glob.sync(directory + '/*.yml');
    files.map(file => {
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
function writeYmlFile(filepath, data, options = {}) {
    const { jsYaml, fs } = Panacea.container;
    const ymlData = jsYaml.safeDump(data, options);
    fs.outputFileSync(filepath, ymlData);
    return ymlData;
}
exports.writeYmlFile = writeYmlFile;
//# sourceMappingURL=yaml.js.map