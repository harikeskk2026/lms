import api from '@/lib/api'
import { safeErrorMessage } from '@/utilities/safeErrorMessage'

/**
 * Single choke point for every HTTP request made against the Java API.
 * Components never call axios/fetch directly - they go through a `services/*`
 * file, which calls this.
 *
 * Routes through the shared `api` axios instance in `@/lib/api` so every
 * service gets the same base URL and the same 401/expired-session handling
 * (previously this had its own axios client with no auth-error handling at
 * all, which let expired-token errors surface repeatedly to the user instead
 * of logging them out).
 *
 * @param {Object} options
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {string} options.url - path relative to the API base URL, e.g. '/auth/login'
 * @param {Object} [options.data] - request body
 * @param {Object} [options.params] - query params
 * @param {Object} [options.headers] - extra headers
 * @param {Function} [options.onUploadProgress] - axios upload progress callback, for large file uploads
 * @param {number} [options.timeout] - overrides the default 10s timeout, e.g. for large video uploads
 * @returns {Promise<any>} the response body's `data` field (the ApiResponse envelope)
 */
export default async function apiCall({ method = 'GET', url, data, params, headers, onUploadProgress, timeout }) {
  try {
    const response = await api.request({ method, url, data, params, headers, onUploadProgress, timeout })
    return response.data
  } catch (error) {
    const message = safeErrorMessage(error, 'Request failed')
    const apiError = new Error(message)
    apiError.status = error.response?.status
    apiError.code = error.response?.data?.code
    apiError.errors = error.response?.data?.errors
    throw apiError
  }
}
