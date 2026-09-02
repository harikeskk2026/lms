const TOKEN_KEY = 'clms_at'
const USER_KEY = 'clms_user'

const isBrowser = typeof window !== 'undefined'

/**
 * Single place that knows how the access token and cached user are persisted
 * (localStorage - scoped to this browser, not sent automatically like a cookie).
 */
const tokenStorage = {
  getToken() {
    if (!isBrowser) return null
    return localStorage.getItem(TOKEN_KEY)
  },

  getUser() {
    if (!isBrowser) return null
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  setSession(token, user) {
    if (!isBrowser) return
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  setUser(user) {
    if (!isBrowser) return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clear() {
    if (!isBrowser) return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

export default tokenStorage
