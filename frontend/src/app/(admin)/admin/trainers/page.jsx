'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Pencil, Trash2, UserCheck, Mail, Phone, Building2, Briefcase, RefreshCw, X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import clsx from 'clsx'

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  designation: '',
  department: '',
}

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

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState({})
  const [editingTrainer, setEditingTrainer] = useState(null)
  const [deletingTrainer, setDeletingTrainer] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchTrainers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getTrainers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      })
      const data = res.data.data
      setTrainers(data.trainers || [])
      setTotalElements(data.totalElements || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load trainers')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchTrainers()
  }, [fetchTrainers])

  // Open Create Modal
  function handleOpenAdd() {
    setForm({ ...EMPTY_FORM, password: genPassword() })
    setFormErr({})
    setShowAddModal(true)
  }

  // Open Edit Modal
  function handleOpenEdit(trainer) {
    setEditingTrainer(trainer)
    setForm({
      name: trainer.name || '',
      email: trainer.email || '',
      password: '',
      phone: trainer.phone || '',
      designation: trainer.designation || '',
      department: trainer.department || '',
    })
    setFormErr({})
    setShowEditModal(true)
  }

  // Open Delete Modal
  function handleOpenDelete(trainer) {
    setDeletingTrainer(trainer)
    setShowDeleteModal(true)
  }

  // Validate form
  function validate(isEdit = false) {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Invalid email format'

    if (!isEdit) {
      if (!form.password) errs.password = 'Password is required'
      else if (form.password.length < 6) errs.password = 'Min 6 characters'
    }
    setFormErr(errs)
    return Object.keys(errs).length === 0
  }

  // Submit Create Trainer
  async function handleCreateTrainer(e) {
    e.preventDefault()
    if (!validate(false)) return
    setSubmitting(true)
    try {
      await adminApi.createTrainer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        department: form.department.trim() || undefined,
      })
      toast.success('Trainer created successfully!')
      setShowAddModal(false)
      fetchTrainers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trainer')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Update Trainer
  async function handleUpdateTrainer(e) {
    e.preventDefault()
    if (!validate(true)) return
    setSubmitting(true)
    try {
      await adminApi.updateTrainer(editingTrainer.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        department: form.department.trim() || undefined,
      })
      toast.success('Trainer updated successfully!')
      setShowEditModal(false)
      fetchTrainers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update trainer')
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Active Status
  async function handleToggleStatus(trainer) {
    try {
      await adminApi.toggleTrainerStatus(trainer.id)
      toast.success(`Trainer ${trainer.active ? 'deactivated' : 'activated'} successfully`)
      fetchTrainers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update trainer status')
    }
  }

  // Confirm Delete Trainer
  async function handleConfirmDelete() {
    if (!deletingTrainer) return
    setSubmitting(true)
    try {
      await adminApi.deleteTrainer(deletingTrainer.id)
      toast.success('Trainer deleted successfully')
      setShowDeleteModal(false)
      fetchTrainers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete trainer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <UserCheck size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trainers Management</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">Manage trainer profiles, credentials, departments, and active statuses.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-brand-500/20 active:scale-95"
        >
          <Plus size={18} />
          Add Trainer
        </button>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-purple-600 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trainers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalElements}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-green-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Trainers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {trainers.filter(t => t.active).length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-slate-400 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {trainers.filter(t => !t.active).length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-semibold text-xs">
            Off
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or email..."
            className="input-field pl-10 text-sm py-2"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="input-field text-sm py-2 pr-8"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={fetchTrainers}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Trainers Data Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="animate-spin h-8 w-8 mx-auto text-brand-600 mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading trainers...
          </div>
        ) : trainers.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700 text-lg">No trainers found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search criteria or add a new trainer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Trainer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Department & Designation</th>
                  <th className="py-3.5 px-4">Assigned Batches</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainers.map(trainer => (
                  <tr key={trainer.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                          {trainer.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{trainer.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{trainer.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {trainer.phone ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone size={13} className="text-slate-400" />
                          {trainer.phone}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No phone</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{trainer.designation || 'Trainer'}</p>
                        <p className="text-[11px] text-slate-400">{trainer.department || 'Academics'}</p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {trainer.batches && trainer.batches.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {trainer.batches.map(b => (
                            <Link
                              key={b.id}
                              href={`/admin/batches/${b.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-sm border border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition-all"
                              title={`${b.courseTitle ? b.courseTitle + ' · ' : ''}${b.timing || 'No time set'}`}
                            >
                              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', b.active ? 'bg-green-500' : 'bg-slate-400')} />
                              <span className="truncate max-w-[130px]">{b.name}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No batches assigned</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(trainer)}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150',
                          trainer.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                        title="Click to toggle status"
                      >
                        <span className={clsx('w-2 h-2 rounded-full', trainer.active ? 'bg-green-500' : 'bg-slate-400')} />
                        {trainer.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(trainer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Trainer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(trainer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Trainer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing page {page} of {totalPages} ({totalElements} trainers)</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">Add New Trainer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTrainer} className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dr. Alex Johnson"
                  className={clsx('input-field text-sm', formErr.name && 'border-red-500')}
                />
                {formErr.name && <p className="text-xs text-red-500 mt-1">{formErr.name}</p>}
              </div>

              <div>
                <label className="form-label">Email Address *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="trainer@careerlabs.com"
                    className={clsx('input-field pl-9 text-sm', formErr.email && 'border-red-500')}
                  />
                </div>
                {formErr.email && <p className="text-xs text-red-500 mt-1">{formErr.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0">Initial Password *</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, password: genPassword() })}
                    className="text-xs text-brand-600 hover:underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className={clsx('input-field pl-9 text-sm font-mono', formErr.password && 'border-red-500')}
                  />
                </div>
                {formErr.password && <p className="text-xs text-red-500 mt-1">{formErr.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    placeholder="Senior Trainer"
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  placeholder="Computer Science / Full Stack"
                  className="input-field text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-sm min-w-[100px]"
                >
                  {submitting ? 'Creating...' : 'Create Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trainer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">Edit Trainer Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateTrainer} className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={clsx('input-field text-sm', formErr.name && 'border-red-500')}
                />
                {formErr.name && <p className="text-xs text-red-500 mt-1">{formErr.name}</p>}
              </div>

              <div>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className={clsx('input-field text-sm', formErr.email && 'border-red-500')}
                />
                {formErr.email && <p className="text-xs text-red-500 mt-1">{formErr.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              {editingTrainer?.batches && editingTrainer.batches.length > 0 && (
                <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-800/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Assigned Batches ({editingTrainer.batches.length})
                    </p>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">Click to view</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {editingTrainer.batches.map(b => (
                      <Link
                        key={b.id}
                        href={`/admin/batches/${b.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-200 hover:border-purple-400 shadow-2xs transition-all"
                        title={`${b.courseTitle ? b.courseTitle + ' · ' : ''}${b.timing || ''}`}
                      >
                        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', b.active ? 'bg-green-500' : 'bg-slate-400')} />
                        <span className="truncate max-w-[140px]">{b.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-sm min-w-[100px]"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Delete Trainer Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deletingTrainer.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary text-sm w-1/2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-xl w-1/2 transition-colors"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
