"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
testCommon_1.initTasks(ava_1.default);
const sandboxDir = testCommon_1.getSandboxDir();
ava_1.default('Invalid plugin locations shows warning', t => {
    return new Promise(resolve => {
        testCommon_1.bootstrap('invalidPlugin', [1, 2, 3]);
        const { fs } = Panacea.container;
        // Wait 100ms to give logger a chance to write file before
        // checking contents.
        setTimeout(() => {
            const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8');
            t.true(logFileContent.indexOf('If this is a external (contributed) plugin: Check that you have run') !== -1);
            resolve();
        }, 100);
    });
});
//# sourceMappingURL=plugins.invalidPlugin.test.js.map