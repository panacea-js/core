"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../../../test/testCommon");
const sandboxDir = testCommon_1.getSandboxDir();
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap();
ava_1.default('Date testing', async (t) => {
    const Dates = require('../dates');
    console.log(Dates);
    t.pass();
});
//# sourceMappingURL=dates.test.js.map