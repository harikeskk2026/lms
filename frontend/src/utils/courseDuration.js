import { addDays, addWeeks, addMonths, addYears, parseISO, isValid } from 'date-fns'

const DURATION_PATTERN = /^\s*(\d+)\s*(d|day|days|w|week|weeks|m|month|months|y|year|years)\s*$/i

export function parseCourseDuration(duration) {
  if (!duration || typeof duration !== 'string') return null
  const m = duration.trim().match(DURATION_PATTERN)
  if (!m) return null
  const amount = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  if (Number.isNaN(amount) || amount <= 0) return null
  if (['d', 'day', 'days'].includes(unit)) return { amount, unit: 'days' }
  if (['w', 'week', 'weeks'].includes(unit)) return { amount, unit: 'weeks' }
  if (['m', 'month', 'months'].includes(unit)) return { amount, unit: 'months' }
  if (['y', 'year', 'years'].includes(unit)) return { amount, unit: 'years' }
  return null
}

export function isValidCourseDuration(duration) {
  return parseCourseDuration(duration) !== null
}

/**
 * Calculates max allowed batch end date = startDate + courseDuration
 * Returns Date or null if parsing fails
 */
export function calculateMaxEndDate(startDateStr, duration) {
  if (!startDateStr || !duration) return null
  const parsed = parseCourseDuration(duration)
  if (!parsed) return null
  const start = parseISO(startDateStr)
  if (!isValid(start)) return null
  switch (parsed.unit) {
    case 'days':
      return addDays(start, parsed.amount)
    case 'weeks':
      return addWeeks(start, parsed.amount)
    case 'months':
      return addMonths(start, parsed.amount)
    case 'years':
      return addYears(start, parsed.amount)
    default:
      return null
  }
}

/**
 * Validates batch dates
 * Returns error string or null if valid
 */
export function validateBatchDates(startDateStr, endDateStr, courseDuration) {
  if (!startDateStr || !endDateStr) return null
  const start = parseISO(startDateStr)
  const end = parseISO(endDateStr)
  if (!isValid(start) || !isValid(end)) return null
  if (start > end) {
    return 'Batch start date must be before or equal to end date.'
  }
  if (!courseDuration) return null
  const maxEnd = calculateMaxEndDate(startDateStr, courseDuration)
  if (maxEnd && end > maxEnd) {
    return `Batch duration cannot exceed the selected course duration of ${courseDuration}.`
  }
  return null
}
