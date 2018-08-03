// @flow

class Transaction {
  context: {} // eslint-disable-line no-undef
  _handlers: Array<transactionHandler> // eslint-disable-line no-undef
  status: transactionStatus // eslint-disable-line no-undef
  created: number // eslint-disable-line no-undef
  completed: ?number // eslint-disable-line no-undef
  error: null | Error // eslint-disable-line no-undef
  constructor (handlers: Array<transactionHandler> = [], context: {} = {}) {
    this.status = 'init'
    this.context = context
    this._handlers = handlers
    this.created = Date.now()
    this.completed = null
  }
  fail (error: Error) {
    this.status = 'rollback'
    this.error = error
  }
  async _asyncForEach (array: Array<transactionHandler>, callback: Function) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  }
  async _invokeHandlers (stage: string, proceedOnFail: boolean = false) {
    await this._asyncForEach(this._handlers, async (handler: transactionHandler) => {
      if ((!this.error || proceedOnFail) && typeof handler[stage] === 'function') {
        try {
          await handler[stage](this)
        } catch (error) {
          this.fail(error)
        }
      }
    })
  }
  async execute () {
    this.status = 'prepare'
    await this._invokeHandlers('prepare')

    if (!this.error) {
      this.status = 'operation'
      await this._invokeHandlers('operation')
    }

    if (!this.error) {
      this.status = 'complete'
      await this._invokeHandlers('complete')
    }

    if (this.error) {
      // Rollback handlers should not assume any existing state change has
      // succeeded (such as the main operation) because it's possible that a
      // fail() can be issued from any stage. Instead, rollback handlers should
      // independently check the current state to determine what tasks the
      // rollback needs to perform. It can help rollback handlers understand
      // where something failed if the callback issuing the fail() adds useful
      // information to the context.
      await this._invokeHandlers('rollback', true)
      this.status = 'failed'
      // Complete callbacks are run even on failure, so can be considered always
      // run at the end of a transaction execution.
      await this._invokeHandlers('complete', true)
    }

    this.completed = Date.now()

    return this
  }
}

export { Transaction }
