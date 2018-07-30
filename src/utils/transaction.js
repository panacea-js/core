// @flow

/**
* Transaction handler definition.
*/
type transactionHandler = {| // eslint-disable-line no-undef
  prepare?: (txn: Transaction) => mixed, // eslint-disable-line no-use-before-define
  operation?: (txn: Transaction) => mixed, // eslint-disable-line no-use-before-define
  rollback?: (txn: Transaction) => mixed, // eslint-disable-line no-use-before-define
  complete?: (txn: Transaction) => mixed // eslint-disable-line no-use-before-define
|}

type transactionStatus = 'init' | 'prepare' | 'operation' | 'rollback' | 'complete' | 'failed' // eslint-disable-line no-undef

class Transaction {
  context: {} // eslint-disable-line no-undef
  _handlers: Array<transactionHandler> // eslint-disable-line no-undef
  status: transactionStatus // eslint-disable-line no-undef
  _created: number // eslint-disable-line no-undef
  _error: null | Error // eslint-disable-line no-undef
  constructor (handlers: Array<transactionHandler> = [], context: {} = {}) {
    this.status = 'init'
    this.context = context
    this._handlers = handlers
    this._created = Date.now()
  }
  async fail (error: Error) {
    this.status = 'rollback'
    this._error = error
    await this._handlers.forEach(async (handler: transactionHandler) => {
      if (typeof handler.rollback === 'function') {
        await handler.rollback(this)
      }
    })
    this.status = 'failed'
    await this._handlers.forEach(async (handler: transactionHandler) => {
      if (typeof handler.complete === 'function') {
        await handler.complete(this)
      }
    })
  }
  async execute () {
    this.status = 'prepare'
    await this._handlers.forEach(async (handler: transactionHandler) => {
      if (!this._error && typeof handler.prepare === 'function') {
        await handler.prepare(this)
      }
    })

    if (this._error) return this

    this.status = 'operation'
    await this._handlers.forEach(async (handler: transactionHandler) => {
      if (!this._error && typeof handler.operation === 'function') {
        await handler.operation(this)
      }
    })

    if (this._error) return this

    this.status = 'complete'
    await this._handlers.forEach(async (handler: transactionHandler) => {
      if (!this._error && typeof handler.complete === 'function') {
        await handler.complete(this)
      }
    })

    return this
  }
}

export { Transaction }
