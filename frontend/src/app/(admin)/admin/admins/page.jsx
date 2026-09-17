'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, ShieldCheck, KeyRound, RefreshCw, Mail, Phone, Building2, Briefcase, Eye, Pencil, Trash2, FileDown, Loader2 } from 'lucide-react'
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
  isValidPassword,
  PASSWORD_ERROR_MESSAGE
} from '@/utilities/validators'
import LoginAccessToggle from '@/components/admin/LoginAccessToggle'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'
import CustomSelect from '@/components/ui/CustomSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import FormDrawer from '@/components/ui/FormDrawer'
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
  const rest = Array.from({ length: 6 }, () => pick(all))
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
  }

  const isFormValid = !errors.name && !errors.email && !errors.password && !errors.phone && Boolean(form.name.trim() && form.email.trim() && form.password)

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
  }

  const isEditValid = !editErrors.name && !editErrors.email && !editErrors.phone && Boolean(editForm.name.trim() && editForm.email.trim())

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

      <div className="glass-card overflow-hidden">
        {loading ? (
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
                className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 hover:shadow-md hover:border-purple-200 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {admin.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{admin.name}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{admin.email}</p>
                    </div>
                  </div>
                  <LoginAccessToggle
                    active={admin.active}
                    name={admin.name}
                    onToggle={() => handleToggle(admin)}
                    disabled={admin.id === user?.id}
                    disabledReason="You cannot deactivate your own account"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400 uppercase text-[10px] font-semibold mb-0.5">Contact</p>
                    <span className="text-slate-600 truncate block">{admin.phone || '—'}</span>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase text-[10px] font-semibold mb-0.5">Created</p>
                    <span className="text-slate-600 truncate block">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 uppercase text-[10px] font-semibold mb-0.5">Role Info</p>
                    {admin.designation || admin.department ? (
                      <span className="text-slate-700 font-medium">
                        {admin.designation || '—'}{admin.department ? ` · ${admin.department}` : ''}
                      </span>
                    ) : <span className="text-slate-400 italic">—</span>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 mt-auto border-t border-slate-100">
                  <button onClick={() => router.push(`/admin/admins/${admin.id}`)}
                    className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors" title="View Details">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => setResetTarget(admin)}
                    className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors" title="Reset Password">
                    <KeyRound size={14} />
                  </button>
                  <button onClick={() => handleOpenEdit(admin)}
                    className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeletingAdmin(admin)}
                    disabled={admin.id === user?.id}
                    className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      admin.id === user?.id
                        ? 'bg-slate-50 text-slate-300 dark:bg-gray-800/50 dark:text-gray-600 cursor-not-allowed'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60'
                    )}
                    title={admin.id === user?.id ? 'You cannot delete your own account' : 'Delete'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">S.No.</th>
                  <th className="py-3.5 px-6">Admin</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Role Info</th>
                  <th className="py-3.5 px-4">Login Access</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((admin, index) => (
                  <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 text-center font-semibold text-slate-500 text-xs">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm flex-shrink-0">{admin.name[0]?.toUpperCase()}</div>
                        <div><p className="font-bold text-slate-900">{admin.name}</p><p className="text-xs text-slate-400 font-mono">{admin.email}</p></div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600">{admin.phone || <span className="text-slate-400 italic">—</span>}</td>
                    <td className="py-4 px-4">
                      {admin.designation || admin.department ? (
                        <div><p className="text-xs font-semibold text-slate-800">{admin.designation || '—'}</p><p className="text-[11px] text-slate-400">{admin.department || ''}</p></div>
                      ) : <span className="text-xs text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-4 px-4">
                      <LoginAccessToggle
                        active={admin.active}
                        name={admin.name}
                        onToggle={() => handleToggle(admin)}
                        disabled={admin.id === user?.id}
                        disabledReason="You cannot deactivate your own account"
                      />
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => router.push(`/admin/admins/${admin.id}`)}
                          className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => setResetTarget(admin)}
                          className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors" title="Reset Password">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleOpenEdit(admin)}
                          className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeletingAdmin(admin)}
                          disabled={admin.id === user?.id}
                          className={clsx(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                            admin.id === user?.id
                              ? 'bg-slate-50 text-slate-300 dark:bg-gray-800/50 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60'
                          )}
                          title={admin.id === user?.id ? 'You cannot delete your own account' : 'Delete'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <FormDrawer
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setForm(EMPTY_FORM)
          setTouched({})
          setFormSubmitted(false)
        }}
        title="Add New Admin"
        subtitle="Create an administrator account with platform management access"
        isDirty={isFormDirty}
      >
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onKeyDown={filterNameKey}
              onChange={e => {
                const val = e.target.value
                setForm(f => ({ ...f, name: val }))
              }}
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
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Password *</label>
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
              placeholder="Enter password"
              className={clsx(
                'input-field text-sm font-mono',
                (touched.password || formSubmitted) && errors.password && 'border-red-500 focus:ring-red-400'
              )}
            />
            {form.password && <PasswordStrengthMeter password={form.password} />}
            {(touched.password || formSubmitted) && errors.password && (
              <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="form-label">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                placeholder="Enter designation"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              placeholder="Enter department"
              className="input-field text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="btn-primary text-sm min-w-[110px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </FormDrawer>

      <FormDrawer
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Admin"
        subtitle="Update this administrator's profile details"
        isDirty={isEditDirty}
      >
        <form onSubmit={handleUpdate} noValidate className="space-y-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              value={editForm.name}
              onKeyDown={filterNameKey}
              onChange={e => {
                const val = e.target.value
                setEditForm(f => ({ ...f, name: val }))
              }}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="form-label">Designation</label>
              <input
                type="text"
                value={editForm.designation}
                onChange={e => setEditForm(f => ({ ...f, designation: e.target.value }))}
                placeholder="Enter designation"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Department</label>
            <input
              type="text"
              value={editForm.department}
              onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
              placeholder="Enter department"
              className="input-field text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isEditValid}
              className="btn-primary text-sm min-w-[110px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </FormDrawer>

      <DeleteConfirmModal
        isOpen={!!deletingAdmin}
        onClose={() => setDeletingAdmin(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Admin?"
        itemName={deletingAdmin?.name}
        loading={isDeleting}
      />

      <ResetPasswordModal open={!!resetTarget} user={resetTarget} onClose={() => setResetTarget(null)} onSuccess={fetchAdmins} />
    </div>
  )
}
