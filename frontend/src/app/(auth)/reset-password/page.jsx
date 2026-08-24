'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import api from '@/lib/api'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const emailParam = searchParams.get('email') || ''
  const otpParam   = searchParams.get('otp')   || ''

  const [email, setEmail]             = useState(emailParam)
  const [otp, setOtp]                 = useState(otpParam)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdErr, setPwdErr]           = useState('')
  const [loading, setLoading]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setPwdErr('')

    if (!email || !otp) {
      setPwdErr('Invalid reset link. Please use the forgot password flow.')
      return
    }
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

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
        confirmPassword: confirmPwd
      })
      toast.success('Password reset successfully!')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. The link may have expired.'
      setPwdErr(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }) => open
    ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fadeInUp">
        <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-6 transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="font-display text-2xl font-extrabold tracking-tight mb-6">
          <span className="text-brand-600">Career</span>
          <span className="text-slate-800">Labs</span>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Set New Password</h2>
          <p className="text-slate-500 text-sm mb-6">
            {emailParam
              ? `Resetting password for ${emailParam}`
              : 'Enter your new password below.'}
          </p>

          {(!emailParam || !otpParam) && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              This link appears invalid or expired.{' '}
              <Link href="/forgot-password" className="font-semibold underline">Request a new OTP</Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {!emailParam && (
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field"
                />
              </div>
            )}
            {!otpParam && (
              <div className="form-group">
                <label className="form-label">OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="input-field"
                />
              </div>
            )}

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
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                  <EyeIcon open={showNew} />
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
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {pwdErr && <p className="text-sm text-red-500">{pwdErr}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? (
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
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
