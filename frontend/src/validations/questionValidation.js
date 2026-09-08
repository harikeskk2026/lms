import { z } from 'zod'

export const QUESTION_TYPES = [
  'MCQ', 'MULTIPLE_CORRECT', 'TRUE_FALSE', 'CODE_OUTPUT', 'DEBUGGING', 'SCENARIO', 'SQL', 'INTERVIEW',
]

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

const SINGLE_CORRECT_TYPES = ['MCQ', 'TRUE_FALSE']

export const questionSchema = z.object({
  topicId: z.union([z.coerce.number(), z.literal('')]).optional(),
  courseId: z.union([z.coerce.number().min(1, 'Course is required'), z.literal('')]).refine(val => val !== '' && val !== null && val !== undefined && Number(val) >= 1, {
    message: 'Course is required',
  }),
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum(QUESTION_TYPES, { errorMap: () => ({ message: 'Question type is required' }) }),
  difficulty: z.enum(QUESTION_DIFFICULTIES, { errorMap: () => ({ message: 'Difficulty is required' }) }),
  explanation: z.string().optional().or(z.literal('')),
  codeSnippet: z.string().optional().or(z.literal('')),
  points: z.coerce.number().min(1, 'Points must be at least 1'),
  options: z.array(z.object({
    optionText: z.string().min(1, 'Option text is required'),
    correct: z.boolean(),
  })).min(1, 'At least one option is required'),
}).superRefine((data, ctx) => {
  const correctCount = data.options.filter(o => o.correct).length

  if (SINGLE_CORRECT_TYPES.includes(data.questionType) && correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'MCQ and TRUE_FALSE questions must have exactly one correct option',
    })
  }

  if (data.questionType === 'MULTIPLE_CORRECT' && correctCount < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'MULTIPLE_CORRECT questions must have at least one correct option',
    })
  }
})
