'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import { isValidPassword, PASSWORD_ERROR_MESSAGE } from '@/utilities/validators'
import clsx from 'clsx'

function genPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '@#$!'
  const all = upper + lower + digits + special
  const pick = (pool) => pool[Math.floor(Math.random() * pool.length)]
  const required = [pick(upper), pick(lower), pick(digits), pick(special)]
  const rest = Array.from({ length: 8 }, () => pick(all))
  const combined = [...required, ...rest]
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined.join('')
}

export default function ResetPasswordModal({ open, onClose, user, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  if (!open || !user) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!isValidPassword(newPassword)) {
      setErr(PASSWORD_ERROR_MESSAGE)
      return
    }
    if (newPassword !== confirmPwd) {
      setErr('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await adminApi.resetUserPassword(user.id, newPassword)
      toast.success(`Password reset for ${user.name}`)
      setNewPassword('')
      setConfirmPwd('')
      onSuccess?.()
      onClose()
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to reset password'
      setErr(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNewPassword('')
    setConfirmPwd('')
    setErr('')
    onClose()
  }

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-scaleUp mx-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Reset Password</h3>
              <p className="text-xs text-slate-500">{user.name} · {user.email}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full',
            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
            user.role === 'TRAINER' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          )}>{user.role}</span>
          {user.active === false && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">New Password *</label>
              <button type="button" onClick={() => setNewPassword(genPassword())} className="text-xs text-brand-600 hover:underline font-semibold">Generate</button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, uppercase + number"
                autoFocus
                className={clsx('input-field pr-10 text-sm font-mono', err && 'border-red-500')}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && <PasswordStrengthMeter password={newPassword} />}
          </div>

          <div>
            <label className="form-label">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                className={clsx('input-field pr-10 text-sm', err && 'border-red-500')}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
            <button type="button" onClick={handleClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm min-w-[110px]">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-400 text-center">This will immediately invalidate the user's active sessions.</p>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') return createPortal(content, document.body)
  return content
}
