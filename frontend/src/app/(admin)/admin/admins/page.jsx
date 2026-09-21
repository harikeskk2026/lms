'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, ShieldCheck, KeyRound, RefreshCw, Mail, Phone, Building2, Briefcase, Pencil, Trash2, FileDown, FileUp, Loader2, ArrowLeft, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import {
  isValidEmail,
  EMAIL_ERROR_MESSAGE,
  isValidName,
  NAME_ERROR_MESSAGE,
  filterNameKey,
  filterPhoneKey,
  sanitizePhone,
  isValidPhone,
  PHONE_ERROR_MESSAGE,
  isValidText,
  TEXT_ERROR_MESSAGE,
  filterTextKey,
  sanitizeText,
  isValidPassword,
  PASSWORD_ERROR_MESSAGE
} from '@/utilities/validators'
import LoginAccessToggle from '@/components/admin/LoginAccessToggle'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'
import CsvImportModal from '@/components/admin/CsvImportModal'
import CustomSelect from '@/components/ui/CustomSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import Pagination from '@/components/ui/Pagination'
import ViewToggle from '@/components/ui/ViewToggle'
import clsx from 'clsx'

const EMPTY_FORM = { name: '', email: '', password: '', phone: '', designation: '', department: '' }

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

export default function AdminsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [admins, setAdmins] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const abortRef = useRef(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [mounted, setMounted] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editTouched, setEditTouched] = useState({})
  const [editFormSubmitted, setEditFormSubmitted] = useState(false)

  const [deletingAdmin, setDeletingAdmin] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!authLoading && user && user.role !== 'SUPERADMIN') {
      toast.error('Access denied: Admins page is SUPERADMIN only')
      router.replace('/admin/dashboard')
    }
  }, [user, authLoading, router])

  const fetchAdmins = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await adminApi.getAdmins({ search: search.trim() || undefined, status: statusFilter || undefined, page, limit: pageSize }, { signal: controller.signal })
      const data = res.data.data || res.data
      setAdmins(data.admins || data.content || [])
      setTotalElements(data.totalElements ?? data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return
      toast.error(err.response?.data?.message || 'Failed to load admins')
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [search, statusFilter, page, pageSize])

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') fetchAdmins()
  }, [fetchAdmins, user])

  const [touched, setTouched] = useState({})
  const [formSubmitted, setFormSubmitted] = useState(false)

  const isFormDirty = Object.values(form).some(v => v !== '')

  const errors = {
    name: !form.name.trim()
      ? 'Full Name is required'
      : !isValidName(form.name.trim())
      ? NAME_ERROR_MESSAGE
      : null,
    email: !form.email.trim()
      ? 'Email Address is required'
      : !isValidEmail(form.email.trim())
      ? EMAIL_ERROR_MESSAGE
      : null,
    password: !form.password
      ? 'Password is required'
      : !isValidPassword(form.password)
      ? PASSWORD_ERROR_MESSAGE
      : null,
    phone: form.phone && form.phone.trim() && !isValidPhone(form.phone.trim())
      ? PHONE_ERROR_MESSAGE
      : null,
    designation: form.designation && form.designation.trim() && !isValidText(form.designation.trim())
      ? TEXT_ERROR_MESSAGE
      : null,
    department: form.department && form.department.trim() && !isValidText(form.department.trim())
      ? TEXT_ERROR_MESSAGE
      : null,
  }

  const isFormValid = !errors.name && !errors.email && !errors.password && !errors.phone && !errors.designation && !errors.department && Boolean(form.name.trim() && form.email.trim() && form.password)

  const editErrors = {
    name: !editForm.name.trim()
      ? 'Full Name is required'
      : !isValidName(editForm.name.trim())
      ? NAME_ERROR_MESSAGE
      : null,
    email: !editForm.email.trim()
      ? 'Email Address is required'
      : !isValidEmail(editForm.email.trim())
      ? EMAIL_ERROR_MESSAGE
      : null,
    phone: editForm.phone && editForm.phone.trim() && !isValidPhone(editForm.phone.trim())
      ? PHONE_ERROR_MESSAGE
      : null,
    designation: editForm.designation && editForm.designation.trim() && !isValidText(editForm.designation.trim())
      ? TEXT_ERROR_MESSAGE
      : null,
    department: editForm.department && editForm.department.trim() && !isValidText(editForm.department.trim())
      ? TEXT_ERROR_MESSAGE
      : null,
  }

  const isEditValid = !editErrors.name && !editErrors.email && !editErrors.phone && !editErrors.designation && !editErrors.department && Boolean(editForm.name.trim() && editForm.email.trim())

  const isEditDirty = Boolean(editingAdmin && (
    editForm.name !== (editingAdmin.name || '') ||
    editForm.email !== (editingAdmin.email || '') ||
    editForm.phone !== (editingAdmin.phone || '') ||
    editForm.designation !== (editingAdmin.designation || '') ||
    editForm.department !== (editingAdmin.department || '')
  ))

  function handleOpenEdit(admin) {
    setEditingAdmin(admin)
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      phone: admin.phone || '',
      designation: admin.designation || '',
      department: admin.department || '',
    })
    setEditTouched({})
    setEditFormSubmitted(false)
    setShowEditModal(true)
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setEditFormSubmitted(true)
    if (!isEditValid) return
    setSubmitting(true)
    try {
      await adminApi.updateAdmin(editingAdmin.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        designation: editForm.designation.trim() || null,
        department: editForm.department.trim() || null,
      })
      toast.success('Admin updated successfully!')
      setShowEditModal(false)
      fetchAdmins()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update admin')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingAdmin) return
    setIsDeleting(true)
    try {
      await adminApi.deleteAdmin(deletingAdmin.id)
      toast.success('Admin deleted successfully')
      setDeletingAdmin(null)
      fetchAdmins()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete admin')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormSubmitted(true)
    if (!isFormValid) return
    setSubmitting(true)
    try {
      await adminApi.createAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
      })
      toast.success('Admin created successfully!')
      setShowAddModal(false)
      setForm(EMPTY_FORM)
      setTouched({})
      setFormSubmitted(false)
      fetchAdmins()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(admin) {
    try {
      await adminApi.toggleAdminStatus(admin.id)
      toast.success(`Login access ${admin.active ? 'blocked' : 'allowed'} for ${admin.name}`)
      fetchAdmins()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update login access')
    }
  }

  const downloadCSV = async () => {
    try {
      setExporting(true)
      const exportLimit = Math.max(totalElements || 0, 10000)
      const res = await adminApi.getAdmins({ search: search.trim() || undefined, status: statusFilter || undefined, page: 1, limit: exportLimit })
      const data = res.data.data || res.data
      const allAdmins = data.admins || data.content || []
      if (allAdmins.length === 0) {
        toast.error('No admins found to export')
        return
      }

      const headers = ['Name', 'Email', 'Phone', 'Department', 'Designation', 'Login Access', 'Created']
      const rows = allAdmins.map(a => [
        a.name || '',
        a.email || '',
        a.phone || '',
        a.department || '',
        a.designation || '',
        a.active ? 'Active' : 'Inactive',
        a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
      ])

      const csvContent = '﻿' + [headers, ...rows]
        .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admins_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported all ${allAdmins.length} admin records`)
    } catch (err) {
      toast.error('Failed to export admins: ' + (err.response?.data?.message || err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  if (authLoading || user?.role !== 'SUPERADMIN') {
    return <div className="p-12 text-center text-slate-400">Checking access...</div>
  }

  return (
    <div className="space-y-6">
      {showAddModal ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25 flex-shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Create New Admin
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Create an admin account with platform management access.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false)
                setForm(EMPTY_FORM)
                setTouched({})
                setFormSubmitted(false)
              }}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all shadow-2xs hover:shadow-xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back to Admins
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleCreate} noValidate className="space-y-6">
            {/* Section 1: Basic Information */}
            <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <User size={14} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Basic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onKeyDown={filterNameKey}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    onBlur={() => setTouched(t => ({ ...t, name: true }))}
                    placeholder="Enter full name"
                    className={clsx(
                      'input-field text-sm',
                      (touched.name || formSubmitted) && errors.name && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(touched.name || formSubmitted) && errors.name && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Email Address *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))}
                      placeholder="Enter email address"
                      className={clsx(
                        'input-field pl-9 text-sm',
                        (touched.email || formSubmitted) && errors.email && 'border-red-500 focus:ring-red-400'
                      )}
                    />
                  </div>
                  {(touched.email || formSubmitted) && errors.email && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onKeyDown={filterPhoneKey}
                    onChange={e => {
                      const val = sanitizePhone(e.target.value)
                      setForm(f => ({ ...f, phone: val }))
                    }}
                    onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                    placeholder="Enter phone number"
                    className={clsx(
                      'input-field text-sm',
                      (touched.phone || formSubmitted) && errors.phone && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(touched.phone || formSubmitted) && errors.phone && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Role & Department */}
            <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Building2 size={14} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Role & Department
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onKeyDown={filterTextKey}
                    onChange={e => setForm(f => ({ ...f, department: sanitizeText(e.target.value) }))}
                    onBlur={() => setTouched(t => ({ ...t, department: true }))}
                    placeholder="e.g. Operations, Academics, Management"
                    className={clsx(
                      'input-field text-sm',
                      (touched.department || formSubmitted) && errors.department && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(touched.department || formSubmitted) && errors.department && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.department}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onKeyDown={filterTextKey}
                    onChange={e => setForm(f => ({ ...f, designation: sanitizeText(e.target.value) }))}
                    onBlur={() => setTouched(t => ({ ...t, designation: true }))}
                    placeholder="e.g. Operations Lead, Academic Director"
                    className={clsx(
                      'input-field text-sm',
                      (touched.designation || formSubmitted) && errors.designation && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(touched.designation || formSubmitted) && errors.designation && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.designation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Account Security */}
            <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <KeyRound size={14} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Account Security
                </h3>
              </div>

              <div className="max-w-md space-y-3">
                <div className="flex items-center justify-between">
                  <label className="form-label mb-0">Initial Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const p = genPassword()
                      setForm(f => ({ ...f, password: p }))
                      setTouched(t => ({ ...t, password: true }))
                    }}
                    className="text-xs text-brand-600 hover:underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="Enter initial password"
                  className={clsx(
                    'input-field text-sm font-mono',
                    (touched.password || formSubmitted) && errors.password && 'border-red-500 focus:ring-red-400'
                  )}
                />
                {form.password && <PasswordStrengthMeter password={form.password} />}
                {(touched.password || formSubmitted) && errors.password && (
                  <p className="text-xs text-red-500 font-medium">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setForm(EMPTY_FORM)
                  setTouched({})
                  setFormSubmitted(false)
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Creating Admin...' : 'Create Admin'}
              </button>
            </div>
          </form>
        </div>
      ) : showEditModal ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25 flex-shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Edit Admin Profile
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Update admin account details and department permissions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all shadow-2xs hover:shadow-xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back to Admins
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleUpdate} noValidate className="space-y-6">
            {/* Section 1: Basic Information */}
            <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <User size={14} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Basic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onKeyDown={filterNameKey}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    onBlur={() => setEditTouched(t => ({ ...t, name: true }))}
                    placeholder="Enter full name"
                    className={clsx(
                      'input-field text-sm',
                      (editTouched.name || editFormSubmitted) && editErrors.name && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(editTouched.name || editFormSubmitted) && editErrors.name && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{editErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Email Address *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      onBlur={() => setEditTouched(t => ({ ...t, email: true }))}
                      placeholder="Enter email address"
                      className={clsx(
                        'input-field pl-9 text-sm',
                        (editTouched.email || editFormSubmitted) && editErrors.email && 'border-red-500 focus:ring-red-400'
                      )}
                    />
                  </div>
                  {(editTouched.email || editFormSubmitted) && editErrors.email && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{editErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={editForm.phone}
                    onKeyDown={filterPhoneKey}
                    onChange={e => {
                      const val = sanitizePhone(e.target.value)
                      setEditForm(f => ({ ...f, phone: val }))
                    }}
                    onBlur={() => setEditTouched(t => ({ ...t, phone: true }))}
                    placeholder="Enter phone number"
                    className={clsx(
                      'input-field text-sm',
                      (editTouched.phone || editFormSubmitted) && editErrors.phone && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(editTouched.phone || editFormSubmitted) && editErrors.phone && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{editErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Role & Department */}
            <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Building2 size={14} />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Role & Department
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onKeyDown={filterTextKey}
                    onChange={e => setEditForm(f => ({ ...f, department: sanitizeText(e.target.value) }))}
                    onBlur={() => setEditTouched(t => ({ ...t, department: true }))}
                    placeholder="e.g. Operations, Academics, Management"
                    className={clsx(
                      'input-field text-sm',
                      (editTouched.department || editFormSubmitted) && editErrors.department && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(editTouched.department || editFormSubmitted) && editErrors.department && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{editErrors.department}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onKeyDown={filterTextKey}
                    onChange={e => setEditForm(f => ({ ...f, designation: sanitizeText(e.target.value) }))}
                    onBlur={() => setEditTouched(t => ({ ...t, designation: true }))}
                    placeholder="e.g. Operations Lead, Academic Director"
                    className={clsx(
                      'input-field text-sm',
                      (editTouched.designation || editFormSubmitted) && editErrors.designation && 'border-red-500 focus:ring-red-400'
                    )}
                  />
                  {(editTouched.designation || editFormSubmitted) && editErrors.designation && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{editErrors.designation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !isEditValid}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700"><ShieldCheck size={22} /></div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admins Management</h1>
              </div>
              <p className="text-slate-500 text-sm mt-1">Manage admin profiles, credentials, and access status.</p>
            </div>
            <button onClick={() => { setForm({ ...EMPTY_FORM }); setTouched({}); setFormSubmitted(false); setShowAddModal(true) }}
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand-500/20">
              <Plus size={18} /> Add Admin
            </button>
          </div>

          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1) }} placeholder="Search by name or email..." className="input-field pl-10 text-sm py-2" />
            </div>
            <div className="flex items-center gap-3">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => { setStatusFilter(val); setPage(1) }}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                placeholder="All Login Access"
                compact
              />
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
              >
                <FileUp size={15} /> Import
              </button>
              <button
                onClick={downloadCSV}
                disabled={exporting}
                className="flex items-center gap-2 bg-slate-100 text-slate-600 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                {exporting ? 'Exporting...' : 'Export'}
              </button>
              <ViewToggle value={viewMode} onChange={setViewMode} />

              <button onClick={fetchAdmins} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Refresh">
                <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden relative">
            {loading && admins.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <svg className="animate-spin h-8 w-8 mx-auto text-brand-600 mb-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg> Loading admins...
              </div>
            ) : admins.length === 0 ? (
              <div className="p-12 text-center"><ShieldCheck size={40} className="mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-700">No admins found</p></div>
            ) : viewMode === 'card' ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map(admin => (
                  <div
                    key={admin.id}
                    onClick={() => router.push(`/admin/admins/${admin.id}`)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 hover:shadow-md hover:border-purple-200 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                          {admin.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate group-hover:text-purple-600 transition-colors">{admin.name}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{admin.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setResetTarget(admin)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingAdmin(admin)
                            setEditForm({
                              name: admin.name || '',
                              email: admin.email || '',
                              phone: admin.phone || '',
                              designation: admin.designation || '',
                              department: admin.department || '',
                            })
                            setEditTouched({})
                            setEditFormSubmitted(false)
                            setShowEditModal(true)
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit admin"
                        >
                          <Pencil size={15} />
                        </button>
                        {user?.id !== admin.id && (
                          <button
                            onClick={() => setDeletingAdmin(admin)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete admin"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-2 truncate"><Mail size={13} className="text-slate-400 flex-shrink-0" /><span className="truncate">{admin.email}</span></div>
                      {admin.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400 flex-shrink-0" /><span>{admin.phone}</span></div>}
                      {admin.department && <div className="flex items-center gap-2 truncate"><Building2 size={13} className="text-slate-400 flex-shrink-0" /><span className="truncate">{admin.department}</span></div>}
                      {admin.designation && <div className="flex items-center gap-2 truncate"><Briefcase size={13} className="text-slate-400 flex-shrink-0" /><span className="truncate">{admin.designation}</span></div>}
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-slate-500 font-medium">Login Access</span>
                      <LoginAccessToggle
                        active={admin.active}
                        name={admin.name}
                        disabled={user?.id === admin.id}
                        disabledReason="You cannot deactivate your own account"
                        onToggle={() => handleToggle(admin)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-purple-50/60 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">S.No.</th>
                      <th className="py-3.5 px-4">Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Login Access</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                    {admins.map((admin, index) => (
                      <tr
                        key={admin.id}
                        onClick={() => router.push(`/admin/admins/${admin.id}`)}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                          {(page - 1) * pageSize + index + 1}
                        </td>
                        <td className="py-4 px-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/60 transition-colors">
                              {admin.name[0]?.toUpperCase()}
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{admin.name}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{admin.email}</p>
                        </td>
                        <td className="py-4 px-4">
                          {admin.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <Phone size={13} className="text-slate-400" />
                              {admin.phone}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">No contact number</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">{admin.role}</span>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {admin.department || <span className="text-slate-400 dark:text-slate-500 italic">—</span>}
                        </td>
                        <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                          <LoginAccessToggle
                            active={admin.active}
                            name={admin.name}
                            disabled={user?.id === admin.id}
                            disabledReason="You cannot deactivate your own account"
                            onToggle={() => handleToggle(admin)}
                          />
                        </td>
                        <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setResetTarget(admin)}
                              className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingAdmin(admin)
                                setEditForm({
                                  name: admin.name || '',
                                  email: admin.email || '',
                                  phone: admin.phone || '',
                                  designation: admin.designation || '',
                                  department: admin.department || '',
                                })
                                setEditTouched({})
                                setEditFormSubmitted(false)
                                setShowEditModal(true)
                              }}
                              className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                              title="Edit Admin"
                            >
                              <Pencil size={14} />
                            </button>
                            {user?.id !== admin.id && (
                              <button
                                onClick={() => setDeletingAdmin(admin)}
                                className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition-colors"
                                title="Delete Admin"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {loading && admins.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-slate-200 dark:border-gray-700 text-sm text-slate-600 dark:text-slate-300 font-medium">
                  <RefreshCw size={16} className="animate-spin text-brand-600" />
                  Refreshing...
                </div>
              </div>
            )}

            <Pagination
              total={totalElements}
              totalPages={totalPages}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
              label="admins"
            />
          </div>
        </>
      )}

      <DeleteConfirmModal
        isOpen={!!deletingAdmin}
        onClose={() => setDeletingAdmin(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Admin?"
        itemName={deletingAdmin?.name}
        loading={isDeleting}
      />

      <ResetPasswordModal open={!!resetTarget} user={resetTarget} onClose={() => setResetTarget(null)} onSuccess={fetchAdmins} />

      <CsvImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Admins"
        subtitle="Bulk-create admin accounts from a CSV file"
        entityLabel="admin"
        templateFilename="admins-import-template.csv"
        templateHeaders={['Name', 'Email', 'Password', 'Phone', 'Designation', 'Department']}
        templateRows={[['Ramesh Kumar', 'ramesh@careerlabs.in', '', '9876543210', 'Operations Lead', 'Operations']]}
        requiredColumns={['name', 'email']}
        showPasswordField
        passwordPlaceholder="Admin@123"
        submitFn={(file, opts) => adminApi.bulkImportAdmins(file, opts?.defaultPassword)}
        onSuccess={fetchAdmins}
        helpLines={[
          'Columns: Name (required), Email (required), Password, Phone, Designation, Department.',
          'Leave Password blank to use the default password (Admin@123) or the one you type below.',
          'Duplicate emails are skipped with a per-row error.',
        ]}
      />
    </div>
  )
}
