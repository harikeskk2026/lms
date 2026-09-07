'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import profileService from '@/services/profileService'
import { isValidPassword, PASSWORD_ERROR_MESSAGE } from '@/utilities/validators'

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500'
const LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

export default function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.currentPassword) {
      errs.currentPassword = 'Current password is required'
    }
    if (!form.newPassword) {
      errs.newPassword = 'New password is required'
    } else if (!isValidPassword(form.newPassword)) {
      errs.newPassword = PASSWORD_ERROR_MESSAGE
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Confirm password is required'
    } else if (form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = "Passwords don't match"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fill in all required password fields correctly')
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await profileService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success('Password changed')
      setForm(EMPTY)
      setErrors({})
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Current Password *</label>
        <input type="password" value={form.currentPassword}
          onChange={e => {
            setForm(f => ({ ...f, currentPassword: e.target.value }))
            if (errors.currentPassword && e.target.value) setErrors(err => ({ ...err, currentPassword: undefined }))
          }}
          className={`${INPUT_CLS} ${errors.currentPassword ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
        {errors.currentPassword && (
          <p className="text-xs text-red-500 mt-1 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {errors.currentPassword}
          </p>
        )}
      </div>
      <div>
        <label className={LABEL_CLS}>New Password *</label>
        <input type="password" value={form.newPassword}
          onChange={e => {
            setForm(f => ({ ...f, newPassword: e.target.value }))
            if (errors.newPassword && isValidPassword(e.target.value)) setErrors(err => ({ ...err, newPassword: undefined }))
          }}
          className={`${INPUT_CLS} ${errors.newPassword ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
        {errors.newPassword && (
          <p className="text-xs text-red-500 mt-1 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {errors.newPassword}
          </p>
        )}
      </div>
      <div>
        <label className={LABEL_CLS}>Confirm New Password *</label>
        <input type="password" value={form.confirmPassword}
          onChange={e => {
            setForm(f => ({ ...f, confirmPassword: e.target.value }))
            if (errors.confirmPassword && e.target.value === form.newPassword) setErrors(err => ({ ...err, confirmPassword: undefined }))
          }}
          className={`${INPUT_CLS} ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
        {errors.confirmPassword && (
          <p className="text-xs text-red-500 mt-1 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {errors.confirmPassword}
          </p>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-medium hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm disabled:opacity-60">
          <Lock size={12} /> {saving ? 'Updating...' : 'Change Password'}
        </button>
      </div>
    </form>
  )
}
