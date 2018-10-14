"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../test/testCommon");
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap('basicPlugin');
const { hooks, registry } = Panacea.container;
ava_1.default('basic-plugin has its testHooks file registered', t => {
    let pluginFound = false;
    for (const plugin in registry.plugins) {
        if (plugin.indexOf('basic-plugin') !== -1) {
            pluginFound = true;
        }
    }
    t.true(pluginFound);
});
ava_1.default('basic-plugin has its test listener is registered on the hooks event emitter', t => {
    t.true(hooks.eventNames().includes('basicPluginIsListening'));
});
//# sourceMappingURL=plugins.basicPlugin.test.js.map