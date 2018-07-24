class DynamicMiddleware {
  constructor (middleware) {
    this._init(middleware)
  }

  /**
   *  Create a handler that can be used by express
   *
   *  @returns {Function} a express middleware
   */
  handler () {
    return (req, res, next) => {
      this._middleware(req, res, next)
    }
  }

  /**
   *  Replace the existing middleware with new middleware.
   */
  replace (middleware) {
    this._init(middleware)
  }

  _init (middleware) {
    if (typeof (middleware) !== 'function') {
      throw new Error('Invalid middleware argument, must be a function')
    }

    this._middleware = middleware
  }
}

export const create = function (middleware) {
  return new DynamicMiddleware(middleware)
}
