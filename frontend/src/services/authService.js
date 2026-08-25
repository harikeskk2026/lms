import apiCall from '@/utilities/apiCall'

const authService = {
  login: (email, password) =>
    apiCall({ method: 'POST', url: '/auth/login', data: { email, password } }),

  me: () => apiCall({ method: 'GET', url: '/auth/me' }),
}

export default authService
