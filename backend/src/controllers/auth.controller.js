const authService = require('../services/auth.service')
const logger = require('../utils/logger')

const REFRESH_COOKIE = 'clms_rt'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const ipAddress = req.ip || req.connection?.remoteAddress
    const userAgent = req.headers['user-agent']

    const result = await authService.loginService(email, password, ipAddress, userAgent)

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS)

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken: result.accessToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        profilePhoto: result.user.profilePhoto
      }
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const tokenFromCookie = req.cookies[REFRESH_COOKIE]
    const result = await authService.refreshTokenService(tokenFromCookie)

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS)

    res.status(200).json({
      success: true,
      accessToken: result.accessToken
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    const result = await authService.forgotPasswordService(email)
    res.status(200).json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/verify-otp
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body
    const result = await authService.verifyOtpService(email, otp)
    res.status(200).json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body
    const result = await authService.resetPasswordService(email, otp, newPassword)

    clearRefreshCookie(res)
    res.status(200).json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/change-password (authenticated)
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    const result = await authService.changePasswordService(req.user.id, currentPassword, newPassword)
    res.status(200).json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout (authenticated)
async function logout(req, res, next) {
  try {
    const tokenFromCookie = req.cookies[REFRESH_COOKIE]
    await authService.logoutService(tokenFromCookie, req.user.id)

    clearRefreshCookie(res)
    res.status(200).json({ success: true, message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout-all (authenticated)
async function logoutAll(req, res, next) {
  try {
    await authService.logoutAllService(req.user.id)
    clearRefreshCookie(res)
    res.status(200).json({ success: true, message: 'Logged out from all devices' })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/me (authenticated)
async function getMe(req, res, next) {
  try {
    const user = await authService.getMeService(req.user.id)
    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}

module.exports = { login, refresh, forgotPassword, verifyOtp, resetPassword, changePassword, logout, logoutAll, getMe }
