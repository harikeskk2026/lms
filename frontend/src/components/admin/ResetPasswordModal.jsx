'use client'
import { useState } from 'react'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import FormDrawer from '@/components/ui/FormDrawer'
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
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [apiErr, setApiErr] = useState('')

  if (!open || !user) return null

  const isPasswordValid = isValidPassword(newPassword)
  const isMatch = newPassword === confirmPwd && Boolean(confirmPwd)
  const isFormValid = isPasswordValid && isMatch
  const isDirty = Boolean(newPassword || confirmPwd)

  const passwordError = !newPassword
    ? 'New password is required'
    : !isPasswordValid
    ? PASSWORD_ERROR_MESSAGE
    : null

  const confirmError = !confirmPwd
    ? 'Please confirm the new password'
    : newPassword !== confirmPwd
    ? 'Passwords do not match'
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setApiErr('')

    if (!isFormValid) return

    setLoading(true)
    try {
      await adminApi.resetUserPassword(user.id, newPassword)
      toast.success(`Password reset for ${user.name}`)
      handleClose()
      onSuccess?.()
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to reset password'
      setApiErr(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNewPassword('')
    setConfirmPwd('')
    setTouched({})
    setSubmitted(false)
    setApiErr('')
    onClose()
  }

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title="Reset Password"
      subtitle={`${user?.name || ''} · ${user?.email || ''}`}
      isDirty={isDirty}
      width="w-full sm:w-[480px]"
    >
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-100 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
            <KeyRound size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={clsx(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
              user.role === 'TRAINER' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            )}>
              {user.role}
            </span>
            {user.active === false && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                Inactive
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm mb-0">
                New Password *
              </label>
              <button
                type="button"
                onClick={() => {
                  const gen = genPassword()
                  setNewPassword(gen)
                  setConfirmPwd(gen)
                }}
                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 font-semibold"
              >
                Generate strong password
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onBlur={() => setTouched(prev => ({ ...prev, newPassword: true }))}
                onChange={e => {
                  setNewPassword(e.target.value)
                  if (apiErr) setApiErr('')
                }}
                placeholder="Enter new password"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 pr-10 pl-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono transition-all',
                  ((touched.newPassword || submitted) && passwordError) && 'border-red-500'
                )}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {(touched.newPassword || submitted) && passwordError && (
              <p className="text-xs text-red-500 mt-1">{passwordError}</p>
            )}
            {newPassword && <PasswordStrengthMeter password={newPassword} />}
          </div>

          <div>
            <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onBlur={() => setTouched(prev => ({ ...prev, confirmPwd: true }))}
                onChange={e => {
                  setConfirmPwd(e.target.value)
                  if (apiErr) setApiErr('')
                }}
                placeholder="Re-enter new password"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 pr-10 pl-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono transition-all',
                  ((touched.confirmPwd || submitted) && confirmError) && 'border-red-500'
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {(touched.confirmPwd || submitted) && confirmError && (
              <p className="text-xs text-red-500 mt-1">{confirmError}</p>
            )}
          </div>

          {apiErr && (
            <p className="text-xs text-red-500 font-semibold p-2 bg-red-50 dark:bg-red-950/40 rounded-lg">
              {apiErr}
            </p>
          )}

          <div className="pt-2">
            <p className="text-[11px] text-slate-400">
              Resetting will immediately invalidate the user's active login sessions.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </FormDrawer>
  )
}
