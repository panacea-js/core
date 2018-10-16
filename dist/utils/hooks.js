"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events = require("events");
const Hooks = events.EventEmitter;
Hooks.prototype.availableHooks = [];
Hooks.prototype.invoke = function (type, defaultData = null) {
    if (this.availableHooks.indexOf(type) === -1)
        this.availableHooks.push(type);
    let returnData = null;
    this.once(type, function (data) {
        returnData = data;
    });
    this.emit(type, defaultData);
    return returnData;
};
Hooks.prototype.getAvailableHooks = function () {
    return this.availableHooks;
};
Hooks.prototype.getAvailableHooksOutput = function (nested = true) {
    const { formatters, i18n } = Panacea.container;
    let output = i18n.t('core.hooks.none');
    if (nested) {
        const nest = this.getAvailableHooks().map(hook => formatters.compileNestFromDotSeparated(hook));
        output = formatters.formatNestedObjectKeys(nest);
    }
    else if (this.getAvailableHooks().length > 0) {
        output = '\n  - ' + exports.hooks.getAvailableHooks().join('\n  - ');
    }
    return i18n.t('core.hooks.available', { output });
};
Hooks.prototype.loadFromDirectories = function (paths) {
    const { path, fs, log, chalk, glob, i18n } = Panacea.container;
    let result = '';
    paths.forEach(function (hooksDirectory) {
        const resolvedPath = path.resolve(hooksDirectory);
        if (!fs.pathExistsSync(resolvedPath)) {
            result = i18n.t('core.hooks.cannotLoadFromPath', { resolvedPath });
            log.warn(result);
            return;
        }
        const hookFiles = glob.sync(path.resolve(hooksDirectory) + '/**/*.+(js|ts)', { ignore: '**/*test.+(js|ts)' });
        hookFiles.forEach(filePath => {
            const file = require(filePath);
            if (!file.hasOwnProperty('default')) {
                result = i18n.t('core.hooks.shouldExportObject', { filePath });
                log.warn(result);
                return;
            }
            if (!file.default.hasOwnProperty('register')) {
                result = i18n.t('core.hooks.couldNotRegister', { filePath });
                log.warn(result);
                return;
            }
            file.default.register(exports.hooks);
            log.info(chalk.green(i18n.t('core.hooks.registeredPath', { filePath })));
        });
    });
    return result;
};
exports.hooks = new Hooks();
//# sourceMappingURL=hooks.js.map