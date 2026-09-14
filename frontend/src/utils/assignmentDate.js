import { format, formatDistanceToNow } from 'date-fns'

/**
 * Safely parses an assignment dueDate (YYYY-MM-DD) and optional closeTime (HH:mm or HH:mm:ss)
 * into a local Date object without UTC midnight timezone shifting issues.
 */
export function parseAssignmentDueDate(dueDate, closeTime) {
  if (!dueDate) return null
  try {
    const parts = String(dueDate).split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return new Date(dueDate)
    const [year, month, day] = parts
    if (closeTime) {
      const timeParts = String(closeTime).split(':').map(Number)
      const hours = timeParts[0] || 0
      const minutes = timeParts[1] || 0
      const seconds = timeParts[2] || 0
      return new Date(year, month - 1, day, hours, minutes, seconds)
    }
    return new Date(year, month - 1, day, 23, 59, 59)
  } catch {
    return new Date(dueDate)
  }
}

/**
 * Formats an assignment due date and time.
 * If closeTime is specified, includes the time. Otherwise formats according to requested format.
 */
export function formatAssignmentDueDate(dueDate, closeTime, customFormat) {
  const dt = parseAssignmentDueDate(dueDate, closeTime)
  if (!dt || isNaN(dt.getTime())) return ''
  if (customFormat) return format(dt, customFormat)
  return closeTime ? format(dt, 'MMM d, h:mm a') : format(dt, 'MMM d, yyyy')
}

/**
 * Formats an event timestamp (submission, grading, review) with local time and relative distance.
 */
export function formatAssignmentEventTime(dateStr, includeRelative = true) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const formatted = format(d, 'MMM d, yyyy · h:mm a')
    if (!includeRelative) return formatted
    const relative = formatDistanceToNow(d, { addSuffix: true })
    return `${formatted} (${relative})`
  } catch {
    return ''
  }
}

/**
 * Formats a time string ("HH:mm" or "HH:mm:ss") into 12-hour AM/PM format (e.g. "02:08 PM").
 */
export function format12HourTime(timeStr) {
  if (!timeStr) return ''
  const parts = String(timeStr).split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return String(timeStr)
  const hour24 = parts[0]
  const minute = String(parts[1]).padStart(2, '0')
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${String(hour12).padStart(2, '0')}:${minute} ${period}`
}
