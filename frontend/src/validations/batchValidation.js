import { z } from 'zod'

export const batchSchema = z.object({
  name: z.string().min(1, 'Batch name is required'),
  courseId: z.coerce.number({ invalid_type_error: 'Course is required' }).positive('Course is required'),
  trainerIds: z.array(z.coerce.number().positive()).optional()
    .transform(v => v ?? []),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  timing: z.string().optional().or(z.literal('')),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID'], { errorMap: () => ({ message: 'Mode is required' }) }),
  maxStudents: z.coerce.number().min(1, 'Max students must be at least 1').max(500, 'Max students must be at most 500'),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Batch start date must be before or equal to end date.',
        path: ['endDate'],
      })
    }
  }
})
