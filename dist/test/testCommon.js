"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const bootstrap_1 = require("../utils/bootstrap");
const node_fetch_1 = require("node-fetch");
const getTestingKey = function () {
    return `ava-test-${process.pid}`;
};
exports.getTestingKey = getTestingKey;
const getSandboxDir = function () {
    const testingKey = getTestingKey();
    return `/tmp/${testingKey}`;
};
exports.getSandboxDir = getSandboxDir;
const initTasks = function (test) {
    const sandboxDir = getSandboxDir();
    // Set up.
    test.before(t => {
        // @ts-ignore
    });
    // Tear down.
    test.after.always(t => {
        fs.removeSync(sandboxDir);
    });
};
exports.initTasks = initTasks;
const entityHasErrorMessage = function (entity, message) {
    if (!entity._errors) {
        return false;
    }
    return entity._errors.filter(error => error.message === message).length > 0;
};
exports.entityHasErrorMessage = entityHasErrorMessage;
const bootstrap = function (panaceaFile = 'default', runStages = []) {
    const panaceaConfigFile = `${__dirname}/fixtures/panaceaConfigFiles/${panaceaFile}.js`;
    if (runStages.length > 0) {
        return new bootstrap_1.default(panaceaConfigFile).runStages(runStages);
    }
    return new bootstrap_1.default(panaceaConfigFile).all();
};
exports.bootstrap = bootstrap;
const graphqlQuery = function (query, variables, panaceaFile = 'default', fetchOptions = {}) {
    return new Promise((resolve, reject) => {
        const graphqlQueryRequest = function (query, variables) {
            const { options, _ } = Panacea.container;
            options.main.port.then(port => {
                const url = `${options.main.protocol}://${options.main.host}:${port}/${options.main.endpoint}`;
                _.defaultsDeep(fetchOptions, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        variables
                    })
                });
                return node_fetch_1.default(url, fetchOptions)
                    .then(response => resolve(response.json()))
                    .catch(error => console.error(error) && reject(error));
            }).catch(error => console.error(error) && reject(error));
        };
        if (typeof Panacea === 'undefined') {
            bootstrap(panaceaFile).then(() => {
                const { app, options } = Panacea.container;
                // Test panaceaFile is expected to return port as a Promise to allow
                // portfinder to resolve an available port.
                Promise.resolve(options.main.port).then(port => {
                    app.listen(port, graphqlQueryRequest(query, variables));
                });
            }).catch((error) => console.error(error) && reject(error));
        }
        else {
            graphqlQueryRequest(query, variables);
        }
    });
};
exports.graphqlQuery = graphqlQuery;
//# sourceMappingURL=testCommon.js.map