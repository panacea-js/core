"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap();
const { Logger } = require('../logger');
const { fs, log } = Panacea.container;
ava_1.default('Check log sandbox directory exists', async (t) => {
    const sandboxDir = testCommon_1.getSandboxDir();
    t.true(fs.existsSync(`${sandboxDir}/logs`));
});
ava_1.default('Logger can write some text to combined log file', t => {
    return new Promise((resolve, reject) => {
        const sandboxDir = testCommon_1.getSandboxDir();
        const testString = 'Some text to try and write';
        log.info(testString);
        // Wait 100ms to give logger a chance to write file before
        // checking contents.
        setTimeout(() => {
            const logFileContent = fs.readFileSync(`${sandboxDir}/logs/combined.log`, 'UTF-8');
            if (logFileContent.indexOf(testString) !== -1) {
                resolve(t.pass());
            }
            reject(Error(`Could not find testString in ${sandboxDir}/logs/combined.log`));
        }, 100);
    });
});
ava_1.default('Logger should ignore file transports when option is set', t => {
    const sandboxDir = testCommon_1.getSandboxDir();
    const options = {
        directory: `${sandboxDir}/logs`,
        maxSize: 1048576,
        showLogsInConsole: true,
        logToFiles: false // << This is what's being tested
    };
    const mockLogger = Logger(options);
    for (let transport in mockLogger.transports) {
        if (mockLogger.transports[transport].dirname !== undefined) {
            t.fail('File transport found when it should not');
        }
    }
    t.pass();
});
ava_1.default('Logger should ignore console transports when option is set', t => {
    const sandboxDir = testCommon_1.getSandboxDir();
    const options = {
        directory: `${sandboxDir}/logs`,
        maxSize: 1048576,
        showLogsInConsole: false,
        logToFiles: true
    };
    const mockLogger = Logger(options);
    for (let transport in mockLogger.transports) {
        if (mockLogger.transports[transport].dirname === undefined) {
            t.fail('Console transport found when it should not');
        }
    }
    t.pass();
});
//# sourceMappingURL=logger.test.js.map