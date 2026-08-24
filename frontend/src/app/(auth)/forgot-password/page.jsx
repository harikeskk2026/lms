'use client'
import { useState, useRef, useEffect } from 'react'
import { Mail, ArrowLeft, Check, Shield, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import api from '@/lib/api'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'

const STEPS = [
  { id: 1, label: 'Email',    icon: Mail },
  { id: 2, label: 'OTP',      icon: Shield },
  { id: 3, label: 'Password', icon: KeyRound },
]

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [step, setStep]           = useState(1)
  const [email, setEmail]         = useState('')
  const [emailErr, setEmailErr]   = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [otpErr, setOtpErr]       = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef([])

  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState(false)
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [confirmPwd, setConfirmPwd]       = useState('')
  const [pwdErr, setPwdErr]               = useState('')
  const [resetLoading, setResetLoading]   = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ── Step 1: Send OTP ────────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault()
    setEmailErr('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Please enter a valid email address')
      return
    }
    setEmailLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      toast.success('OTP sent! Check your email.')
      setCountdown(60)
      setStep(2)
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong'
      toast.error(msg)
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleResendOtp() {
    if (countdown > 0) return
    setOtpErr('')
    try {
      await api.post('/auth/forgot-password', { email })
      toast.success('New OTP sent!')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend OTP')
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────
  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!paste) return
    const next = [...paste.split(''), ...Array(6).fill('')].slice(0, 6)
    setOtp(next)
    const lastFilledIdx = Math.min(paste.length, 5)
    otpRefs.current[lastFilledIdx]?.focus()
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setOtpErr('')
    const otpStr = otp.join('')
    if (otpStr.length !== 6) {
      setOtpErr('Please enter the complete 6-digit OTP')
      return
    }
    setOtpLoading(true)
    try {
      await api.post('/auth/verify-otp', { email, otp: otpStr })
      toast.success('OTP verified!')
      setStep(3)
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP'
      setOtpErr(msg)
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Step 3: Reset Password ──────────────────────────────────────────
  async function handleResetPassword(e) {
    e.preventDefault()
    setPwdErr('')
    if (newPassword.length < 8) {
      setPwdErr('Password must be at least 8 characters')
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setPwdErr('Password must have uppercase, lowercase, and number')
      return
    }
    if (newPassword !== confirmPwd) {
      setPwdErr('Passwords do not match')
      return
    }
    setResetLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: otp.join(''),
        newPassword,
        confirmPassword: confirmPwd
      })
      toast.success('Password reset successfully! Redirecting to login...')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password'
      setPwdErr(msg)
      toast.error(msg)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fadeInUp">

        {/* Back link */}
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-6 transition-colors">
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        {/* Logo */}
        <div className="font-display text-2xl font-extrabold tracking-tight mb-6">
          <span className="text-brand-600">Career</span>
          <span className="text-slate-800">Labs</span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const done    = step > s.id
            const active  = step === s.id
            const Icon    = s.icon
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                  done   ? 'bg-green-500 text-white' :
                  active ? 'bg-brand-600 text-white shadow-glow' :
                           'bg-slate-200 text-slate-400'
                )}>
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className={clsx(
                  'text-xs font-semibold',
                  active ? 'text-brand-600' : done ? 'text-green-600' : 'text-slate-400'
                )}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={clsx(
                    'h-0.5 w-8 rounded-full transition-all duration-500',
                    done ? 'bg-green-400' : 'bg-slate-200'
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Step 1 ─── */}
        {step === 1 && (
          <div className="glass-card p-8">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Forgot Password?</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your registered email and we'll send you a 6-digit OTP.</p>

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4" noValidate>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    className={clsx('input-field pl-10', emailErr && 'error')}
                  />
                </div>
                {emailErr && <span className="form-error">{emailErr}</span>}
              </div>
              <button type="submit" disabled={emailLoading} className="btn-primary w-full">
                {emailLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Sending...
                  </>
                ) : 'Send OTP'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2 ─── */}
        {step === 2 && (
          <div className="glass-card p-8">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Enter OTP</h2>
            <p className="text-slate-500 text-sm mb-1">
              We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>
            </p>
            <p className="text-xs text-slate-400 mb-6">Check your spam folder if you don't see it.</p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6" noValidate>
              {/* OTP Boxes */}
              <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className={clsx(
                      'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150',
                      'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200',
                      digit ? 'border-brand-400 text-brand-700 bg-brand-50' : 'border-slate-200 text-slate-900 bg-white',
                      otpErr && 'border-red-400'
                    )}
                  />
                ))}
              </div>
              {otpErr && <p className="text-center text-sm text-red-500">{otpErr}</p>}

              <button type="submit" disabled={otpLoading} className="btn-primary w-full">
                {otpLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying...
                  </>
                ) : 'Verify OTP'}
              </button>

              {/* Resend */}
              <div className="text-center">
                <span className="text-sm text-slate-500">Didn't receive it? </span>
                {countdown > 0 ? (
                  <span className="text-sm text-slate-400">Resend in <strong className="text-brand-600">{countdown}s</strong></span>
                ) : (
                  <button type="button" onClick={handleResendOtp} className="text-sm text-brand-600 font-semibold hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors text-center"
              >
                ← Change email
              </button>
            </form>
          </div>
        )}

        {/* ── Step 3 ─── */}
        {step === 3 && (
          <div className="glass-card p-8">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Set New Password</h2>
            <p className="text-slate-500 text-sm mb-6">Choose a strong password for your account.</p>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-5" noValidate>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, uppercase + number"
                    autoFocus
                    className={clsx('input-field pr-10', pwdErr && 'error')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showNew
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {newPassword && <PasswordStrengthMeter password={newPassword} />}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Repeat your new password"
                    className={clsx('input-field pr-10', pwdErr && !newPassword && 'error')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirm
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {pwdErr && <p className="text-sm text-red-500">{pwdErr}</p>}

              <button type="submit" disabled={resetLoading} className="btn-primary w-full mt-1">
                {resetLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Resetting...
                  </>
                ) : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
