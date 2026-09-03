// Single source of truth for phone/password format rules on the frontend —
// mirrors the backend's ValidPhoneNumber/ValidPassword annotations
// (api/.../auth/validation/{PhoneNumberFormatValidator,PasswordStrengthValidator}.java)
// so both layers reject the same input for the same reason.

// Accepts any domain (gmail.com, yahoo.com, outlook.com, company domains, ...)
// as long as the shape is username@domain.extension with no spaces - mirrors
// the backend's ValidEmailFormat (EmailFormatValidator.java): rejects
// leading/trailing whitespace and consecutive dots that a bare regex allows.
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
export const EMAIL_ERROR_MESSAGE = 'Please enter a valid email address (e.g. name@example.com)'

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
