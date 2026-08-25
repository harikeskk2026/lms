'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import authService from '@/services/authService'
import tokenStorage from '@/utilities/tokenStorage'
import { useRouter } from 'next/navigation'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // On mount: hydrate from the cached user immediately (avoids a blank flash
  // on refresh), then re-verify the token against /auth/me in the background.
  useEffect(() => {
    const token = tokenStorage.getToken()
    if (token) {
      const cachedUser = tokenStorage.getUser()
      if (cachedUser) setUser(cachedUser)

      authService.me()
        .then(r => {
          setUser(r.data)
          tokenStorage.setUser(r.data)
        })
        .catch(() => {
          tokenStorage.clear()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login(email, password)
    tokenStorage.setSession(data.accessToken, data.user)
    setUser(data.user)
    const dest = data.user.role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard'
    router.push(dest)
    return data.user
  }, [router])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    tokenStorage.clear()
    setUser(null)
    router.push('/login')
  }, [router])

  const logoutAll = useCallback(async () => {
    try { await api.post('/auth/logout-all') } catch {}
    tokenStorage.clear()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAll, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
