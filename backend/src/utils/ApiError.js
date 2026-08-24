class ApiError extends Error {
  constructor(statusCode, message, errors = [], code = null) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.success = false
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = ApiError
