'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Key, Pencil, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import SlidePanel from '@/components/admin/SlidePanel'

const PLACEMENT_COLORS = {
  SEEKING:      'bg-blue-100 text-blue-700',
  INTERVIEWING: 'bg-yellow-100 text-yellow-700',
  PLACED:       'bg-green-100 text-green-700',
  NOT_SEEKING:  'bg-gray-100 text-gray-600',
}

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [placementFilter, setPlacementFilter] = useState('')
  const [batches, setBatches] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', batchId: '' })
  const [saving, setSaving] = useState(false)
  const searchTimer = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.getStudents({ search, batchId: batchFilter, status: statusFilter, placementStatus: placementFilter, page, limit: 20 })
      .then(r => {
        const d = r.data.data
        setStudents(d.students)
        setTotal(d.total)
        setTotalPages(d.totalPages)
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }, [search, batchFilter, statusFilter, placementFilter, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.createStudent(form)
      toast.success('Student created successfully')
      setPanelOpen(false)
      setForm({ name: '', email: '', phone: '', password: '', batchId: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student')
    } finally { setSaving(false) }
  }

  const handleToggleStatus = async (id, current) => {
    try {
      await adminApi.toggleStudentStatus(id)
      toast.success(`Student ${current ? 'deactivated' : 'activated'}`)
      load()
    } catch { toast.error('Failed to update status') }
  }

  const handleResetPw = async (id) => {
    const pw = genPassword()
    if (!confirm(`Reset password to: ${pw}\n\nCopy this password and share with student.`)) return
    try {
      await adminApi.resetStudentPassword(id, { newPassword: pw })
      toast.success('Password reset successfully')
    } catch { toast.error('Failed to reset password') }
  }

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Enrollment', 'Batch', 'Placement', 'Status']
    const rows = students.map(s => [
      s.name, s.email, s.phone || '',
      s.studentProfile?.enrollmentNo || '',
      s.studentProfile?.enrollments?.[0]?.batch?.name || '',
      s.studentProfile?.placementStatus || '',
      s.isActive ? 'Active' : 'Inactive',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'students.csv'; a.click()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Students</h1>
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">{total}</span>
        </div>
        <button
          onClick={() => { setEditStudent(null); setForm({ name: '', email: '', phone: '', password: '', batchId: '' }); setPanelOpen(true) }}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 transition-all"
        >
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-purple-400 flex-shrink-0" />
          <input
            placeholder="Search by name or email..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          value={placementFilter} onChange={e => { setPlacementFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Placement</option>
          <option value="SEEKING">Seeking</option>
          <option value="INTERVIEWING">Interviewing</option>
          <option value="PLACED">Placed</option>
          <option value="NOT_SEEKING">Not Seeking</option>
        </select>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={downloadCSV} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl px-3 py-2 text-sm hover:bg-gray-200 transition-colors">
          <Download size={15} /> Export
        </button>
        <button onClick={load} className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['#', 'Student', 'Enrollment', 'Batch', 'Placement', 'Attendance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No students found</td></tr>
                ) : (
                  students.map((s, i) => {
                    const enrollment = s.studentProfile?.enrollments?.[0]
                    return (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20 dark:hover:bg-purple-900/10 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 20 + i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {s.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                              <p className="text-xs text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{s.studentProfile?.enrollmentNo || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {enrollment ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{enrollment.batch?.name}</p>
                              <p className="text-[10px] text-gray-400">{enrollment.batch?.course?.title}</p>
                            </div>
                          ) : <span className="text-gray-400 text-xs">Not enrolled</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[s.studentProfile?.placementStatus] || 'bg-gray-100 text-gray-500'}`}>
                            {s.studentProfile?.placementStatus?.replace('_', ' ') || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${s.attendancePct || 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{s.attendancePct || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleStatus(s.id, s.isActive)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.isActive ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${s.isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: s.isActive ? 'translateX(18px)' : 'translateX(2px)' }} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/admin/students/${s.id}`)}
                              className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors" title="View">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleResetPw(s.id)}
                              className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center transition-colors" title="Reset Password">
                              <Key size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 transition-colors">
              ← Prev
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-purple-50'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Add Student Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Add Student" subtitle="Create a new student account">
        <form onSubmit={handleCreate} className="space-y-4">
          {[
            { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Ravi Kumar' },
            { label: 'Email *', key: 'email', type: 'email', placeholder: 'ravi@example.com' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                required={key === 'name' || key === 'email'}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Password *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters"
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <button type="button" onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                className="px-3 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Assign to Batch</label>
            <select
              value={form.batchId}
              onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">No batch (assign later)</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 transition-all disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
