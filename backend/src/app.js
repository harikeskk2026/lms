const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library')

const logger = require('./utils/logger')
const ApiError = require('./utils/ApiError')
const authRouter    = require('./routes/auth.routes')
const studentRouter = require('./routes/student.routes')
const adminRouter   = require('./routes/admin.routes')
const { authenticate } = require('./middleware/auth.middleware')
const { authorize }    = require('./middleware/role.middleware')

const app = express()

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet())

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3040',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' }
})

app.use(globalLimiter)

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'CareerLabs LMS API is running', timestamp: new Date().toISOString() })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/student', authenticate, authorize('STUDENT'), studentRouter)
app.use('/api/admin',   authenticate, authorize('SUPERADMIN', 'ADMIN', 'TRAINER'), adminRouter)

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path })

  // Our custom errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || null,
      errors: err.errors || []
    })
  }

  // Prisma known errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field'
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`,
        code: 'DUPLICATE_ENTRY'
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
        code: 'NOT_FOUND'
      })
    }
    return res.status(400).json({
      success: false,
      message: 'Database operation failed',
      code: 'DB_ERROR'
    })
  }

  // Joi validation errors that bubble up
  if (err.isJoi) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.details.map(d => ({ field: d.path[0], message: d.message }))
    })
  }

  // Generic 500
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  })
})

module.exports = app
