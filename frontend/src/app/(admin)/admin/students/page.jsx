'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, FileDown, FileUp, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import studentService from '@/services/studentService'
import batchService from '@/services/batchService'
import courseService from '@/services/courseService'
import { isValidPhone, PHONE_ERROR_MESSAGE, isValidPassword, PASSWORD_ERROR_MESSAGE, isValidEmail, EMAIL_ERROR_MESSAGE } from '@/utilities/validators'
import SlidePanel from '@/components/admin/SlidePanel'
import SearchableSelect from '@/components/admin/SearchableSelect'
import BulkImportModal from '@/components/admin/BulkImportModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

const PLACEMENT_COLORS = {
  SEEKING:      'bg-blue-100 text-blue-700',
  INTERVIEWING: 'bg-yellow-100 text-yellow-700',
  PLACED:       'bg-green-100 text-green-700',
  NOT_SEEKING:  'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', collegeName: '', password: '', batchId: '',
  courseId: '', placementStatus: 'SEEKING',
}

// Guarantees at least one uppercase, one lowercase, one digit, and one
// special character (not just "likely" via a shared pool), so the generated
// password always satisfies the password-strength validation below.
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

  // Shuffle so the guaranteed characters aren't always in the same positions.
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined.join('')
}

const toOptions = (list, labelFn) => list.map(item => ({ value: String(item.id), label: labelFn(item) }))

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
  const [courses, setCourses] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const searchTimer = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    studentService.list({
      search: search || undefined,
      batchId: batchFilter || undefined,
      status: statusFilter || undefined,
      placementStatus: placementFilter || undefined,
      page,
      limit: 20,
    })
      .then(r => {
        const d = r.data
        setStudents(d.students)
        setTotal(d.total)
        setTotalPages(d.totalPages)
      })
      .catch(err => toast.error(err.message || 'Failed to load students'))
      .finally(() => setLoading(false))
  }, [search, batchFilter, statusFilter, placementFilter, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const [emailError, setEmailError] = useState('')

  const openCreate = () => {
    setEditStudent(null)
    setForm(EMPTY_FORM)
    setEmailError('')
    setPanelOpen(true)
  }

  const openEdit = (student) => {
    setEditStudent(student)
    setForm({
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      collegeName: student.college?.name || '',
      password: '',
      batchId: student.batch?.id ? String(student.batch.id) : '',
      courseId: student.course?.id ? String(student.course.id) : student.batch?.course?.id ? String(student.batch.course.id) : '',
      placementStatus: student.placementStatus || 'SEEKING',
    })
    setEmailError('')
    setPanelOpen(true)
  }

  // Course changed - the batch list is scoped to the selected course, so any
  // previously chosen batch (which belonged to a different course) no longer
  // applies.
  const handleCourseChange = (courseId) => {
    setForm(f => ({ ...f, courseId, batchId: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEmailError('')
    if (!form.courseId) {
      toast.error('Please select a course')
      return
    }
    if (!editStudent) {
      if (!form.email || !form.email.trim()) {
        const msg = 'Email is required'
        setEmailError(msg)
        toast.error(msg)
        return
      }
      if (!isValidEmail(form.email.trim())) {
        setEmailError(EMAIL_ERROR_MESSAGE)
        toast.error(EMAIL_ERROR_MESSAGE)
        return
      }
    }
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error(PHONE_ERROR_MESSAGE)
      return
    }
    if (!editStudent && !isValidPassword(form.password)) {
      toast.error(PASSWORD_ERROR_MESSAGE)
      return
    }
    setSaving(true)
    try {
      const batchId = form.batchId ? Number(form.batchId) : null
      const courseId = form.courseId ? Number(form.courseId) : null
      if (editStudent) {
        await studentService.update(editStudent.id, {
          name: form.name,
          phone: form.phone,
          collegeName: form.collegeName,
          placementStatus: form.placementStatus,
          batchId, courseId,
        })
        toast.success('Student updated successfully')
      } else {
        await studentService.create({
          name: form.name,
          email: form.email,
          phone: form.phone,
          collegeName: form.collegeName,
          password: form.password,
          batchId, courseId,
        })
        toast.success('Student created successfully')
      }
      setPanelOpen(false)
      setForm(EMPTY_FORM)
      setEditStudent(null)
      load()
    } catch (err) {
      toast.error(err.message || `Failed to ${editStudent ? 'update' : 'create'} student`)
    } finally { setSaving(false) }
  }

  const handleToggleStatus = async (id, current) => {
    try {
      await studentService.toggleStatus(id)
      toast.success(`Login access ${current ? 'disabled' : 'enabled'}`)
      load()
    } catch { toast.error('Failed to update login access') }
  }

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return
    setIsDeleting(true)
    try {
      await studentService.remove(deletingStudent.id)
      toast.success('Student deleted')
      setDeletingStudent(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete student')
    } finally {
      setIsDeleting(false)
    }
  }

  const downloadCSV = async () => {
    try {
      setExporting(true)
      const exportLimit = Math.max(total || 0, 10000)
      const res = await studentService.list({
        search: search || undefined,
        batchId: batchFilter || undefined,
        status: statusFilter || undefined,
        placementStatus: placementFilter || undefined,
        page: 1,
        limit: exportLimit,
      })
      const allStudents = res.data?.students || []
      if (allStudents.length === 0) {
        toast.error('No students found to export')
        return
      }

      const headers = ['Name', 'Email', 'Phone', 'Enrollment', 'College', 'Course', 'Batch', 'Placement', 'Login Access']
      const rows = allStudents.map(s => [
        s.name || '',
        s.email || '',
        s.phone || '',
        s.enrollmentNo || '',
        s.college?.name || '',
        s.course?.title || '',
        s.batch?.name || '',
        s.placementStatus || '',
        s.active ? 'Active' : 'Inactive',
      ])

      const csvContent = '\uFEFF' + [headers, ...rows]
        .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported all ${allStudents.length} student records`)
    } catch (err) {
      toast.error('Failed to export students: ' + (err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // Batches are scoped to whichever course is selected - a batch always
  // belongs to exactly one course, so showing every batch regardless of
  // course just invites mis-assignment.
  const batchesForCourse = form.courseId
    ? batches.filter(b => String(b.course?.id) === String(form.courseId))
    : []
  const batchOptions = toOptions(batchesForCourse, b => b.name)
  // Only published courses should be available for student enrollment.
  // In edit mode, preserve the currently assigned course if it happens to be non-published so existing data remains visible.
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED' || (editStudent && String(c.id) === String(form.courseId)))
  const courseOptions = toOptions(publishedCourses, c => c.title + (c.status && c.status !== 'PUBLISHED' ? ` (${c.status})` : ''))

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Students</h1>
          <span className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="text-purple-400 font-medium">Total</span>
            <span className="text-purple-700 dark:text-purple-200">{total}</span>
          </span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all"
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
          <option value="">All Login Access</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl px-3 py-2 text-sm font-semibold transition-colors border border-purple-200 dark:border-purple-800/40"
        >
          <FileUp size={15} /> Import
        </button>
        <button
          onClick={downloadCSV}
          disabled={exporting}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          {exporting ? 'Exporting...' : 'Export'}
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
                  {['SNO', 'Student', 'Enrollment', 'College', 'Course', 'Batch', 'Placement', 'Login Access', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No students found</td></tr>
                ) : (
                  students.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/admin/students/${s.id}`)}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
                    >
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
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{s.enrollmentNo || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.college?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">{s.course?.title || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.batch ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.batch.name}</p>
                            <p className="text-[10px] text-gray-400">{s.batch.course?.title}</p>
                          </div>
                        ) : <span className="text-gray-400 text-xs">Not enrolled</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[s.placementStatus] || 'bg-gray-100 text-gray-500'}`}>
                          {s.placementStatus?.replace('_', ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(s.id, s.active); }}
                          title={s.active ? 'Click to disable login access' : 'Click to enable login access'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.active ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform`} style={{ transform: s.active ? 'translateX(18px)' : 'translateX(2px)' }} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeletingStudent(s); }}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

      {/* Add / Edit Student Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editStudent ? 'Edit Student' : 'Add Student'}
        subtitle={editStudent ? 'Update student profile' : 'Create a new student account'}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ravi Kumar"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          {!editStudent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({ ...f, email: val }))
                  if (emailError && isValidEmail(val.trim())) setEmailError('')
                }}
                placeholder="ravi@example.com"
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                  emailError
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
                required
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1.5 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {emailError}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="9876543210"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">College Name</label>
            <input
              type="text"
              value={form.collegeName}
              onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))}
              placeholder="e.g. Anna University"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {!editStudent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Password *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 chars, upper+lower+number+symbol"
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button type="button" onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                  className="px-3 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors whitespace-nowrap">
                  Generate
                </button>
              </div>
            </div>
          )}

          {/*
            Course + Batch: what CareerLabs is training this student on.
            Course lists every course ever created; Batch is filtered down
            to batches that belong to the selected course. (College
            background, and the student's own personal-info fields, are now
            managed entirely by the student via My Profile - see
            docs/LMS_MODULE_WORKFLOWS.md.)
          */}
          <div className="pt-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CareerLabs Enrollment</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course *</label>
                <SearchableSelect
                  options={courseOptions}
                  value={form.courseId}
                  onChange={handleCourseChange}
                  placeholder="Select course"
                  searchPlaceholder="Search course..."
                  emptyLabel="No published courses available"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Assign to Batch</label>
                <SearchableSelect
                  options={batchOptions}
                  value={form.batchId}
                  onChange={(v) => setForm(f => ({ ...f, batchId: v }))}
                  placeholder={form.courseId ? 'No batch (assign later)' : 'Select a course first'}
                  searchPlaceholder="Search batch..."
                  disabled={!form.courseId}
                  emptyLabel="No batches created for this course yet"
                />
              </div>
            </div>
          </div>

          {editStudent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placement Status</label>
              <select
                value={form.placementStatus}
                onChange={e => setForm(f => ({ ...f, placementStatus: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="SEEKING">Seeking</option>
                <option value="INTERVIEWING">Interviewing</option>
                <option value="PLACED">Placed</option>
                <option value="NOT_SEEKING">Not Seeking</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60">
              {saving ? 'Saving...' : editStudent ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Bulk Import Students Modal */}
      {importModalOpen && (
        <BulkImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          courses={courses}
          batches={batches}
          onSuccess={load}
        />
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Student Account?"
        itemName={deletingStudent?.name}
        message={
          deletingStudent ? (
            <>
              Permanently delete <strong className="text-slate-800 dark:text-gray-200 font-semibold">{deletingStudent.name}</strong>?
              This removes their account and all associated data (attendance, submissions, quiz attempts, placement activity) and cannot be undone.
            </>
          ) : undefined
        }
        loading={isDeleting}
      />
    </div>
  )
}
