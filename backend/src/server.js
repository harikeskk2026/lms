require('dotenv').config()
const app = require('./app')
const { PrismaClient } = require('@prisma/client')
const logger = require('./utils/logger')

const prisma = new PrismaClient()
const PORT = process.env.PORT || 5040

async function main() {
  await prisma.$connect()
  logger.info('Database connected')
  app.listen(PORT, () => logger.info(`CareerLabs LMS API running on port ${PORT}`))
}

main().catch(err => {
  logger.error('Startup error', err)
  process.exit(1)
})
