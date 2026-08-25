'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import api from '@/lib/api'
import authService from '@/services/authService'
import { useRouter } from 'next/navigation'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // On mount: fetch /auth/me if access token exists
  useEffect(() => {
    const token = Cookies.get('clms_at')
    if (token) {
      api.get('/auth/me')
        .then(r => setUser(r.data.user))
        .catch(() => {
          Cookies.remove('clms_at')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login(email, password)
    // 15 min expiry
    Cookies.set('clms_at', data.accessToken, { expires: 1 / 96, sameSite: 'strict' })
    setUser(data.user)
    const dest = data.user.role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard'
    router.push(dest)
    return data.user
  }, [router])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    Cookies.remove('clms_at')
    setUser(null)
    router.push('/login')
  }, [router])

  const logoutAll = useCallback(async () => {
    try { await api.post('/auth/logout-all') } catch {}
    Cookies.remove('clms_at')
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
