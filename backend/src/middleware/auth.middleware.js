const { verifyAccessToken } = require('../utils/jwt')
const ApiError = require('../utils/ApiError')
const logger = require('../utils/logger')

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided', [], 'TOKEN_MISSING')
    }

    const token = authHeader.split(' ')[1]

    try {
      const payload = verifyAccessToken(token)
      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role
      }
      next()
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Access token expired', [], 'TOKEN_EXPIRED')
      }
      throw new ApiError(401, 'Invalid access token', [], 'TOKEN_INVALID')
    }
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code
      })
    }
    logger.error('Auth middleware error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { authenticate }
