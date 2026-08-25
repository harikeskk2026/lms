import { z } from 'zod'

export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title must be at most 150 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be at most 5000 characters'),
  duration: z.string().min(1, 'Duration is required'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { errorMap: () => ({ message: 'Level is required' }) }),
  thumbnail: z.string().optional().or(z.literal('')),
})
