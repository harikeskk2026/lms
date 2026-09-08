'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, Plus, ShieldCheck, KeyRound, RefreshCw, X, Mail, Phone, Building2, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { isValidEmail, EMAIL_ERROR_MESSAGE } from '@/utilities/validators'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'
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
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!authLoading && user && user.role !== 'SUPERADMIN') {
      toast.error('Access denied: Admins page is SUPERADMIN only')
      router.replace('/admin/dashboard')
    }
  }, [user, authLoading, router])

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAdmins({ search: search.trim() || undefined, status: statusFilter || undefined, page, limit: 10 })
      const data = res.data.data || res.data
      setAdmins(data.admins || data.content || [])
      setTotalElements(data.totalElements ?? data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') fetchAdmins()
  }, [fetchAdmins, user])

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!isValidEmail(form.email.trim())) errs.email = EMAIL_ERROR_MESSAGE
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Min 8 characters'
    if (form.phone && form.phone.trim() && form.phone.trim().length !== 10) errs.phone = 'Phone must be exactly 10 digits'
    setFormErr(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!validate()) return
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
      toast.success(`Admin ${admin.active ? 'deactivated' : 'activated'} successfully`)
      fetchAdmins()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
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
          <p className="text-slate-500 text-sm mt-1">SUPERADMIN only — create, manage and reset Admin credentials.</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setFormErr({}); setShowAddModal(true) }}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand-500/20">
          <Plus size={18} /> Add Admin
        </button>
      </div>

      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name or email..." className="input-field pl-10 text-sm py-2" />
        </div>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input-field text-sm py-2 pr-8">
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Admin</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Role Info</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
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
                      <button onClick={() => handleToggle(admin)} className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', admin.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')} title="Toggle status">
                        <span className={clsx('w-2 h-2 rounded-full', admin.active ? 'bg-green-500' : 'bg-slate-400')} />{admin.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setResetTarget(admin)} className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50" title="Reset Password"><KeyRound size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
            <span>Page {page} of {totalPages} ({totalElements} admins)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Add New Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} noValidate className="space-y-4">
              <div><label className="form-label">Full Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex Morgan" className={clsx('input-field text-sm', formErr.name && 'border-red-500')} />{formErr.name && <p className="text-xs text-red-500 mt-1">{formErr.name}</p>}</div>
              <div><label className="form-label">Email Address *</label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@careerlabs.com" className={clsx('input-field pl-9 text-sm', formErr.email && 'border-red-500')} /></div>{formErr.email && <p className="text-xs text-red-500 mt-1">{formErr.email}</p>}</div>
              <div><div className="flex items-center justify-between mb-1"><label className="form-label mb-0">Password *</label><button type="button" onClick={() => setForm({ ...form, password: genPassword() })} className="text-xs text-brand-600 hover:underline font-semibold">Generate Random</button></div><input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, click Generate" className={clsx('input-field text-sm font-mono', formErr.password && 'border-red-500')} />{formErr.password && <p className="text-xs text-red-500 mt-1">{formErr.password}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Phone</label><input type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g,'').slice(0,10) })} placeholder="9876543210" className={clsx('input-field text-sm', formErr.phone && 'border-red-500')} />{formErr.phone && <p className="text-xs text-red-500 mt-1">{formErr.phone}</p>}</div>
                <div><label className="form-label">Designation</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="Admin" className="input-field text-sm" /></div>
              </div>
              <div><label className="form-label">Department</label><input type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Operations" className="input-field text-sm" /></div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary text-sm min-w-[100px]">{submitting ? 'Creating...' : 'Create Admin'}</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      <ResetPasswordModal open={!!resetTarget} user={resetTarget} onClose={() => setResetTarget(null)} onSuccess={fetchAdmins} />
    </div>
  )
}
