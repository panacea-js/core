"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../../test/testCommon");
const staticRequireCoreHooks_1 = require("./staticRequireCoreHooks");
testCommon_1.initTasks(ava_1.default);
staticRequireCoreHooks_1.default();
const sandboxDir = testCommon_1.getSandboxDir();
ava_1.default('Date testing', async (t) => {
    t.pass();
});
//# sourceMappingURL=dates.test.js.map