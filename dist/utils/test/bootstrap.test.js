"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
const path = require("path");
const index_1 = require("../../index");
const bootstrap_1 = require("../bootstrap");
testCommon_1.initTasks(ava_1.default);
const testDir = path.resolve(__dirname, '../../test');
ava_1.default.serial('Fully loaded and bootstrapped panacea core works without errors', async (t) => {
    index_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default')).then((message) => {
        t.true(message.indexOf('Completed full bootstrap') !== -1);
    }).catch((err) => console.error(err));
});
ava_1.default.serial('core.reload hook reloads the graphql middleware with a CopyCat entity newly available in graphQLTypeDefinitions and entity types registry', async (t) => {
    t.plan(3);
    const { _, hooks, log, fs, entityTypes, graphQLTypeDefinitions } = Panacea.container;
    await index_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default')).then((message) => {
        t.true(message.indexOf('Completed full bootstrap') !== -1);
        log.on('data', (data) => {
            if (data.message.indexOf('Reloaded graphql middleware') !== -1) {
                t.true(_(entityTypes.getData()).has('CopyCat'));
                graphQLTypeDefinitions().then(data => {
                    t.true(data.indexOf('type CopyCat') !== -1);
                });
            }
        });
        fs.copyFileSync(path.resolve(testDir, 'fixtures/entityTypes/schemas/Cat.yml'), path.resolve(testDir, 'fixtures/entityTypes/schemas/CopyCat.yml'));
        hooks.invoke('core.reload', { reason: 'testing reload hook' });
    }).catch((err) => console.error(err));
    fs.unlinkSync(path.resolve(testDir, 'fixtures/entityTypes/schemas/CopyCat.yml'));
});
ava_1.default.serial('Attempting to load panacea core, searches for panacea.js in cwd() when no path is supplied as the argument', t => {
    try {
        index_1.default().then((data) => console.log(data)).catch((err) => console.log(err));
    }
    catch (error) {
        // Failure expected as there is no panacea.js file in cwd() for core tests.
        t.true(error.message.indexOf('Could not load panacea.js config file') !== -1);
    }
});
ava_1.default.serial('Can bootstrap individual stages', async (t) => {
    t.plan(2);
    const bootstrap = await new bootstrap_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default'));
    t.true(typeof bootstrap.container === 'undefined');
    bootstrap.runStages([1, 2, 3]);
    t.true(typeof bootstrap.container === 'object');
});
ava_1.default.serial('Throws error when bootstrapping with invalid parameter', async (t) => {
    t.plan(3);
    const bootstrap = await new bootstrap_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default'));
    t.true(typeof bootstrap.container === 'undefined');
    const error = t.throws(() => bootstrap.runStages('1'));
    t.is(error.message, 'Stages parameter is invalid - should be an array of integers');
});
ava_1.default.serial('Throws error when bootstrapping with no parameter', async (t) => {
    t.plan(3);
    const bootstrap = await new bootstrap_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default'));
    t.true(typeof bootstrap.container === 'undefined');
    const error = t.throws(() => bootstrap.runStages());
    t.is(error.message, 'Stages parameter is invalid - should be an array of integers');
});
ava_1.default.serial('Throws error when bootstrapping with invalid stage (not a function)', async (t) => {
    t.plan(3);
    const bootstrap = await new bootstrap_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default'));
    t.true(typeof bootstrap.container === 'undefined');
    const error = t.throws(() => bootstrap.runStages([1000]));
    t.is(error.message, 'Stage 1000 specified is invalid');
});
ava_1.default.serial('Throws error when bootstrapping with invalid stage (not a number)', async (t) => {
    t.plan(3);
    const bootstrap = await new bootstrap_1.default(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default'));
    t.true(typeof bootstrap.container === 'undefined');
    const error = t.throws(() => bootstrap.runStages(['one']));
    t.is(error.message, 'Stage one specified is invalid');
});
//# sourceMappingURL=bootstrap.test.js.map