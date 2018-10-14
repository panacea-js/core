"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bootstrap_1 = require("./utils/bootstrap");
process.on('unhandledRejection', function (error, promise) {
    console.error('Unhandled rejection (promise: ', promise, ', reason: ', error, ').');
});
process.on('uncaughtException', function (error) {
    console.error('Caught exception: ' + error);
});
function default_1(panaceaConfigPath = '') {
    return new bootstrap_1.default(panaceaConfigPath).all();
}
exports.default = default_1;
//# sourceMappingURL=index.js.map