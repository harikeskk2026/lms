'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Pencil, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import studentService from '@/services/studentService'
import batchService from '@/services/batchService'
import collegeService from '@/services/collegeService'
import departmentService from '@/services/departmentService'
import courseService from '@/services/courseService'
import SlidePanel from '@/components/admin/SlidePanel'
import SearchableSelect from '@/components/admin/SearchableSelect'

const PLACEMENT_COLORS = {
  SEEKING:      'bg-blue-100 text-blue-700',
  INTERVIEWING: 'bg-yellow-100 text-yellow-700',
  PLACED:       'bg-green-100 text-green-700',
  NOT_SEEKING:  'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', password: '', batchId: '',
  collegeName: '', courseId: '', departmentName: '',
  academicScoreType: 'CGPA', academicScore: '', passedOutYear: '',
  address: '', qualification: '', linkedinUrl: '', githubUrl: '', placementStatus: 'SEEKING',
}

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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
  const [colleges, setColleges] = useState([])
  const [courses, setCourses] = useState([])
  const [departmentSuggestions, setDepartmentSuggestions] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
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
    // Course and Batch are independent of College/Department - every
    // CareerLabs course ever created shows up here; batches are filtered
    // down to the selected course below.
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    collegeService.list().then(r => setColleges(r.data || [])).catch(() => {})
  }, [])

  // College Name and Department are free-typed. As the admin types a college
  // name that matches one already on file, pull that college's departments in
  // as autocomplete suggestions for the Department box (still just a text
  // field - this only powers the suggestion list, nothing is forced).
  useEffect(() => {
    const typed = form.collegeName.trim().toLowerCase()
    const match = typed ? colleges.find(c => c.name.toLowerCase() === typed) : null
    if (!match) { setDepartmentSuggestions([]); return }
    let cancelled = false
    departmentService.list(match.id)
      .then(r => { if (!cancelled) setDepartmentSuggestions(r.data || []) })
      .catch(() => { if (!cancelled) setDepartmentSuggestions([]) })
    return () => { cancelled = true }
  }, [form.collegeName, colleges])

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const openCreate = () => {
    setEditStudent(null)
    setForm(EMPTY_FORM)
    setPanelOpen(true)
  }

  const openEdit = (student) => {
    setEditStudent(student)
    setForm({
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      password: '',
      batchId: student.batch?.id ? String(student.batch.id) : '',
      collegeName: student.college?.name || '',
      courseId: student.course?.id ? String(student.course.id) : '',
      departmentName: student.department?.name || '',
      academicScoreType: student.academicScoreType || 'CGPA',
      academicScore: student.academicScore != null ? String(student.academicScore) : '',
      passedOutYear: student.passedOutYear != null ? String(student.passedOutYear) : '',
      address: student.address || '',
      qualification: student.qualification || '',
      linkedinUrl: student.linkedinUrl || '',
      githubUrl: student.githubUrl || '',
      placementStatus: student.placementStatus || 'SEEKING',
    })
    setPanelOpen(true)
  }

  // Course changed - the batch list is scoped to the selected course, so any
  // previously chosen batch (which belonged to a different course) no longer
  // applies.
  const handleCourseChange = (courseId) => {
    setForm(f => ({ ...f, courseId, batchId: '' }))
  }

  // College Name / Department are plain typed text, not tied to an id while
  // typing. On submit, resolve each typed name to an existing record (case
  // insensitive match) or create a brand-new one on the fly, so the admin
  // never has to leave this form to add a college/department that isn't in
  // the system yet.
  const resolveCollegeId = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const match = colleges.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
    if (match) return match.id
    const r = await collegeService.create({ name: trimmed })
    setColleges(list => [...list, r.data])
    return r.data.id
  }

  const resolveDepartmentId = async (name, collegeId) => {
    const trimmed = name.trim()
    if (!trimmed || !collegeId) return null
    const existing = await departmentService.list(collegeId).then(r => r.data || []).catch(() => [])
    const match = existing.find(d => d.name.toLowerCase() === trimmed.toLowerCase())
    if (match) return match.id
    const r = await departmentService.create({ name: trimmed, collegeId })
    return r.data.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const batchId = form.batchId ? Number(form.batchId) : null
      const courseId = form.courseId ? Number(form.courseId) : null
      const collegeId = await resolveCollegeId(form.collegeName)
      const departmentId = await resolveDepartmentId(form.departmentName, collegeId)
      const academicScore = form.academicScore !== '' ? Number(form.academicScore) : null
      const academicScoreType = academicScore !== null ? form.academicScoreType : null
      const passedOutYear = form.passedOutYear !== '' ? Number(form.passedOutYear) : null
      if (editStudent) {
        await studentService.update(editStudent.id, {
          name: form.name,
          phone: form.phone,
          address: form.address,
          qualification: form.qualification,
          academicScoreType, academicScore, passedOutYear,
          linkedinUrl: form.linkedinUrl,
          githubUrl: form.githubUrl,
          placementStatus: form.placementStatus,
          batchId, collegeId, courseId, departmentId,
        })
        toast.success('Student updated successfully')
      } else {
        await studentService.create({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          academicScoreType, academicScore, passedOutYear,
          batchId, collegeId, courseId, departmentId,
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
      toast.success(`Student ${current ? 'deactivated' : 'activated'}`)
      load()
    } catch { toast.error('Failed to update status') }
  }

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Enrollment', 'College', 'Course', 'Department', 'Batch', 'Placement', 'Status']
    const rows = students.map(s => [
      s.name, s.email, s.phone || '',
      s.enrollmentNo || '',
      s.college?.name || '',
      s.course?.title || '',
      s.department?.name || '',
      s.batch?.name || '',
      s.placementStatus || '',
      s.active ? 'Active' : 'Inactive',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'students.csv'; a.click()
  }

  // Batches are scoped to whichever course is selected - a batch always
  // belongs to exactly one course, so showing every batch regardless of
  // course just invites mis-assignment.
  const batchesForCourse = form.courseId
    ? batches.filter(b => String(b.course?.id) === String(form.courseId))
    : []
  const batchOptions = toOptions(batchesForCourse, b => b.name)
  const courseOptions = toOptions(courses, c => c.title)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Students</h1>
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">{total}</span>
        </div>
        <button
          onClick={openCreate}
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
                  {['#', 'Student', 'Enrollment', 'College / Course', 'Department', 'Batch', 'Placement', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No students found</td></tr>
                ) : (
                  students.map((s, i) => (
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
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{s.enrollmentNo || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {s.college || s.course ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.college?.name || '—'}</p>
                            <p className="text-[10px] text-gray-400">{s.course?.title || ''}</p>
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-300">{s.department?.name || '—'}</span>
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
                          onClick={() => handleToggleStatus(s.id, s.active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.active ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform`} style={{ transform: s.active ? 'translateX(18px)' : 'translateX(2px)' }} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => router.push(`/admin/students/${s.id}`)}
                            className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(s)}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit">
                            <Pencil size={14} />
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="ravi@example.com"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210"
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
          )}

          {/*
            Two independent groups:
            1. College -> Department: the student's own college background.
               Both are plain typed text fields (with autocomplete via a
               native datalist) - the value is resolved to an existing or
               newly-created record on submit.
            2. Course + Batch: what CareerLabs is training this student on.
               Course lists every course ever created; Batch is filtered down
               to batches that belong to the selected course.
          */}
          <div className="pt-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student&apos;s College Background</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">College Name</label>
                <input
                  type="text"
                  list="college-name-options"
                  value={form.collegeName}
                  onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))}
                  placeholder="Type the student's college name"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <datalist id="college-name-options">
                  {colleges.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input
                  type="text"
                  list="department-name-options"
                  value={form.departmentName}
                  onChange={e => setForm(f => ({ ...f, departmentName: e.target.value }))}
                  placeholder="Type the student's department"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <datalist id="department-name-options">
                  {departmentSuggestions.map(d => <option key={d.id} value={d.name} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Academic Score</label>
                <div className="flex gap-2">
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5 flex-shrink-0">
                    {['CGPA', 'PERCENTAGE'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, academicScoreType: type }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          form.academicScoreType === type ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {type === 'CGPA' ? 'CGPA' : 'Percentage'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={form.academicScoreType === 'CGPA' ? 10 : 100}
                    value={form.academicScore}
                    onChange={e => setForm(f => ({ ...f, academicScore: e.target.value }))}
                    placeholder={form.academicScoreType === 'CGPA' ? 'e.g. 8.5' : 'e.g. 82.5'}
                    className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Passed Out Year</label>
                <input
                  type="number"
                  step="1"
                  min="1950"
                  max="2100"
                  value={form.passedOutYear}
                  onChange={e => setForm(f => ({ ...f, passedOutYear: e.target.value }))}
                  placeholder="e.g. 2024"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CareerLabs Enrollment</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course</label>
                <SearchableSelect
                  options={courseOptions}
                  value={form.courseId}
                  onChange={handleCourseChange}
                  placeholder="Select course"
                  searchPlaceholder="Search course..."
                  emptyLabel="No courses created yet"
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
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Qualification</label>
                <input
                  type="text"
                  value={form.qualification}
                  onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                  <input
                    type="text"
                    value={form.linkedinUrl}
                    onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={form.githubUrl}
                    onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
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
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 transition-all disabled:opacity-60">
              {saving ? 'Saving...' : editStudent ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
