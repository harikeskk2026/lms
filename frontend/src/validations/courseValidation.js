import { z } from 'zod'

export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title must be at most 150 characters'),
  courseCode: z.string().max(50, 'Course code must be at most 50 characters').optional().or(z.literal('')),
  slug: z.string().max(120, 'Slug must be at most 120 characters').optional().or(z.literal('')),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be at most 5000 characters'),
  durationValue: z.string().min(1, 'Duration is required'),
  durationUnit: z.enum(['days', 'weeks', 'months', 'years'], { errorMap: () => ({ message: 'Duration unit is required' }) }),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { errorMap: () => ({ message: 'Level is required' }) }),
  thumbnail: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], { errorMap: () => ({ message: 'Status is required' }) }),
})
