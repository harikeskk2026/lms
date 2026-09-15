import { z } from 'zod'

export const QUESTION_TYPES = [
  'MCQ', 'MULTIPLE_CORRECT', 'TRUE_FALSE', 'CODE_OUTPUT', 'DEBUGGING', 'SCENARIO', 'SQL', 'INTERVIEW',
  'SHORT_ANSWER',
]

// The only types the PDF importer actually extracts/supports — used to narrow
// the Type dropdown when editing a question inside the PDF quiz review flow.
export const PDF_QUESTION_TYPES = ['MCQ', 'MULTIPLE_CORRECT', 'TRUE_FALSE', 'SHORT_ANSWER']

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

export const ANSWER_MODES = ['OPTIONS', 'FREE_TEXT']

const SINGLE_CORRECT_TYPES = ['MCQ', 'TRUE_FALSE']

// SHORT_ANSWER is the only FREE_TEXT type — Coding/SQL free-text authoring was
// dropped (no sandboxed execution to grade them); SQL stays options-based only,
// exactly as it worked before this quiz-from-PDF feature existed.
export const FORCE_FREE_TEXT_TYPES = ['SHORT_ANSWER']

export const questionSchema = z.object({
  topicId: z.union([z.coerce.number(), z.literal('')]).optional(),
  courseId: z.union([z.coerce.number().min(1, 'Course is required'), z.literal('')]).refine(val => val !== '' && val !== null && val !== undefined && Number(val) >= 1, {
    message: 'Course is required',
  }),
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum(QUESTION_TYPES, { errorMap: () => ({ message: 'Question type is required' }) }),
  answerMode: z.enum(ANSWER_MODES).default('OPTIONS'),
  difficulty: z.enum(QUESTION_DIFFICULTIES, { errorMap: () => ({ message: 'Difficulty is required' }) }),
  explanation: z.string().optional().or(z.literal('')),
  codeSnippet: z.string().optional().or(z.literal('')),
  correctAnswerText: z.string().optional().or(z.literal('')),
  referenceAnswer: z.string().optional().or(z.literal('')),
  answerLanguage: z.string().optional().or(z.literal('')),
  points: z.coerce.number().min(1, 'Points must be at least 1'),
  options: z.array(z.object({
    optionText: z.string().min(1, 'Option text is required'),
    correct: z.boolean(),
  })).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.answerMode === 'FREE_TEXT') {
    if (data.questionType === 'SHORT_ANSWER' && !data.correctAnswerText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctAnswerText'],
        message: 'Correct answer is required for Short Answer questions',
      })
    }
    return
  }

  const correctCount = data.options.filter(o => o.correct).length

  if (data.options.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'At least one option is required',
    })
    return
  }

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
