import * as express from 'express'

class DynamicMiddleware {
  _middleware: express.RequestHandler

  constructor (middleware: express.RequestHandler) {
    if (typeof (middleware) !== 'function') {
      throw new Error('Invalid middleware argument, must be a function')
    }

    this._middleware = middleware
  }

  /**
   *  Create a handler that can be used by express
   */
  handler (): express.RequestHandler {
    return (req, res, next) => {
      this._middleware(req, res, next)
    }
  }

  /**
   *  Replace the existing middleware with new middleware.
   */
  replace (middleware: express.RequestHandler) {
    if (typeof (middleware) !== 'function') {
      throw new Error('Invalid middleware argument, must be a function')
    }

    this._middleware = middleware
  }
}

export const create = function (middleware: express.RequestHandler) {
  return new DynamicMiddleware(middleware)
}
