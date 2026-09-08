'use client'
import { useState, useEffect } from 'react'
import { Mail, Phone, Briefcase, Building2, ShieldCheck, Clock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import profileService from '@/services/profileService'
import { useAuth } from '@/context/AuthContext'
import tokenStorage from '@/utilities/tokenStorage'
import { isValidPhone, PHONE_ERROR_MESSAGE } from '@/utilities/validators'
import ProfilePhotoUploader from '@/components/shared/profile/ProfilePhotoUploader'
import ChangePasswordForm from '@/components/shared/profile/ChangePasswordForm'

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500'
const LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

const ROLE_CHIP = {
  SUPERADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-yellow-100 text-yellow-700',
  TRAINER: 'bg-green-100 text-green-700',
}

export default function AdminProfilePage() {
  const { setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [initialForm, setInitialForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    profileService.get()
      .then(r => {
        setProfile(r.data)
        const loadedForm = {
          name: r.data.name || '',
          phone: r.data.phone || '',
          designation: r.data.admin?.designation || '',
          department: r.data.admin?.department || '',
        }
        setForm(loadedForm)
        setInitialForm(loadedForm)
        setErrors({})
      })
      .catch(err => toast.error(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handlePhotoUploaded = (photoUrl) => {
    setProfile(p => ({ ...p, photoUrl }))
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, photoUrl }
      tokenStorage.setUser(updated)
      return updated
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name || !form.name.trim()) {
      errs.name = 'Full Name is required'
    }
    if (form.phone && !isValidPhone(form.phone)) {
      errs.phone = PHONE_ERROR_MESSAGE
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fill in all required fields correctly')
      return
    }
    setErrors({})
    if (initialForm && JSON.stringify(form) === JSON.stringify(initialForm)) {
      toast.error('No changes to save')
      return
    }
    setSaving(true)
    try {
      const res = await profileService.update(form)
      setProfile(res.data)
      const updatedForm = {
        name: res.data.name || '',
        phone: res.data.phone || '',
        designation: res.data.admin?.designation || '',
        department: res.data.admin?.department || '',
      }
      setForm(updatedForm)
      setInitialForm(updatedForm)
      setErrors({})
      // Keep the sidebar/topbar (both read the name from AuthContext, not this
      // page's own state) and the cached session in sync immediately, instead
      // of waiting for the next background /auth/me revalidation.
      setUser(prev => {
        if (!prev) return prev
        const updated = { ...prev, name: res.data.name }
        tokenStorage.setUser(updated)
        return updated
      })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile || !form) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">My Profile</h1>

      {/* Common section */}
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center gap-5">
          <ProfilePhotoUploader name={profile.name} photoUrl={profile.photoUrl} onUploaded={handlePhotoUploaded} />
          <div className="flex-1 min-w-[200px]">
            <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ROLE_CHIP[profile.role] || 'bg-purple-100 text-purple-700'}`}>
                {profile.role}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${profile.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {profile.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className={LABEL_CLS}>Last Login</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 justify-end">
              <Clock size={13} className="text-gray-400" />
              {profile.lastLoginAt ? format(new Date(profile.lastLoginAt), 'MMM d, yyyy h:mm a') : 'Never'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Personal + Professional Information */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Personal & Professional Information</h3>
          <form onSubmit={handleSave} noValidate className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Full Name *</label>
              <input type="text" required value={form.name}
                onChange={e => {
                  setForm(f => ({ ...f, name: e.target.value }))
                  if (errors.name && e.target.value.trim()) setErrors(err => ({ ...err, name: undefined }))
                }}
                className={`${INPUT_CLS} ${errors.name ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {errors.name}
                </p>
              )}
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-5">
                <Mail size={13} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <label className={LABEL_CLS}>Email</label>
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{profile.email}</p>
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}><Phone size={10} className="inline mr-1" />Phone</label>
              <input type="tel" inputMode="numeric" maxLength={10} value={form.phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setForm(f => ({ ...f, phone: val }))
                  if (errors.phone && isValidPhone(val)) setErrors(err => ({ ...err, phone: undefined }))
                }}
                placeholder="9876543210"
                className={`${INPUT_CLS} ${errors.phone ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {errors.phone}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}><Briefcase size={10} className="inline mr-1" />Designation</label>
              <input type="text" placeholder="e.g. Placement Officer" value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}><Building2 size={10} className="inline mr-1" />Department</label>
              <input type="text" placeholder="e.g. Training & Placement" value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security */}
        <div className="glass-card p-6 h-fit">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
            <ShieldCheck size={16} className="text-purple-600" /> Security
          </h3>
          <p className="text-xs text-gray-400 mb-4">Account created and last-login details are shown above. Role and account status are managed by a system administrator and can't be changed here.</p>
          {profile.role === 'SUPERADMIN' ? (
            <ChangePasswordForm />
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              Your password can only be reset by a <strong>SUPERADMIN</strong>. Please contact your administrator in person if you need a password change.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
