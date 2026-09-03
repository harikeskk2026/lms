'use client'
import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, Award, Linkedin, Github, ShieldCheck, Clock, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import profileService from '@/services/profileService'
import { useAuth } from '@/context/AuthContext'
import tokenStorage from '@/utilities/tokenStorage'
import { isValidPhone, PHONE_ERROR_MESSAGE, isValidUrl, LINKEDIN_URL_ERROR_MESSAGE, GITHUB_URL_ERROR_MESSAGE } from '@/utilities/validators'
import ProfilePhotoUploader from '@/components/shared/profile/ProfilePhotoUploader'
import ChangePasswordForm from '@/components/shared/profile/ChangePasswordForm'
import AcademicDetailsSection from '@/components/student/profile/AcademicDetailsSection'

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500'
const LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

export default function StudentProfilePage() {
  const { setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    profileService.get()
      .then(r => {
        setProfile(r.data)
        setForm({
          name: r.data.name || '',
          phone: r.data.phone || '',
          address: r.data.student?.address || '',
          qualification: r.data.student?.qualification || '',
          linkedinUrl: r.data.student?.linkedinUrl || '',
          githubUrl: r.data.student?.githubUrl || '',
        })
      })
      .catch(err => toast.error(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handlePhotoUploaded = (photoUrl) => {
    setProfile(p => ({ ...p, photoUrl }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error(PHONE_ERROR_MESSAGE)
      return
    }
    if (form.linkedinUrl && !isValidUrl(form.linkedinUrl)) {
      toast.error(LINKEDIN_URL_ERROR_MESSAGE)
      return
    }
    if (form.githubUrl && !isValidUrl(form.githubUrl)) {
      toast.error(GITHUB_URL_ERROR_MESSAGE)
      return
    }
    setSaving(true)
    try {
      const res = await profileService.update(form)
      setProfile(res.data)
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

  const academic = profile.student
  const missingFields = academic?.missingAcademicFields || []

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
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{profile.role}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${profile.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {profile.active ? 'Active' : 'Inactive'}
              </span>
              {academic?.enrollmentNo && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{academic.enrollmentNo}</span>
              )}
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

      {/* Profile-completion nudge, feeding into Placement eligibility */}
      {missingFields.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-amber-400 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Complete your academic profile</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Missing: {missingFields.join(', ')}. Placement drives can't check your eligibility accurately until these are filled in below.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Personal Information */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Personal Information</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Full Name</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={INPUT_CLS} />
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
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="9876543210"
                className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}><MapPin size={10} className="inline mr-1" />Address</label>
              <input type="text" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}><Award size={10} className="inline mr-1" />Qualification</label>
              <input type="text" value={form.qualification}
                onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}><Linkedin size={10} className="inline mr-1" />LinkedIn URL</label>
              <input type="url" value={form.linkedinUrl}
                onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                placeholder="linkedin.com/in/yourname"
                className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}><Github size={10} className="inline mr-1" />GitHub URL</label>
              <input type="url" value={form.githubUrl}
                onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))}
                placeholder="github.com/yourname"
                className={INPUT_CLS} />
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Personal Information'}
            </button>
          </form>
        </div>

        <div className="space-y-5">
          {/* Academic Details */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-1">Academic Details</h3>
            <p className="text-xs text-gray-400 mb-4">
              Used as the single source of truth to automatically check your eligibility for{' '}
              <Link href="/student/placement" className="text-purple-600 hover:underline">placement opportunities</Link>.
            </p>
            <AcademicDetailsSection onSaved={load} />
          </div>

          {/* Security */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-600" /> Security
            </h3>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  )
}
