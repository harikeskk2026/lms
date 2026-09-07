import apiCall from '@/utilities/apiCall'

const authService = {
  login: (email, password) =>
    apiCall({ method: 'POST', url: '/auth/login', data: { email, password } }),

  me: () => apiCall({ method: 'GET', url: '/auth/me' }),

  logout: () => apiCall({ method: 'POST', url: '/auth/logout' }),

  logoutAll: () => apiCall({ method: 'POST', url: '/auth/logout-all' }),
}

export default authService
