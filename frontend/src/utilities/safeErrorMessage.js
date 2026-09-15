/**
 * Safely extract a user-facing error message from any error object.
 *
 * The backend always returns errors as:
 *   { success: false, message: "Safe user-friendly message", status: 400, ... }
 *
 * The `apiCall` utility already extracts `response.data.message` into `err.message`.
 * This function handles both apiCall-wrapped errors and raw axios errors.
 *
 * NEVER expose: stack traces, SQL, class names, package names, column names,
 * database names, or any internal implementation details.
 *
 * @param {*} error - The error object (from catch block, .catch(), etc.)
 * @param {string} fallback - Fallback message if no safe message can be extracted
 * @returns {string} A safe user-facing error message
 */
export function safeErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback

  // If apiCall already wrapped this error, err.message is the safe backend message
  if (typeof error.message === 'string' && error.status !== undefined) {
    return error.message || fallback
  }

  // Raw axios error — extract from response envelope
  const backendMessage = error?.response?.data?.message
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage.trim()
  }

  // Field-level validation errors — show first one
  const firstFieldError = error?.response?.data?.errors?.[0]?.message
  if (typeof firstFieldError === 'string' && firstFieldError.trim()) {
    return firstFieldError.trim()
  }

  // Network-level errors (no response received)
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'The request timed out. Please check your connection and try again.'
  }
  if (error?.message === 'Network Error' || !error?.response) {
    return 'Unable to connect to the server. Please check your connection and try again.'
  }

  // Fallback — never return raw error content
  return fallback
}
