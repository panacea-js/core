"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap('emptyPlugin');
const { registry } = Panacea.container;
ava_1.default('empty-plugin is in not in the plugin registry', t => {
    for (const plugin in registry.plugins) {
        if (plugin.indexOf('empty-plugin') !== -1) {
            t.fail();
        }
    }
    t.pass();
});
//# sourceMappingURL=plugins.emptyPlugin.test.js.map