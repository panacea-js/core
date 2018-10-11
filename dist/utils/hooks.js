"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import node core events.
const events = require("events");
// Create a Hooks base object which extends node's event emitter.
const Hooks = events.EventEmitter;
/**
 * Registry of hooks that have been invoked
 */
Hooks.prototype.availableHooks = [];
/**
 * Invoke method sets a one-time listener to capture the resulting data and then invokes all listeners.
 *
 * @param type
 *   The event type (i.e. the hook name)
 *
 * @param defaultData
 *   Optional default value which can be altered by other consuming listeners with the 'on' method.
 *
 * @returns any
 */
Hooks.prototype.invoke = function (type, defaultData = null) {
    // Add hook type to the availableHooks registry.
    if (this.availableHooks.indexOf(type) === -1)
        this.availableHooks.push(type);
    let returnData = null;
    this.once(type, function (data) {
        returnData = data;
    });
    this.emit(type, defaultData);
    return returnData;
};
/**
 * Get a list of available hooks registered in the application.
 *
 * The result may change over time, so it's suggested that this is called late in the bootstrap lifecycle.
 * For example, at the end of the main application entry point file.
 */
Hooks.prototype.getAvailableHooks = function () {
    return this.availableHooks;
};
/**
 * Return formatted output of available hooks registered in the application.
 *
 * The result may change over time, so it's suggested that this is called late in the bootstrap lifecycle.
 * For example, at the end of the main application entry point file.
 */
Hooks.prototype.getAvailableHooksOutput = function (nested = true) {
    const { formatters, i18n } = Panacea.container;
    let output = i18n.t('core.hooks.none'); // None
    if (nested) {
        const nest = this.getAvailableHooks().map(hook => formatters.compileNestFromDotSeparated(hook));
        output = formatters.formatNestedObjectKeys(nest);
    }
    else if (this.getAvailableHooks().length > 0) {
        output = '\n  - ' + exports.hooks.getAvailableHooks().join('\n  - ');
    }
    return i18n.t('core.hooks.available', { output }); // Available hooks: {output}
};
/**
 * Load application level hooks to react and alter passed data.
 *
 * @param paths Array
 *   A list of directories to load application level hooks which register listeners via the standard 'on' method.
 */
Hooks.prototype.loadFromDirectories = function (paths) {
    const { path, fs, log, chalk, glob, i18n } = Panacea.container;
    let result = '';
    paths.forEach(function (hooksDirectory) {
        const resolvedPath = path.resolve(hooksDirectory);
        if (!fs.pathExistsSync(resolvedPath)) {
            result = i18n.t('core.hooks.cannotLoadFromPath', { resolvedPath }); // Could not load hooks from {resolvedPath}
            log.warn(result);
            return;
        }
        const hookFiles = glob.sync(path.resolve(hooksDirectory) + '/**/*.js', { ignore: '**/*test.js' });
        hookFiles.forEach(filePath => {
            const file = require(filePath);
            if (!file.hasOwnProperty('default')) {
                result = i18n.t('core.hooks.shouldExportObject', { filePath }); // Hook file {filePath} should export an object. See the Panacea hooks documentation.
                log.warn(result);
                return;
            }
            if (!file.default.hasOwnProperty('register')) {
                result = i18n.t('core.hooks.couldNotRegister', { filePath }); // Could not execute register() in hook file: {filePath}.
                log.warn(result);
                return;
            }
            file.default.register(exports.hooks);
            log.info(chalk.green(i18n.t('core.hooks.registeredPath', { filePath }))); // Registered hooks in {filePath}
        });
    });
    return result;
};
// The instance gets passed around between modules from the service container.
exports.hooks = new Hooks();
//# sourceMappingURL=hooks.js.map