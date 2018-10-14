"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap();
const { formatters } = Panacea.container;
ava_1.default('compileNestFromDotSeparated can successfully create a nest', t => {
    t.plan(2);
    // Compile a nest for hook 'myTestHook.secondLevel.thirdLevel'
    const hookTop = 'myTestHook';
    const hookSecond = 'secondLevel';
    const hookThird = 'thirdLevel';
    const hook = `${hookTop}.${hookSecond}.${hookThird}`;
    const nest = {};
    formatters.compileNestFromDotSeparated(hook, nest);
    t.true(nest.hasOwnProperty(hookTop));
    // Pass the already compiled nest with the hook 'myTestHook.secondLevel.anotherThirdLevel'
    const anotherHookThird = 'anotherThirdLevel';
    const anotherHook = `${hookTop}.${hookSecond}.${anotherHookThird}`;
    formatters.compileNestFromDotSeparated(anotherHook, nest);
    t.true(nest[hookTop][hookSecond].hasOwnProperty(anotherHookThird));
});
ava_1.default('formatNestedObjectKeys can successfully format the output from a nest', t => {
    // Compile a nest for hook 'myTestHook.secondLevel.thirdLevel'
    const hookTop = 'myTestHook';
    const hookSecond = 'secondLevel';
    const hookThird = 'thirdLevel';
    const hook = `${hookTop}.${hookSecond}.${hookThird}`;
    const nest = {};
    formatters.compileNestFromDotSeparated(hook, nest);
    const output = formatters.formatNestedObjectKeys(nest);
    const allLevelsCreated = output.indexOf('- myTestHook') !== -1 &&
        output.indexOf('- secondLevel') !== -1 &&
        output.indexOf('- thirdLevel') !== -1;
    t.true(allLevelsCreated);
});
ava_1.default('convertFileSizeShortHandToBytes works for 2 kilobytes', t => {
    t.plan(5);
    const expected = 2 * Math.pow(1024, 1);
    t.true(formatters.convertFileSizeShortHandToBytes('2k') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2K') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2KB') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2Kb') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2kb') === expected);
});
ava_1.default('convertFileSizeShortHandToBytes works for 2 megabytes', t => {
    t.plan(5);
    const expected = 2 * Math.pow(1024, 2);
    t.true(formatters.convertFileSizeShortHandToBytes('2m') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2M') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2MB') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2Mb') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2mb') === expected);
});
ava_1.default('convertFileSizeShortHandToBytes works for 2 gigabytes', t => {
    t.plan(5);
    const expected = 2 * Math.pow(1024, 3);
    t.true(formatters.convertFileSizeShortHandToBytes('2g') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2G') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2GB') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2Gb') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2gb') === expected);
});
ava_1.default('convertFileSizeShortHandToBytes works for 2 terabytes', t => {
    t.plan(5);
    const expected = 2 * Math.pow(1024, 4);
    t.true(formatters.convertFileSizeShortHandToBytes('2t') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2T') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2TB') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2Tb') === expected);
    t.true(formatters.convertFileSizeShortHandToBytes('2tb') === expected);
});
ava_1.default('convertFileSizeShortHandToBytes throws error on unsolvable string', t => {
    t.true(formatters.convertFileSizeShortHandToBytes('2iB') instanceof TypeError);
});
ava_1.default('convertFileSizeShortHandToBytes returns the input value when not a string', t => {
    t.true(formatters.convertFileSizeShortHandToBytes(200) === 200);
});
ava_1.default('convertFileSizeShortHandToBytes converts value without any suffix to integer', t => {
    t.true(formatters.convertFileSizeShortHandToBytes('200') === 200);
});
//# sourceMappingURL=formatters.test.js.map