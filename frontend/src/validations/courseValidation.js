import { z } from 'zod'

export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title must be at most 150 characters'),
  courseCode: z.string().max(50, 'Course code must be at most 50 characters').optional().or(z.literal('')),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be at most 5000 characters'),
  durationMode: z.enum(['standard', 'legacy']).default('standard'),
  durationValue: z.string().optional(),
  durationUnit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  rawDuration: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { errorMap: () => ({ message: 'Level is required' }) }),
  thumbnail: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], { errorMap: () => ({ message: 'Status is required' }) }),
}).superRefine((data, ctx) => {
  if (data.durationMode === 'standard') {
    if (!data.durationValue || data.durationValue.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duration is required', path: ['durationValue'] })
    }
    if (!data.durationUnit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duration unit is required', path: ['durationUnit'] })
    }
  } else if (data.durationMode === 'legacy') {
    if (!data.rawDuration || data.rawDuration.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Legacy duration is required', path: ['rawDuration'] })
    }
  }
})
