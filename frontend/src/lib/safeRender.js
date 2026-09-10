import { format, formatDistanceToNow } from 'date-fns'

/**
 * Safe data-rendering helpers. Never render raw API values directly in React:
 * an unexpected/malformed value (object where a string is expected, missing
 * array, invalid date) must not throw during render. These helpers coerce or
 * fall back so the UI stays usable no matter what the API returns.
 */

/** Return value as an array, or [] when it isn't one. */
export function asArray(value) {
  return Array.isArray(value) ? value : []
}

/** Coerce a value to a plain string so objects can never be rendered as children. */
export function toText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value)
      return serialized === undefined ? fallback : serialized
    } catch {
      return fallback
    }
  }
  return String(value)
}

/** Coerce a value to a finite number, or fallback (default 0). */
export function safeNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Format a date string/number with date-fns, falling back gracefully on invalid input. */
export function safeFormat(value, dateFormat, fallback = '—') {
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return fallback
    return format(d, dateFormat)
  } catch {
    return fallback
  }
}

/** Relative time ("3 days ago") that never throws on invalid input. */
export function safeFormatDistance(value, fallback = '') {
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return fallback
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return fallback
  }
}

/** Clamp + coerce a rating into a safe 5-star string. */
export function safeStars(value) {
  const n = Math.round(safeNumber(value, 0))
  const clamped = Math.max(0, Math.min(5, n))
  return '★'.repeat(clamped || 0)
}

/** A title or label from possibly-malformed API data. */
export function safeTitle(value, fallback = 'Untitled') {
  const text = toText(value)
  return text.trim() ? text : fallback
}