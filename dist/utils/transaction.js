"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Transaction {
    constructor(handlers = [], context = {}) {
        this.status = 'init';
        this.context = context;
        this._handlers = handlers;
        this.created = Date.now();
    }
    fail(error) {
        this.status = 'rollback';
        this.error = error;
    }
    async _asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
    async _invokeHandlers(stage, proceedOnFail = false) {
        await this._asyncForEach(this._handlers, async (handler) => {
            if ((!this.error || proceedOnFail) && typeof handler[stage] === 'function') {
                try {
                    await handler[stage](this);
                }
                catch (error) {
                    this.fail(error);
                }
            }
        });
    }
    async execute() {
        this.status = 'prepare';
        await this._invokeHandlers('prepare');
        if (!this.error) {
            this.status = 'operation';
            await this._invokeHandlers('operation');
        }
        if (!this.error) {
            this.status = 'complete';
            await this._invokeHandlers('complete');
        }
        if (this.error) {
            await this._invokeHandlers('rollback', true);
            this.status = 'failed';
            await this._invokeHandlers('complete', true);
        }
        this.completed = Date.now();
        return this;
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=transaction.js.map