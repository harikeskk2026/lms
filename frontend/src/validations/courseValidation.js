import { z } from 'zod'

const DURATION_PATTERN = /^\s*\d+\s*(d|day|days|w|week|weeks|m|month|months|y|year|years)\s*$/i

export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title must be at most 150 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be at most 5000 characters'),
  duration: z.string().min(1, 'Duration is required').refine(v => DURATION_PATTERN.test(v.trim()), {
    message: 'Duration must be like "3 months", "6 weeks", "90 days" or "1 year"',
  }),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { errorMap: () => ({ message: 'Level is required' }) }),
  thumbnail: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], { errorMap: () => ({ message: 'Status is required' }) }),
})
