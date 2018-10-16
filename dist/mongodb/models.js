"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { hooks } = Panacea.container;
exports.dbModels = function () {
    const models = {};
    hooks.invoke('core.mongo.models', { models });
    return models;
};
//# sourceMappingURL=models.js.map