"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { i18n } = Panacea.container;
const compileNestFromDotSeparated = function (hook, nest = {}) {
    if (hook.indexOf('.') !== -1) {
        let hookParts = hook.split('.');
        let shifted = hookParts.shift();
        if (!shifted) {
            return nest;
        }
        if (!nest.hasOwnProperty(shifted)) {
            nest[shifted] = {};
        }
        nest[shifted] = compileNestFromDotSeparated(hookParts.join('.'), nest[shifted]);
    }
    else {
        nest[hook] = {};
    }
    return nest;
};
exports.compileNestFromDotSeparated = compileNestFromDotSeparated;
const formatNestedObjectKeys = function (nest, indentSize = 2, _level = 0) {
    const { _ } = Panacea.container;
    let output = '';
    _(nest).forEach((item, key) => {
        let indent = '';
        _.times(_level * indentSize, () => {
            indent += ' ';
        });
        output += `\n${indent} - ${key}`;
        if (!_.isEmpty(item)) {
            let increasedLevel = _level + 1;
            output += formatNestedObjectKeys(item, indentSize, increasedLevel);
        }
    });
    return output;
};
exports.formatNestedObjectKeys = formatNestedObjectKeys;
const convertFileSizeShortHandToBytes = function (value) {
    const radix = 10;
    if (parseInt(value, radix).toString() === value) {
        return parseInt(value, radix);
    }
    const sizes = {
        k: 1,
        m: 2,
        g: 3,
        t: 4,
        kb: 1,
        mb: 2,
        gb: 3,
        tb: 4
    };
    if (typeof value === 'string') {
        for (let size in sizes) {
            if (value.indexOf(size) !== -1 || value.indexOf(size.toUpperCase()) !== -1) {
                return parseInt(value.replace(size, '').replace(size.toUpperCase(), ''), radix) * (Math.pow(1024, sizes[size]));
            }
        }
        return new TypeError(i18n.t('core.formatters.shortHandToBytes.cannotConvert', { value }));
    }
    return parseInt(value, radix);
};
exports.convertFileSizeShortHandToBytes = convertFileSizeShortHandToBytes;
//# sourceMappingURL=formatters.js.map