const { describe, it, expect } = require('@jest/globals') || require('vitest')
const { courseSchema } = require('../courseValidation')

function validForm(overrides = {}) {
  return {
    title: 'Test Course',
    description: 'A test course description',
    durationValue: '3',
    durationUnit: 'months',
    level: 'BEGINNER',
    status: 'DRAFT',
    ...overrides,
  }
}

describe('courseSchema duration validation', () => {
  describe('valid durations', () => {
    it('accepts "3 months"', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '3', durationUnit: 'months' }))
      expect(result.success).toBe(true)
    })

    it('accepts "4 weeks"', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '4', durationUnit: 'weeks' }))
      expect(result.success).toBe(true)
    })

    it('accepts "10 days"', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '10', durationUnit: 'days' }))
      expect(result.success).toBe(true)
    })

    it('accepts "1 years"', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '1', durationUnit: 'years' }))
      expect(result.success).toBe(true)
    })
  })

  describe('invalid duration values', () => {
    it('rejects empty durationValue', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '' }))
      expect(result.success).toBe(false)
      expect(result.error.issues.some(i => i.path.includes('durationValue'))).toBe(true)
    })

    it('rejects zero', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '0' }))
      expect(result.success).toBe(false)
    })

    it('rejects negative number', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '-5' }))
      expect(result.success).toBe(false)
    })

    it('rejects non-numeric string', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: 'abc' }))
      expect(result.success).toBe(false)
    })

    it('rejects decimal', () => {
      const result = courseSchema.safeParse(validForm({ durationValue: '3.5' }))
      expect(result.success).toBe(false)
    })
  })

  describe('invalid duration units', () => {
    it('rejects "hours"', () => {
      const result = courseSchema.safeParse(validForm({ durationUnit: 'hours' }))
      expect(result.success).toBe(false)
      expect(result.error.issues.some(i => i.path.includes('durationUnit'))).toBe(true)
    })

    it('rejects empty unit', () => {
      const result = courseSchema.safeParse(validForm({ durationUnit: undefined }))
      expect(result.success).toBe(false)
    })
  })
})
