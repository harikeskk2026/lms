const express = require('express')
const router = express.Router()

const authController = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate.middleware')
const {
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('../validators/auth.validators')

// Public routes
router.post('/login',           validate(loginSchema),          authController.login)
router.post('/refresh',                                         authController.refresh)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/verify-otp',      validate(verifyOtpSchema),      authController.verifyOtp)
router.post('/reset-password',  validate(resetPasswordSchema),  authController.resetPassword)

// Authenticated routes
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword)
router.post('/logout',          authenticate,                   authController.logout)
router.post('/logout-all',      authenticate,                   authController.logoutAll)
router.get('/me',               authenticate,                   authController.getMe)

module.exports = router
