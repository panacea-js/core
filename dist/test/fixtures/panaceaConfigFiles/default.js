"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testCommon_1 = require("../../testCommon");
const path = require("path");
const portfinder = require("portfinder");
const sandboxDir = testCommon_1.getSandboxDir();
// Add extra port entropy to portfinder start port to prevent port clashes.
// This is a workaround for portfinder as it is doesn't return an available port every time.
const microTime = Math.ceil(Date.now() % 1000);
const availablePort = (startPort) => portfinder.getPortPromise({ host: '127.0.0.1', port: startPort + microTime });
function default_1() {
    return {
        main: {
            port: availablePort(6000),
            protocol: 'http',
            disableCors: true,
            host: process.env.APP_SERVE_HOST || 'localhost',
            endpoint: process.env.APP_SERVE_ENDPOINT || 'graphql',
        },
        services: {
            options: {
                log: {
                    directory: `${sandboxDir}/logs`,
                    maxSize: '1024k',
                    showLogsInConsole: false,
                    logToFiles: true
                },
                db: {
                    type: 'mongodb',
                    host: 'localhost',
                    dbName: `panacea-test-${process.pid}`,
                    // Not using default port 27017 to prevent a possible clash with non-test mongo instance.
                    port: 27018
                }
            }
        },
        entityTypes: {
            test: {
                path: path.resolve(__dirname, '..', 'entityTypes/schemas'),
                locationKey: 'test'
            },
            sandbox: {
                path: `${sandboxDir}`,
                locationKey: 'sandbox'
            }
        }
    };
}
exports.default = default_1;
//# sourceMappingURL=default.js.map