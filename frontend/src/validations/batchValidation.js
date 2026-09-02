import { z } from 'zod'

export const batchSchema = z.object({
  name: z.string().min(1, 'Batch name is required'),
  courseId: z.coerce.number({ invalid_type_error: 'Course is required' }).positive('Course is required'),
  trainerId: z.union([z.coerce.number().positive(), z.literal('')]).optional()
    .transform(v => (v === '' || v === undefined ? null : v)),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  timing: z.string().optional().or(z.literal('')),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID'], { errorMap: () => ({ message: 'Mode is required' }) }),
  maxStudents: z.coerce.number().min(1, 'Max students must be at least 1').max(500, 'Max students must be at most 500'),
})
