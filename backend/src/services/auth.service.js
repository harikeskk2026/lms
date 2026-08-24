const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { v4: uuidv4 } = require('uuid')
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateOTP,
  hashToken
} = require('../utils/jwt')
const { sendEmail, forgotPasswordEmail } = require('../utils/sendEmail')
const ApiError = require('../utils/ApiError')
const logger = require('../utils/logger')

const prisma = new PrismaClient()

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12
const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10
const LOCK_ATTEMPTS = 5
const LOCK_WINDOW_MINUTES = 15

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user
  return safe
}

function buildTokenPayload(user) {
  return { id: user.id, email: user.email, role: user.role }
}

async function storeRefreshToken(userId, token, ipAddress, userAgent) {
  const id = uuidv4()
  const hashed = hashToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.refreshToken.create({
    data: {
      id,
      userId,
      token: hashed,
      expiresAt,
      ipAddress,
      userAgent
    }
  })
  return id
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function loginService(email, password, ipAddress, userAgent) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      studentProfile: true,
      adminProfile: true
    }
  })

  // Check account lockout (before user existence check to avoid timing attacks)
  const windowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000)
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: windowStart }
    }
  })

  if (recentFailures >= LOCK_ATTEMPTS) {
    // Log this attempt
    await prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        success: false,
        ipAddress,
        userAgent,
        userId: user?.id ?? null
      }
    })
    throw new ApiError(423, `Too many failed attempts. Try again in ${LOCK_WINDOW_MINUTES} minutes.`, [], 'ACCOUNT_LOCKED')
  }

  if (!user) {
    await prisma.loginAttempt.create({
      data: { email: email.toLowerCase(), success: false, ipAddress, userAgent }
    })
    throw new ApiError(401, 'Invalid email or password', [], 'INVALID_CREDENTIALS')
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been suspended. Please contact support.', [], 'ACCOUNT_SUSPENDED')
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)

  if (!passwordValid) {
    await prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        success: false,
        ipAddress,
        userAgent,
        userId: user.id
      }
    })
    const remaining = LOCK_ATTEMPTS - recentFailures - 1
    const message = remaining > 0
      ? `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      : `Too many failed attempts. Try again in ${LOCK_WINDOW_MINUTES} minutes.`
    throw new ApiError(401, message, [], 'INVALID_CREDENTIALS')
  }

  // Success — log attempt and update lastLoginAt
  await Promise.all([
    prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        success: true,
        ipAddress,
        userAgent,
        userId: user.id
      }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })
  ])

  const payload = buildTokenPayload(user)
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  const refreshTokenId = await storeRefreshToken(user.id, refreshToken, ipAddress, userAgent)

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    refreshTokenId
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

async function refreshTokenService(tokenFromCookie) {
  if (!tokenFromCookie) {
    throw new ApiError(401, 'Refresh token missing', [], 'TOKEN_MISSING')
  }

  let payload
  try {
    payload = verifyRefreshToken(tokenFromCookie)
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token', [], 'TOKEN_INVALID')
  }

  const hashed = hashToken(tokenFromCookie)
  const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token is invalid or has been revoked', [], 'TOKEN_REVOKED')
  }

  // Rotate — revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() }
  })

  const user = await prisma.user.findUnique({ where: { id: stored.userId } })
  if (!user || !user.isActive) {
    throw new ApiError(403, 'Account not accessible', [], 'ACCOUNT_INACTIVE')
  }

  const newPayload = buildTokenPayload(user)
  const newAccessToken = generateAccessToken(newPayload)
  const newRefreshToken = generateRefreshToken(newPayload)

  await storeRefreshToken(user.id, newRefreshToken, stored.ipAddress, stored.userAgent)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

async function forgotPasswordService(email) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

  // Silently succeed even if not found
  if (!user) {
    logger.info(`[forgotPassword] Email not found (silent): ${email}`)
    return { message: "If that email exists, an OTP has been sent." }
  }

  const otp = generateOTP()
  const otpHash = hashToken(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000)

  // Delete any existing OTPs for user
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

  // Store hashed OTP
  await prisma.passwordReset.create({
    data: { userId: user.id, otp: otpHash, expiresAt }
  })

  // Log OTP in dev so testing works without SMTP
  logger.info(`[DEV] OTP for ${email}: ${otp}`)

  const { subject, html } = forgotPasswordEmail(user.name, otp)
  await sendEmail({ to: user.email, subject, html })

  return { message: "If that email exists, an OTP has been sent." }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

async function verifyOtpService(email, otp) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    throw new ApiError(400, 'Invalid OTP or email', [], 'INVALID_OTP')
  }

  const otpHash = hashToken(otp)
  const record = await prisma.passwordReset.findFirst({
    where: {
      userId: user.id,
      otp: otpHash,
      used: false,
      expiresAt: { gte: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!record) {
    throw new ApiError(400, 'Invalid or expired OTP', [], 'INVALID_OTP')
  }

  // Generate a short-lived reset token (10 min) — don't mark OTP used yet
  const resetToken = generateAccessToken({ id: user.id, email: user.email, purpose: 'password_reset' })

  return { valid: true, resetToken }
}

// ─── Reset Password ───────────────────────────────────────────────────────────

async function resetPasswordService(email, otp, newPassword) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    throw new ApiError(400, 'Invalid request', [], 'INVALID_REQUEST')
  }

  const otpHash = hashToken(otp)
  const record = await prisma.passwordReset.findFirst({
    where: {
      userId: user.id,
      otp: otpHash,
      used: false,
      expiresAt: { gte: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!record) {
    throw new ApiError(400, 'Invalid or expired OTP', [], 'INVALID_OTP')
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    }),
    prisma.passwordReset.update({
      where: { id: record.id },
      data: { used: true }
    }),
    // Revoke all refresh tokens — force re-login everywhere
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ])

  logger.info(`Password reset for user: ${user.email}`)
  return { message: 'Password reset successfully. Please log in with your new password.' }
}

// ─── Change Password ──────────────────────────────────────────────────────────

async function changePasswordService(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND')
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    throw new ApiError(400, 'Current password is incorrect', [], 'WRONG_PASSWORD')
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ])

  return { message: 'Password changed successfully. Please log in again.' }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logoutService(tokenFromCookie, userId) {
  if (!tokenFromCookie) return { message: 'Logged out' }

  const hashed = hashToken(tokenFromCookie)
  await prisma.refreshToken.updateMany({
    where: { token: hashed, userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })

  return { message: 'Logged out successfully' }
}

async function logoutAllService(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })
  return { message: 'Logged out from all devices' }
}

// ─── Get Me ───────────────────────────────────────────────────────────────────

async function getMeService(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      adminProfile: true
    }
  })

  if (!user) {
    throw new ApiError(404, 'User not found', [], 'USER_NOT_FOUND')
  }

  return sanitizeUser(user)
}

module.exports = {
  loginService,
  refreshTokenService,
  forgotPasswordService,
  verifyOtpService,
  resetPasswordService,
  changePasswordService,
  logoutService,
  logoutAllService,
  getMeService
}
