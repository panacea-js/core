"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DynamicMiddleware {
    constructor(middleware) {
        if (typeof (middleware) !== 'function') {
            throw new Error('Invalid middleware argument, must be a function');
        }
        this._middleware = middleware;
    }
    handler() {
        return (req, res, next) => {
            this._middleware(req, res, next);
        };
    }
    replace(middleware) {
        if (typeof (middleware) !== 'function') {
            throw new Error('Invalid middleware argument, must be a function');
        }
        this._middleware = middleware;
    }
}
exports.create = function (middleware) {
    return new DynamicMiddleware(middleware);
};
//# sourceMappingURL=dynamic-middleware.js.map