"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap();
const { loadYmlFiles, writeYmlFile, glob, path } = Panacea.container;
ava_1.default('Calling loadYmlFiles should throw Error when no directory is provided', t => {
    t.true(loadYmlFiles() instanceof Error);
});
ava_1.default('Glob returns a non-empty array when files are found', t => {
    const directory = './src/test/fixtures/yml';
    let files = glob.sync(directory + '/*.yml');
    t.true(files.length > 0);
});
ava_1.default('Call to loadYmlFiles returns a non empty object when YML files are available', t => {
    const directory = './src/test/fixtures/yml';
    const results = loadYmlFiles(directory);
    t.true(results !== {});
});
ava_1.default('Call to loadYmlFiles returns correct structured data', t => {
    const directory = './src/test/fixtures/yml';
    const results = loadYmlFiles(directory);
    const test1 = results.hasOwnProperty('Cat');
    const test2 = results.Cat.hasOwnProperty('description');
    const test3 = results.Cat.description === 'Lovely furry thing';
    const test4 = results.Cat.fields.breed.label === 'Breed';
    t.true(test1 && test2 && test3 && test4);
});
ava_1.default('Writing a yaml file is successful', t => {
    const sandboxDir = testCommon_1.getSandboxDir();
    const testFile = path.join(sandboxDir, 'writeYamlFileWithData.yml');
    const testData = {
        something: {
            appears: 'here'
        }
    };
    writeYmlFile(testFile, testData);
    const loadedYmlFiles = loadYmlFiles(sandboxDir);
    t.true(loadedYmlFiles.writeYamlFileWithData.something.appears === 'here');
});
//# sourceMappingURL=yaml.test.js.map