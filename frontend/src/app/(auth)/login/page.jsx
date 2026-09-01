'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, GraduationCap, Users, BookOpen, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { loginSchema } from '@/validations/loginValidation'
import clsx from 'clsx'

const stats = [
  { icon: GraduationCap, label: 'Students Enrolled', value: '2,400+' },
  { icon: Users,         label: 'Expert Trainers',   value: '40+' },
  { icon: BookOpen,      label: 'Active Courses',    value: '120+' },
  { icon: TrendingUp,    label: 'Placement Rate',    value: '94%' },
]

// Demo login credentials for development testing
const demoAccounts = [
  { role: 'Super Admin', email: 'superadmin@careerlabs.com', password: 'ChangeMe123!' },
  { role: 'Admin', email: 'admin@careerlabs.com', password: 'ChangeMe123!' },
  { role: 'Student', email: 'student@careerlabs.com', password: 'ChangeMe123!' },
]

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard')
    }
  }, [loading, user, router])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data) {
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
    } catch (err) {
      toast.error(err.message || 'Login failed. Please try again.')
    }
  }

  function fillDemo(email, password) {
    setValue('email', email)
    setValue('password', password)
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)' }}>

        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #ffd668 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #c4b5fd 0%, transparent 70%)' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            Career<span style={{ color: '#ffd668' }}>Labs</span>
          </div>
          <div className="text-purple-200 text-sm mt-1">Learning Management System</div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col gap-6">
          <h1 className="font-display text-5xl font-extrabold text-white leading-tight">
            Launch Your<br/>
            <span style={{ color: '#ffd668' }}>IT Career</span>
          </h1>
          <p className="text-purple-200 text-lg leading-relaxed max-w-sm">
            Industry-ready training, expert mentorship, and 100% placement assistance — all in one platform.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label}
                   className="rounded-2xl p-4 flex flex-col gap-2"
                   style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                       style={{ background: 'rgba(255,214,104,0.15)' }}>
                    <Icon size={16} style={{ color: '#ffd668' }} />
                  </div>
                  <span className="text-2xl font-extrabold text-white font-display">{value}</span>
                </div>
                <span className="text-xs text-purple-200 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-purple-300 text-xs">
          © {new Date().getFullYear()} CareerLabs — Madurai. All rights reserved.
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md animate-fadeInUp">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="font-display text-3xl font-extrabold tracking-tight">
              <span className="text-brand-600">Career</span>
              <span className="text-slate-800">Labs</span>
            </div>
            <div className="text-slate-500 text-sm mt-1">Learning Management System</div>
          </div>

          {/* Form card */}
          <div className="glass-card p-8">
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to your CareerLabs account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    className={clsx('input-field pl-10', errors.email && 'error')}
                  />
                </div>
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...register('password')}
                    className={clsx('input-field pl-10 pr-10', errors.password && 'error')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 accent-brand-600"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-brand-600 font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full mt-1"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Demo hint */}
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-xs font-semibold text-brand-700 mb-2 uppercase tracking-wide">Demo Credentials</p>
            <div className="flex flex-col gap-1.5">
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-brand-100 transition-colors text-left"
                >
                  <div>
                    <span className="text-xs font-semibold text-brand-800">{acc.role}</span>
                    <span className="text-xs text-slate-500 ml-2">{acc.email}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{acc.password}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Click any row to auto-fill credentials</p>
          </div>
        </div>
      </div>
    </div>
  )
}
