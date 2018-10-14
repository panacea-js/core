"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modelQuery = function (model, parent, args) {
    const params = args.params || {
        limit: 100,
        sortBy: null,
        sortDirection: null
    };
    const sortOptions = {};
    if (params.sortBy) {
        sortOptions[params.sortBy] = params.sortDirection === 'DESC' ? -1 : 1;
    }
    return model.find().limit(params.limit).sort(sortOptions);
};
exports.modelQuery = modelQuery;
//# sourceMappingURL=modelQuery.js.map