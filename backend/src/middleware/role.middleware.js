const ApiError = require('../utils/ApiError')

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    })
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
      code: 'FORBIDDEN'
    })
  }

  next()
}

module.exports = { authorize }
