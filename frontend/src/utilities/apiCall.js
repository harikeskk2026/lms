import axios from 'axios'
import tokenStorage from '@/utilities/tokenStorage'

const JAVA_API_BASE_URL = process.env.NEXT_PUBLIC_JAVA_API_URL || 'http://localhost:8081/api'

const httpClient = axios.create({
  baseURL: JAVA_API_BASE_URL,
  timeout: 10000,
})

httpClient.interceptors.request.use(config => {
  const token = tokenStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Single choke point for every HTTP request made against the Java API.
 * Components never call axios/fetch directly - they go through a `services/*`
 * file, which calls this.
 *
 * @param {Object} options
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {string} options.url - path relative to the API base URL, e.g. '/auth/login'
 * @param {Object} [options.data] - request body
 * @param {Object} [options.params] - query params
 * @param {Object} [options.headers] - extra headers
 * @returns {Promise<any>} the response body's `data` field (the ApiResponse envelope)
 */
export default async function apiCall({ method = 'GET', url, data, params, headers }) {
  try {
    const response = await httpClient.request({ method, url, data, params, headers })
    return response.data
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Request failed'
    const apiError = new Error(message)
    apiError.status = error.response?.status
    apiError.errors = error.response?.data?.errors
    throw apiError
  }
}
