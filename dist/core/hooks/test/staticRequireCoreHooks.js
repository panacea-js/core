"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const bootstrap_1 = require("../../../utils/bootstrap");
// Override bootstrap stage 4 so as to statically include core hooks.
// This is required because istanbul doesn't cover dynamic require statements.
bootstrap_1.default.prototype.stage4 = function () {
    const { hooks } = Panacea.container;
    require('../entities/dates').default.register(hooks);
    require('../entities/entities').default.register(hooks);
    require('../entities/fields').default.register(hooks);
    require('../entities/revisions').default.register(hooks);
    require('../graphql/resolvers/entities').default.register(hooks);
    require('../graphql/resolvers/entityTypes').default.register(hooks);
    require('../graphql/schema/entities').default.register(hooks);
    require('../graphql/schema/entityTypes').default.register(hooks);
    require('../graphql/schema/filters').default.register(hooks);
};
const bootstrap = function (panaceaFile = 'default', runStages = []) {
    const panaceaConfigFile = path.resolve(__dirname, `../../../test/fixtures/panaceaConfigFiles/${panaceaFile}`);
    if (runStages.length > 0) {
        return new bootstrap_1.default(panaceaConfigFile).runStages(runStages);
    }
    return new bootstrap_1.default(panaceaConfigFile).all();
};
exports.bootstrap = bootstrap;
//# sourceMappingURL=staticRequireCoreHooks.js.map