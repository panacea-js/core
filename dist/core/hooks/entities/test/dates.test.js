"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const testCommon_1 = require("../../../../test/testCommon");
const staticRequireCoreHooks_1 = require("../../test/staticRequireCoreHooks");
testCommon_1.initTasks(ava_1.default);
ava_1.default.serial('Can create an entity automatically saving the created date', t => {
    t.plan(3);
    const beforeTestTime = new Date();
    const createLizardQuery = (name) => `
    mutation {
      createLizard(fields: {
        name: "${name}"
      }) {
        id
      }
    }
  `;
    const createLizard = (name) => testCommon_1.graphqlQuery(createLizardQuery(name), {}, 'default', {}, staticRequireCoreHooks_1.bootstrap);
    const allLizardsQuery = `
    {
      lizards {
        id,
        name,
        _created,
        _updated,
        _deleted
      }
    }
  `;
    const allLizards = () => testCommon_1.graphqlQuery(allLizardsQuery, {}, 'default', {}, staticRequireCoreHooks_1.bootstrap);
    return createLizard('ScaleyLizardWithDate')
        .then(() => allLizards())
        .then((json) => {
        const now = new Date();
        const hasCreatedDate = !!json.data.lizards[0]._created;
        const savedCreatedDate = new Date(json.data.lizards[0]._created);
        t.true(hasCreatedDate);
        t.true(savedCreatedDate > beforeTestTime);
        t.true(savedCreatedDate < now);
    });
});
//# sourceMappingURL=dates.test.js.map