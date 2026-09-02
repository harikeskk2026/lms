import { z } from 'zod'
import { EMAIL_REGEX, EMAIL_ERROR_MESSAGE } from '@/utilities/validators'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').regex(EMAIL_REGEX, EMAIL_ERROR_MESSAGE),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
})
