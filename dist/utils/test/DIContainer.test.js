"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const path = require("path");
const lodash_1 = require("lodash");
const testCommon_1 = require("../../test/testCommon");
const DIContainer_1 = require("../DIContainer");
testCommon_1.initTasks(ava_1.default);
testCommon_1.bootstrap();
const testDir = path.resolve(__dirname, '../../test');
const panaceaConfig = require(path.resolve(testDir, 'fixtures/panaceaConfigFiles/default.ts'));
ava_1.default('Panacea.container registers correctly to global Panacea object with no params passed in', t => {
    DIContainer_1.registerServices(panaceaConfig);
    t.true(Panacea.container.hasOwnProperty('options'));
});
ava_1.default('Panacea.container successfully overrides injected arguments', t => {
    t.plan(2);
    const clonedConfig = lodash_1.cloneDeep(panaceaConfig);
    clonedConfig.services.globalVariable = 'Panacea_Testing';
    DIContainer_1.registerServices(clonedConfig);
    // @ts-ignore
    t.true(Panacea_Testing.container.hasOwnProperty('options'));
    // @ts-ignore
    t.true(Panacea_Testing.container.options.services.globalVariable === 'Panacea_Testing');
});
//# sourceMappingURL=DIContainer.test.js.map