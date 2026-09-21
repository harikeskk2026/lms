'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, FileDown, FileUp, RefreshCw, Loader2, KeyRound, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import studentService from '@/services/studentService'
import batchService from '@/services/batchService'
import courseService from '@/services/courseService'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'
import {
  isValidPhone,
  PHONE_ERROR_MESSAGE,
  isValidPassword,
  PASSWORD_ERROR_MESSAGE,
  isValidEmail,
  EMAIL_ERROR_MESSAGE,
  isValidName,
  NAME_ERROR_MESSAGE,
  filterNameKey,
  filterPhoneKey,
  sanitizePhone,
} from '@/utilities/validators'
import LoginAccessToggle from '@/components/admin/LoginAccessToggle'
import SlidePanel from '@/components/admin/SlidePanel'
import SearchableSelect from '@/components/admin/SearchableSelect'
import BulkImportModal from '@/components/admin/BulkImportModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import Pagination from '@/components/ui/Pagination'
import ViewToggle from '@/components/ui/ViewToggle'

const PLACEMENT_COLORS = {
  SEEKING:      'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  INTERVIEWING: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  PLACED:       'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  NOT_SEEKING:  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
}

const EMPTY_COURSE_GROUP = { courseId: '', batchId: '' }

const EMPTY_FORM = {
  name: '', email: '', phone: '', collegeName: '', password: '',
  courseGroups: [{ ...EMPTY_COURSE_GROUP }],
  placementStatus: 'SEEKING',
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

// Mirrors the backend's ScheduleOverlapUtil exactly (see
// api/.../common/util/ScheduleOverlapUtil.java) so the form can warn about a
// conflict before the user ever submits - the backend remains authoritative.
const TIME_12H_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
const TIME_24H_PATTERN = /^(\d{1,2})(?::(\d{2}))?$/

function parseTimeToMinutes(raw) {
  if (!raw) return null
  const s = raw.trim()
  const m12 = s.match(TIME_12H_PATTERN)
  if (m12) {
    let hour = parseInt(m12[1], 10)
    const minute = m12[2] ? parseInt(m12[2], 10) : 0
    const ampm = m12[3].toUpperCase()
    if (hour === 12) hour = ampm === 'AM' ? 0 : 12
    else if (ampm === 'PM') hour += 12
    return hour * 60 + minute
  }
  const m24 = s.match(TIME_24H_PATTERN)
  if (m24) {
    const hour = parseInt(m24[1], 10)
    const minute = m24[2] ? parseInt(m24[2], 10) : 0
    return hour * 60 + minute
  }
  return null
}

function parseTimingRange(timing) {
  if (!timing) return null
  const normalized = timing.replace(/[–—]/g, '-')
  const parts = normalized.split('-')
  if (parts.length !== 2) return null
  const start = parseTimeToMinutes(parts[0])
  const end = parseTimeToMinutes(parts[1])
  if (start == null || end == null || start >= end) return null
  return { start, end }
}

function isDateOverlap(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) return true
  return start1 <= end2 && end1 >= start2
}

function isTimeOverlap(timing1, timing2) {
  if (!timing1?.trim() || !timing2?.trim()) return true
  if (timing1.trim().toLowerCase() === timing2.trim().toLowerCase()) return true
  const r1 = parseTimingRange(timing1)
  const r2 = parseTimingRange(timing2)
  if (!r1 || !r2) return timing1.trim().toLowerCase() === timing2.trim().toLowerCase()
  return r1.start < r2.end && r1.end > r2.start
}

function isScheduleOverlap(batchA, batchB) {
  return isDateOverlap(batchA.startDate, batchA.endDate, batchB.startDate, batchB.endDate)
    && isTimeOverlap(batchA.timing, batchB.timing)
}

/** Pairwise-checks every group's selected batch against every other selected batch. */
function computeScheduleConflicts(groups, batches) {
  const conflicts = {}
  const selected = groups
    .map((g, idx) => ({ idx, batch: g.batchId ? batches.find(b => String(b.id) === String(g.batchId)) : null }))
    .filter(x => x.batch)

  for (let i = 0; i < selected.length; i++) {
    for (let j = 0; j < i; j++) {
      if (isScheduleOverlap(selected[i].batch, selected[j].batch)) {
        const a = selected[i], b = selected[j]
        conflicts[a.idx] = `Overlaps with ${b.batch.course?.title || 'another selected'} batch "${b.batch.name}" (${b.batch.timing || 'full day'}).`
        if (!conflicts[b.idx]) {
          conflicts[b.idx] = `Overlaps with ${a.batch.course?.title || 'another selected'} batch "${a.batch.name}" (${a.batch.timing || 'full day'}).`
        }
      }
    }
  }
  return conflicts
}

/**
 * Repeating "Course -> Batch" group editor for student enrollment. Unlike
 * the trainer assignment groups, batch is single-select here: Enrollment has
 * a unique (student, course) row with one nullable batch column, so a
 * student can only be in one batch per course (but many courses at once).
 */
function CourseBatchGroups({ groups, onChange, courseOptions, batches, conflicts }) {
  const usedCourseIds = groups.map(g => g.courseId).filter(Boolean)

  const updateGroup = (idx, patch) => onChange(groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)))
  const addGroup = () => onChange([...groups, { ...EMPTY_COURSE_GROUP }])
  const removeGroup = (idx) => onChange(groups.length <= 1 ? [{ ...EMPTY_COURSE_GROUP }] : groups.filter((_, i) => i !== idx))

  const lastGroup = groups[groups.length - 1]
  const canAddMore = usedCourseIds.length < courseOptions.length && Boolean(lastGroup?.courseId)

  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CareerLabs Enrollment</p>
      <div className="space-y-2.5">
        {groups.map((group, idx) => {
          const availableCourseOptions = courseOptions.filter(
            c => c.value === group.courseId || !usedCourseIds.includes(c.value)
          )
          const batchOptionsForGroup = group.courseId
            ? toOptions(batches.filter(b => String(b.course?.id) === String(group.courseId)), b => b.name)
            : []
          const conflict = conflicts?.[idx]

          return (
            <div key={idx} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:items-start">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wide">Course *</label>
                  <SearchableSelect
                    options={availableCourseOptions}
                    value={group.courseId}
                    onChange={(val) => updateGroup(idx, { courseId: val, batchId: '' })}
                    placeholder="Select course"
                    searchPlaceholder="Search course..."
                    emptyLabel="No published courses available"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wide">Batch</label>
                  <SearchableSelect
                    options={batchOptionsForGroup}
                    value={group.batchId}
                    onChange={(val) => updateGroup(idx, { batchId: val })}
                    placeholder={group.courseId ? 'No batch (assign later)' : 'Select a course first'}
                    searchPlaceholder="Search batch..."
                    disabled={!group.courseId}
                    emptyLabel="No batches created for this course yet"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGroup(idx)}
                  className="mt-5 justify-self-end sm:justify-self-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Remove this course"
                >
                  ✕
                </button>
              </div>
              {conflict && (
                <p className="text-xs text-red-500 mt-1.5 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block flex-shrink-0" />
                  {conflict}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={addGroup}
        disabled={!canAddMore}
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={13} /> Add Another Course
      </button>
    </div>
  )
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
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
  const [viewMode, setViewMode] = useState('table')
  const [deletingStudent, setDeletingStudent] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const searchTimer = useRef(null)
  const loadAbortRef = useRef(null)

  const load = useCallback(() => {
    loadAbortRef.current?.abort()
    const controller = new AbortController()
    loadAbortRef.current = controller
    setLoading(true)
    studentService.list({
      search: search || undefined,
      batchId: batchFilter || undefined,
      status: statusFilter || undefined,
      placementStatus: placementFilter || undefined,
      page,
      limit: pageSize,
    }, { signal: controller.signal })
      .then(r => {
        const d = r.data
        setStudents(d.students)
        setTotal(d.total)
        setTotalPages(d.totalPages)
      })
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return
        toast.error(err.message || 'Failed to load students')
      })
      .finally(() => {
        if (loadAbortRef.current === controller) setLoading(false)
      })
  }, [search, batchFilter, statusFilter, placementFilter, page, pageSize])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  const handleSearch = (v) => {
    setSearchInput(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const [emailError, setEmailError] = useState('')
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const isNameValid = isValidName(form.name)
  const isPhoneValid = !form.phone || isValidPhone(form.phone)
  const isEmailValid = isValidEmail(form.email)
  const isPasswordValid = isValidPassword(form.password)

  const hasAnyCourse = form.courseGroups.some(g => g.courseId)
  const scheduleConflicts = computeScheduleConflicts(form.courseGroups, batches)
  const hasScheduleConflicts = Object.keys(scheduleConflicts).length > 0

  const isFormValid = isNameValid && isPhoneValid && hasAnyCourse && !hasScheduleConflicts && (editStudent ? true : (isEmailValid && isPasswordValid))

  const initialGroupsFromEditStudent = (student) => {
    const byCourse = new Map()
    for (const c of (student?.courses || [])) {
      byCourse.set(String(c.id), { courseId: String(c.id), batchId: '' })
    }
    for (const b of (student?.batches || [])) {
      const cid = b.course?.id != null ? String(b.course.id) : null
      if (!cid) continue
      if (byCourse.has(cid)) byCourse.get(cid).batchId = String(b.id)
      else byCourse.set(cid, { courseId: cid, batchId: String(b.id) })
    }
    const groups = Array.from(byCourse.values())
    return groups.length > 0 ? groups : [{ ...EMPTY_COURSE_GROUP }]
  }

  const isDirty = editStudent
    ? Boolean(
        form.name !== (editStudent.name || '') ||
        form.phone !== (editStudent.phone || '') ||
        form.collegeName !== (editStudent.college?.name || '') ||
        form.placementStatus !== (editStudent.placementStatus || 'SEEKING') ||
        JSON.stringify(form.courseGroups) !== JSON.stringify(initialGroupsFromEditStudent(editStudent))
      )
    : Boolean(form.name || form.email || form.phone || form.collegeName || form.password || hasAnyCourse)

  const openCreate = () => {
    setEditStudent(null)
    setForm(EMPTY_FORM)
    setEmailError('')
    setTouched({})
    setSubmitted(false)
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
      courseGroups: initialGroupsFromEditStudent(student),
      placementStatus: student.placementStatus || 'SEEKING',
    })
    setEmailError('')
    setTouched({})
    setSubmitted(false)
    setPanelOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setEmailError('')
    if (!isFormValid) {
      if (!isNameValid) toast.error(NAME_ERROR_MESSAGE)
      else if (!hasAnyCourse) toast.error('Please select at least one course')
      else if (hasScheduleConflicts) toast.error('Resolve the schedule conflicts before saving')
      else if (!editStudent && !isEmailValid) toast.error(EMAIL_ERROR_MESSAGE)
      else if (!isPhoneValid) toast.error(PHONE_ERROR_MESSAGE)
      else if (!editStudent && !isPasswordValid) toast.error(PASSWORD_ERROR_MESSAGE)
      return
    }
    setSaving(true)
    try {
      const courseBatchAssignments = form.courseGroups
        .filter(g => g.courseId)
        .map(g => ({ courseId: Number(g.courseId), batchId: g.batchId ? Number(g.batchId) : null }))
      if (editStudent) {
        await studentService.update(editStudent.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          collegeName: form.collegeName.trim() || null,
          placementStatus: form.placementStatus,
          courseBatchAssignments,
        })
        toast.success('Student updated successfully')
      } else {
        await studentService.create({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          collegeName: form.collegeName.trim() || null,
          password: form.password,
          courseBatchAssignments,
        })
        toast.success('Student created successfully')
      }
      setPanelOpen(false)
      setForm(EMPTY_FORM)
      setEditStudent(null)
      setTouched({})
      setSubmitted(false)
      load()
    } catch (err) {
      toast.error(err.message || `Failed to ${editStudent ? 'update' : 'create'} student`)
    } finally { setSaving(false) }
  }

  const handleToggleStatus = async (student) => {
    try {
      await studentService.toggleStatus(student.id)
      toast.success(`Login access ${student.active ? 'blocked' : 'allowed'} for ${student.name}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update login access')
    }
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
        (s.courses && s.courses.length > 0) ? s.courses.map(c => c.title).join('; ') : '',
        (s.batches && s.batches.length > 0) ? s.batches.map(b => b.name).join('; ') : '',
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

  // Only published courses should be available for student enrollment.
  // In edit mode, preserve any currently assigned course even if it's no
  // longer published, so existing enrollments remain visible/selectable.
  const selectedCourseIds = form.courseGroups.map(g => g.courseId).filter(Boolean)
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED' || (editStudent && selectedCourseIds.includes(String(c.id))))
  const courseOptions = toOptions(publishedCourses, c => c.title + (c.status && c.status !== 'PUBLISHED' ? ` (${c.status})` : ''))

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border border-purple-100 dark:border-purple-900/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              <Users size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Students Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage student profiles, course enrollments, batches, and placement status.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-purple-500/20 active:scale-95"
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-purple-400 flex-shrink-0" />
          <input
            value={searchInput}
            placeholder="Search by name or email..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <CustomSelect
          value={batchFilter}
          onChange={(val) => { setBatchFilter(val); setPage(1) }}
          options={batches.map(b => ({ value: b.id, label: b.name }))}
          placeholder="All Batches"
          searchable={batches.length >= 10}
          compact
        />
        <CustomSelect
          value={placementFilter}
          onChange={(val) => { setPlacementFilter(val); setPage(1) }}
          options={[
            { value: 'SEEKING', label: 'Seeking' },
            { value: 'INTERVIEWING', label: 'Interviewing' },
            { value: 'PLACED', label: 'Placed' },
            { value: 'NOT_SEEKING', label: 'Not Seeking' },
          ]}
          placeholder="All Placement"
          compact
        />
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
        <ViewToggle value={viewMode} onChange={setViewMode} />
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
        ) : viewMode === 'card' ? (
          students.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-400">No students found</div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(s => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/admin/students/${s.id}`)}
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 flex flex-col gap-3 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/50 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-white truncate">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <LoginAccessToggle active={s.active} name={s.name} onToggle={() => handleToggleStatus(s)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400 uppercase text-[10px] font-semibold mb-0.5">Enrollment</p>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded inline-block">{s.enrollmentNo || '—'}</span>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase text-[10px] font-semibold mb-0.5">College</p>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate block">{s.college?.name || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 uppercase text-[10px] font-semibold mb-0.5">Course</p>
                      <span className="text-gray-500 truncate block">
                        {(s.courses && s.courses.length > 0) ? s.courses.map(c => c.title).join(', ') : '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 uppercase text-[10px] font-semibold mb-1">Batch</p>
                      {s.batches && s.batches.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {s.batches.map(b => (
                            <div key={b.id}>
                              <p className="font-semibold text-gray-700 dark:text-gray-300">{b.name}</p>
                              <p className="text-[10px] text-gray-400">{b.course?.title}</p>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-gray-400">Not enrolled</span>}
                    </div>
                  </div>

                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[s.placementStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {s.placementStatus?.replace('_', ' ') || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2 mt-auto border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setResetTarget(s)}
                      className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors" title="Reset Password">
                      <KeyRound size={14} />
                    </button>
                    <button onClick={() => openEdit(s)}
                      className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeletingStudent(s)}
                      className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
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
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:shadow-sm transition-shadow">
                            {s.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white group-hover:text-purple-600 transition-colors">{s.name}</p>
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
                        <p className="text-xs text-gray-500">
                          {(s.courses && s.courses.length > 0) ? s.courses.map(c => c.title).join(', ') : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {s.batches && s.batches.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {s.batches.map(b => (
                              <div key={b.id}>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b.name}</p>
                                <p className="text-[10px] text-gray-400">{b.course?.title}</p>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-gray-400 text-xs">Not enrolled</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[s.placementStatus] || 'bg-gray-100 text-gray-500'}`}>
                          {s.placementStatus?.replace('_', ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <LoginAccessToggle active={s.active} name={s.name} onToggle={() => handleToggleStatus(s)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setResetTarget(s); }}
                            className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors" title="Reset Password">
                            <KeyRound size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                            className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeletingStudent(s); }}
                            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition-colors" title="Delete">
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

        <Pagination
          total={total}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
          label="students"
        />
      </div>

      {/* Add / Edit Student Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editStudent ? 'Edit Student' : 'Add Student'}
        subtitle={editStudent ? 'Update student profile' : 'Create a new student account'}
        isDirty={isDirty}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onKeyDown={filterNameKey}
              onBlur={() => setTouched(t => ({ ...t, name: true }))}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Enter full name"
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                (touched.name || submitted) && !isNameValid
                  ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
              }`}
              required
            />
            {(touched.name || submitted) && !isNameValid && (
              <p className="text-xs text-red-500 mt-1.5 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {!form.name.trim() ? 'Full Name is required' : NAME_ERROR_MESSAGE}
              </p>
            )}
          </div>

          {!editStudent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({ ...f, email: val }))
                  if (emailError && isValidEmail(val.trim())) setEmailError('')
                }}
                placeholder="Enter email address"
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                  (touched.email || submitted) && !isEmailValid
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
                required
              />
              {(touched.email || submitted) && !isEmailValid && (
                <p className="text-xs text-red-500 mt-1.5 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {!form.email.trim() ? 'Email is required' : EMAIL_ERROR_MESSAGE}
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
              onKeyDown={filterPhoneKey}
              onBlur={() => setTouched(t => ({ ...t, phone: true }))}
              onChange={e => setForm(f => ({ ...f, phone: sanitizePhone(e.target.value) }))}
              placeholder="Enter phone number"
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                (touched.phone || submitted) && !isPhoneValid
                  ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
              }`}
            />
            {(touched.phone || submitted) && !isPhoneValid && (
              <p className="text-xs text-red-500 mt-1.5 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {PHONE_ERROR_MESSAGE}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">College Name</label>
            <input
              type="text"
              value={form.collegeName}
              onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))}
              placeholder="Enter college name"
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
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter password"
                  className={`flex-1 rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                    (touched.password || submitted) && !isPasswordValid
                      ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                  }`}
                  required
                />
                <button type="button" onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors whitespace-nowrap">
                  Generate
                </button>
              </div>
              {(touched.password || submitted) && !isPasswordValid && (
                <p className="text-xs text-red-500 mt-1.5 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {!form.password ? 'Password is required' : PASSWORD_ERROR_MESSAGE}
                </p>
              )}
              {form.password && <PasswordStrengthMeter password={form.password} />}
            </div>
          )}

          {/*
            Course + Batch: what CareerLabs is training this student on. A
            student can enroll in multiple courses, but only one batch per
            course - see CourseBatchGroups.
          */}
          <div className="pt-1">
            <CourseBatchGroups
              groups={form.courseGroups}
              onChange={(groups) => setForm(f => ({ ...f, courseGroups: groups }))}
              courseOptions={courseOptions}
              batches={batches}
              conflicts={scheduleConflicts}
            />
            {submitted && !hasAnyCourse && (
              <p className="text-xs text-red-500 mt-1.5 font-semibold">Please select at least one course</p>
            )}
          </div>

          {editStudent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placement Status</label>
              <CustomSelect
                value={form.placementStatus}
                onChange={(val) => setForm(f => ({ ...f, placementStatus: val }))}
                options={[
                  { value: 'SEEKING', label: 'Seeking' },
                  { value: 'INTERVIEWING', label: 'Interviewing' },
                  { value: 'PLACED', label: 'Placed' },
                  { value: 'NOT_SEEKING', label: 'Not Seeking' },
                ]}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !isFormValid}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
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

      <ResetPasswordModal open={!!resetTarget} user={resetTarget ? { id: resetTarget.id, name: resetTarget.name, email: resetTarget.email, role: 'STUDENT', active: resetTarget.active } : null} onClose={() => setResetTarget(null)} onSuccess={load} />
    </div>
  )
}
