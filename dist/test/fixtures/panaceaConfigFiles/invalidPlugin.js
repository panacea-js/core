"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const default_1 = require("./default");
const path = require("path");
function default_2() {
    const config = default_1.default();
    config.plugins = [
        path.resolve(__dirname, '..', 'plugins/invalid-plugin')
    ];
    return config;
}
exports.default = default_2;
//# sourceMappingURL=invalidPlugin.js.map