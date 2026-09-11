import axios from 'axios'
import toast from 'react-hot-toast'
import tokenStorage from '@/utilities/tokenStorage'

export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_JAVA_API_URL

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname

    if (envUrl) {
      try {
        const parsed = new URL(envUrl)
        if (
          (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
          hostname && hostname !== 'localhost' && hostname !== '127.0.0.1'
        ) {
          return `${parsed.protocol}//${hostname}:${parsed.port || '7000'}${parsed.pathname}`
        }
      } catch (e) {
        // ignore URL parsing error
      }
      return envUrl
    }

    // No env var configured at all - fall back to the LAN-IP dev convention.
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:7000/api`
    }
  }

  return envUrl;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 15000,
})

// ─── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use(config => {
  const currentBase = getApiBaseUrl()
  if (currentBase) {
    config.baseURL = currentBase
  }
  if (!config.baseURL) {
    throw new Error('API configuration error: NEXT_PUBLIC_JAVA_API_URL environment variable is not configured.')
  }
  const token = tokenStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── De-dupe concurrent identical GET requests ────────────────────────────────
// Several independent components (e.g. the sidebar badge counts and a page's
// own data hook) fetch the same endpoint on mount within the same tick - e.g.
// notifications is fetched by StudentShell, NotificationDropdown and
// useNotifications() all at once on dashboard load. Rather than firing 3
// identical network requests, share the in-flight promise for any GET with
// the same url+params; the entry is cleared as soon as it settles, so this
// never serves stale data on a later, separate fetch.
const inFlightGETs = new Map()
const rawRequest = api.request.bind(api)
api.request = (config = {}) => {
  if ((config.method || 'get').toLowerCase() !== 'get') return rawRequest(config)

  const key = `${config.url}?${JSON.stringify(config.params || {})}`
  const pending = inFlightGETs.get(key)
  if (pending) return pending

  const promise = rawRequest(config).finally(() => inFlightGETs.delete(key))
  inFlightGETs.set(key, promise)
  return promise
}

// ─── Response: on an expired/invalid session, log out once and redirect ──────
// The API has no refresh-token endpoint - a 401 here means the token is gone
// for good, so there's nothing to retry. Log out immediately instead of
// letting every subsequent call (including polling components) 401 again and
// show its own error - that's what caused "authorization error" to reappear
// repeatedly instead of the user just being sent back to the login page once.
let sessionExpiredHandled = false

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const alreadyOnLogin = window.location.pathname.startsWith('/login')
      if (!alreadyOnLogin && !sessionExpiredHandled) {
        sessionExpiredHandled = true
        tokenStorage.clear()
        toast.error(err.response?.data?.message || 'Your session has expired. Please log in again.')
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)

export function resolveFileUrl(path) {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path
  // Ensure the path starts with a slash
  const normalized = path.startsWith('/') ? path : `/${path}`
  // /uploads/** paths are proxied by Next.js (same-origin) — return them relative
  // so the iframe loads from port 3040 instead of 7000, avoiding cross-origin issues
  if (normalized.startsWith('/uploads/')) return normalized
  // All other relative paths (e.g. /api/**) get the full API origin prepended
  const apiOrigin = getApiBaseUrl().replace(/\/api\/?$/, '')
  return `${apiOrigin}${normalized}`
}

export default api
