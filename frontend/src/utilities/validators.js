export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(?!\d+(?:\.\d+)*\.[A-Za-z]{2,}$)[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
export const EMAIL_ERROR_MESSAGE = 'Please enter a valid email address'

export function isValidEmail(email) {
  if (!email) return false
  return email === email.trim() && !email.includes('..') && EMAIL_REGEX.test(email)
}

export const PHONE_REGEX = /^[6-9]\d{9}$/
export const PHONE_ERROR_MESSAGE = 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9'

// Blank is treated as valid — phone is optional everywhere it appears;
// pair with a `required` check where it isn't.
export function isValidPhone(phone) {
  if (!phone) return true
  return PHONE_REGEX.test(phone)
}

// Name validation: allowed characters are letters, spaces, hyphens, dots, and apostrophes.
export const NAME_REGEX = /^[a-zA-Z\s.'-]+$/
export const NAME_ERROR_MESSAGE = 'Name cannot contain numbers or unsupported special characters.'

export function isValidName(name) {
  if (!name || !name.trim()) return false
  return NAME_REGEX.test(name.trim())
}

/**
 * Filter out numbers and unsupported characters on keydown for name fields.
 * Note: onChange remains authoritative for paste, autofill, and mobile input.
 */
export function filterNameKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) return
  if (!/^[a-zA-Z\s.'-]$/.test(e.key)) {
    e.preventDefault()
  }
}

/**
 * Sanitizes name input (e.g. on paste or input) while keeping allowed characters.
 */
export function sanitizeName(val) {
  if (!val) return ''
  return val.replace(/[^a-zA-Z\s.'-]/g, '')
}

// Text validation for free-text fields like Designation / Department: letters,
// spaces, dots, commas, ampersands, parentheses, slashes, hyphens and apostrophes
// are allowed; numbers and other symbols are rejected.
export const TEXT_REGEX = /^[a-zA-Z\s.,&()\/'-]+$/
export const TEXT_ERROR_MESSAGE = 'Cannot contain numbers or unsupported special characters'

// Blank is treated as valid — designation/department are optional everywhere.
export function isValidText(val) {
  if (!val) return true
  return TEXT_REGEX.test(val)
}

/**
 * Filter out digits and unsupported characters on keydown for free-text fields.
 * Note: onChange remains authoritative for paste, autofill, and mobile input.
 */
export function filterTextKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) return
  if (!/^[a-zA-Z\s.,&()\/'-]$/.test(e.key)) {
    e.preventDefault()
  }
}

/**
 * Sanitizes free-text fields (e.g. on paste or input) while keeping allowed characters.
 */
export function sanitizeText(val) {
  if (!val) return ''
  return val.replace(/[^a-zA-Z\s.,&()\/'-]/g, '')
}

/**
 * Filter out non-digit keystrokes on keydown for phone fields.
 */
export function filterPhoneKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) return
  if (!/^\d$/.test(e.key)) {
    e.preventDefault()
  }
}

/**
 * Sanitizes phone numbers by keeping only digits and capping at 10 digits.
 */
export function sanitizePhone(val) {
  if (!val) return ''
  return val.replace(/\D/g, '').slice(0, 10)
}

/**
 * Filter keystrokes for numeric fields (optionally allowing decimal points).
 */
export function filterNumberKey(e, allowDecimal = false) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) return
  if (allowDecimal && e.key === '.') return
  if (!/^\d$/.test(e.key)) {
    e.preventDefault()
  }
}

export function isValidNumberRange(val, min = -Infinity, max = Infinity) {
  if (val === '' || val === null || val === undefined) return false
  const num = Number(val)
  if (isNaN(num)) return false
  return num >= min && num <= max
}

export const PASSWORD_ERROR_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character, with no spaces'

export function isValidPassword(password) {
  if (!password || password.length < 8) return false
  if (/\s/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  if (!/[^A-Za-z0-9\s]/.test(password)) return false
  return true
}

export function getPasswordRequirements(password = '') {
  return {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9\s]/.test(password),
    noSpace: !/\s/.test(password) && password.length > 0,
    allValid: isValidPassword(password),
  }
}

// Requires a real domain-shaped link (e.g. "linkedin.com/in/x" or
// "https://github.com/x") — rejects plain numbers or arbitrary text that
// isn't shaped like a URL. An optional http(s):// scheme is allowed.
const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/

export function isValidUrl(url) {
  if (!url) return true
  return URL_REGEX.test(url.trim())
}

export const LINKEDIN_URL_ERROR_MESSAGE = 'LinkedIn must be a valid link (e.g. linkedin.com/in/yourname), not plain text or numbers'
export const GITHUB_URL_ERROR_MESSAGE = 'GitHub must be a valid link (e.g. github.com/yourname), not plain text or numbers'
export const URL_ERROR_MESSAGE = 'Please enter a valid URL (e.g. https://example.com)'
