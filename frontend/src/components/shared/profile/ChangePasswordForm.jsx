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
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidPassword(form.newPassword)) {
      toast.error(PASSWORD_ERROR_MESSAGE)
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New password and confirmation don't match")
      return
    }
    setSaving(true)
    try {
      await profileService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success('Password changed')
      setForm(EMPTY)
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Current Password</label>
        <input type="password" required value={form.currentPassword}
          onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
          className={INPUT_CLS} />
      </div>
      <div>
        <label className={LABEL_CLS}>New Password</label>
        <input type="password" required minLength={8} value={form.newPassword}
          onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
          className={INPUT_CLS} />
      </div>
      <div>
        <label className={LABEL_CLS}>Confirm New Password</label>
        <input type="password" required minLength={8} value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          className={INPUT_CLS} />
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-medium hover:from-purple-700 transition-all shadow-sm disabled:opacity-60">
          <Lock size={12} /> {saving ? 'Updating...' : 'Change Password'}
        </button>
      </div>
    </form>
  )
}
