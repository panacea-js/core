"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { hooks } = Panacea.container;
/**
 * Loads entity types from yml files to define MongoDB models.
 * @returns {object}
 */
exports.dbModels = function () {
    const models = {};
    hooks.invoke('core.mongo.models', { models });
    return models;
};
//# sourceMappingURL=models.js.map