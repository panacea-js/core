"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolvePluginPath = function (pluginPath) {
    const { path, fs } = Panacea.container;
    const processRelativeNodeModulePluginPath = path.resolve(process.cwd(), 'node_modules', pluginPath);
    if (fs.existsSync(processRelativeNodeModulePluginPath)) {
        return processRelativeNodeModulePluginPath;
    }
    else if (fs.existsSync(path.resolve(pluginPath))) {
        return path.resolve(pluginPath);
    }
    return false;
};
exports.resolvePluginPath = resolvePluginPath;
//# sourceMappingURL=plugins.js.map