'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Trash2, Plus, CheckSquare, ChevronLeft, ChevronRight, UserCheck, Pencil, Search } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/lib/api'
import studentService from '@/services/studentService'
import reportService from '@/services/reportService'
import courseService from '@/services/courseService'
import SlidePanel from '@/components/admin/SlidePanel'
import DateTimePicker12h from '@/components/ui/DateTimePicker12h'
import { validateBatchDates, calculateMaxEndDate } from '@/utils/courseDuration'

const TABS = ['Overview', 'Students', 'Schedule', 'Attendance', 'Assignments']

const PLACEMENT_COLORS = {
  SEEKING: 'bg-blue-100 text-blue-700',
  INTERVIEWING: 'bg-yellow-100 text-yellow-700',
  PLACED: 'bg-green-100 text-green-700',
  NOT_SEEKING: 'bg-gray-100 text-gray-500',
}

export default function BatchDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [batch, setBatch] = useState(null)
  const [classes, setClasses] = useState([])
  const [roster, setRoster] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [scheduleView, setScheduleView] = useState('list')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [classPanel, setClassPanel] = useState(false)
  const [attPanel, setAttPanel] = useState(false)
  const [attClass, setAttClass] = useState(null)
  const [attSheet, setAttSheet] = useState(null)
  const [attStatuses, setAttStatuses] = useState({})
  const [saving, setSaving] = useState(false)
  const [classForm, setClassForm] = useState({ title: '', date: '', notes: '', meetLink: '' })
  const [addStudentPanel, setAddStudentPanel] = useState(false)
  const [addStudentQuery, setAddStudentQuery] = useState('')
  const [addStudentResults, setAddStudentResults] = useState([])
  const [addStudentSearching, setAddStudentSearching] = useState(false)
  const [editPanel, setEditPanel] = useState(false)
  const [courses, setCourses] = useState([])
  const [editForm, setEditForm] = useState({ name: '', courseId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30 })
  const [hasSearched, setHasSearched] = useState(false)
  const [studentRosterQuery, setStudentRosterQuery] = useState('')

  const filteredRoster = roster.filter(s => {
    if (!studentRosterQuery.trim()) return true
    const q = studentRosterQuery.toLowerCase().trim()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.enrollmentNo?.toLowerCase().includes(q)
    )
  })

  const handleAssignTrainer = async (newTrainerId) => {
    const errMsg = validateBatchDates(batch.startDate, batch.endDate, batch.course?.duration)
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    try {
      await adminApi.updateBatch(id, {
        name: batch.name,
        courseId: batch.course?.id,
        trainerId: newTrainerId ? Number(newTrainerId) : null,
        startDate: batch.startDate,
        endDate: batch.endDate,
        timing: batch.timing,
        mode: batch.mode,
        maxStudents: batch.maxStudents,
      })
      toast.success(newTrainerId ? 'Trainer assigned to batch' : 'Trainer unassigned from batch')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update trainer')
    }
  }

  const openEditPanel = () => {
    if (!batch) return
    setEditForm({
      name: batch.name || '',
      courseId: batch.course?.id ? String(batch.course.id) : '',
      startDate: batch.startDate ? batch.startDate.substring(0, 10) : '',
      endDate: batch.endDate ? batch.endDate.substring(0, 10) : '',
      timing: batch.timing || '',
      mode: batch.mode || 'ONLINE',
      maxStudents: batch.maxStudents || 30,
    })
    setEditPanel(true)
  }

  const handleUpdateBatch = async (e) => {
    e.preventDefault()
    const selectedCourse = courses.find(c => String(c.id) === String(editForm.courseId)) || batch.course
    const duration = selectedCourse?.duration
    const validationError = validateBatchDates(editForm.startDate, editForm.endDate, duration)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      await adminApi.updateBatch(id, {
        name: editForm.name,
        courseId: Number(editForm.courseId),
        trainerId: batch.trainerId || batch.trainer?.id || null,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        timing: editForm.timing,
        mode: editForm.mode,
        maxStudents: Number(editForm.maxStudents),
      })
      toast.success('Batch updated')
      setEditPanel(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update batch')
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const batchRes = await adminApi.getBatchDetail(id)
      setBatch(batchRes.data.data)

      const [classesRes, studentsRes, perfRes] = await Promise.allSettled([
        adminApi.getClasses({ batchId: id }),
        studentService.list({ batchId: id, limit: 500 }),
        reportService.getPerformance({ batchId: id }),
      ])

      if (classesRes.status === 'fulfilled') {
        setClasses(classesRes.value.data?.data || [])
      }
      const students = studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.students || []) : []
      const perfById = perfRes.status === 'fulfilled' ? Object.fromEntries((perfRes.value.data?.students || []).map(p => [p.studentId, p])) : {}

      setRoster(students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        enrollmentNo: s.enrollmentNo,
        placementStatus: s.placementStatus,
        attendancePct: perfById[s.id]?.attendancePct,
        avgQuizScore: perfById[s.id]?.avgQuizScore,
      })))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load batch')
      if (err.response?.status === 403) {
        router.replace('/admin/batches')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
      adminApi.getTrainers({ limit: 100, status: 'active' })
        .then(r => setTrainers(r.data?.data?.trainers || []))
        .catch(() => {})
      courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    }
  }, [id, user?.role])

  const searchStudentsToAdd = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    setAddStudentSearching(true)
    try {
      const searchStr = addStudentQuery?.trim()
      const r = await studentService.list({ search: searchStr || undefined, limit: 100 })
      const rosterIds = new Set(roster.map(s => s.id))
      const rawStudents = r.data?.students || r.students || (Array.isArray(r.data) ? r.data : [])
      setAddStudentResults(rawStudents.filter(s => !rosterIds.has(s.id)))
      setHasSearched(true)
    } catch {
      toast.error('Search failed')
    } finally {
      setAddStudentSearching(false)
    }
  }

  useEffect(() => {
    if (addStudentPanel) {
      setAddStudentQuery('')
      setHasSearched(false)
      setAddStudentSearching(true)
      studentService.list({ limit: 50 })
        .then(r => {
          const rosterIds = new Set(roster.map(s => s.id))
          const rawStudents = r.data?.students || r.students || (Array.isArray(r.data) ? r.data : [])
          setAddStudentResults(rawStudents.filter(s => !rosterIds.has(s.id)))
        })
        .catch(() => {})
        .finally(() => setAddStudentSearching(false))
    }
  }, [addStudentPanel, roster])

  const handleAddStudent = async (studentId) => {
    try {
      await adminApi.enrollStudent(id, studentId)
      toast.success('Student added to batch')
      setAddStudentResults(prev => prev.filter(s => s.id !== studentId))
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add student') }
  }

  const loadAttSheet = async (classId) => {
    setAttClass(classId)
    const r = await adminApi.getAttendanceSheet(classId)
    const students = r.data.data || []
    setAttSheet(students)
    const init = {}
    for (const s of students) init[s.studentId] = s.status
    setAttStatuses(init)
    setAttPanel(true)
  }

  const saveAttendance = async () => {
    setSaving(true)
    try {
      const records = Object.entries(attStatuses).map(([studentId, status]) => ({ studentId: parseInt(studentId), status }))
      await adminApi.markAttendance(attClass, records)
      toast.success('Attendance saved')
      setAttPanel(false)
      load()
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const handleToggleStatus = async () => {
    try {
      await adminApi.toggleBatchStatus(id)
      toast.success('Batch status updated')
      load()
    } catch { toast.error('Failed to update batch status') }
  }

  const handleRemoveStudent = async (studentUserId) => {
    if (!confirm('Remove this student from the batch?')) return
    try {
      await adminApi.removeFromBatch(id, studentUserId)
      toast.success('Student removed')
      load()
    } catch { toast.error('Failed to remove') }
  }

  const handleCreateClass = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.createClass({ ...classForm, batchId: id })
      toast.success('Class scheduled')
      setClassPanel(false)
      setClassForm({ title: '', date: '', notes: '', meetLink: '' })
      load()
    } catch { toast.error('Failed to schedule class') } finally { setSaving(false) }
  }

  const openScheduleForDay = (day) => {
    setClassForm(f => ({ ...f, date: format(day, "yyyy-MM-dd'T'HH:mm") }))
    setClassPanel(true)
  }

  if (loading) return <div className="max-w-5xl mx-auto"><div className="glass-card p-6 animate-pulse h-40" /></div>
  if (!batch) return <div className="text-center py-20 text-gray-400">Batch not found</div>

  const totalClasses = classes.length
  const completedClasses = classes.filter(c => c.status === 'COMPLETED').length
  const enrolled = roster.length
  const totalDays = Math.max(1, (new Date(batch.endDate) - new Date(batch.startDate)) / 86400000)
  const elapsedDays = Math.min(totalDays, Math.max(0, (Date.now() - new Date(batch.startDate)) / 86400000))
  const progressPct = Math.round((elapsedDays / totalDays) * 100)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">{batch.name}</h1>
          <p className="text-sm text-gray-500">{batch.course?.title} · {batch.mode}</p>
        </div>
        {isAdmin ? (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={openEditPanel}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
              <Pencil size={12} /> Edit Batch
            </button>
            <button onClick={handleToggleStatus}
              className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${batch.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {batch.isActive ? 'Active' : 'Ended'}
            </button>
          </div>
        ) : (
          <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${batch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {batch.isActive ? 'Active' : 'Ended'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Enrolled', value: enrolled, color: 'text-purple-600' },
              { label: 'Total Classes', value: totalClasses, color: 'text-blue-600' },
              { label: 'Completed', value: completedClasses, color: 'text-green-600' },
              { label: 'Max Students', value: batch.maxStudents, color: 'text-gray-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card p-5 text-center">
                <p className={`text-2xl font-extrabold font-display ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
              </div>
            ))}
          </div>
          {/* Assigned Trainer Card */}
          <div className="glass-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold">
                  <UserCheck size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Lead Trainer</p>
                  {batch.trainer ? (
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-base">{batch.trainer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{batch.trainer.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 font-medium italic">No trainer assigned to this batch yet</p>
                  )}
                </div>
              </div>

              {['SUPERADMIN', 'ADMIN'].includes(user?.role) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Assign:</span>
                  <select
                    value={trainers.some(t => t.id === (batch.trainer?.id || batch.trainerId)) ? (batch.trainer?.id || batch.trainerId) : ''}
                    onChange={e => handleAssignTrainer(e.target.value)}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">-- No Trainer Assigned --</option>
                    {trainers.filter(t => t.active !== false).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.designation ? ` · ${t.designation}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Batch Timeline</p>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>{format(new Date(batch.startDate), 'dd MMM yyyy')}</span>
              <span>Today</span>
              <span>{format(new Date(batch.endDate), 'dd MMM yyyy')}</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{progressPct}% elapsed</p>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {tab === 'Students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={studentRosterQuery}
                onChange={e => setStudentRosterQuery(e.target.value)}
                placeholder="Search enrolled students..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
              />
              {studentRosterQuery && (
                <button
                  onClick={() => setStudentRosterQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              )}
            </div>
            {isAdmin && (
              <div>
                {enrolled >= batch.maxStudents ? (
                  <span className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-50 text-orange-600">Batch full ({enrolled}/{batch.maxStudents})</span>
                ) : (
                  <button onClick={() => { setAddStudentPanel(true); setAddStudentQuery(''); setAddStudentResults([]) }}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20 active:scale-95">
                    <UserPlus size={14} /> Add Student
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-100 dark:border-gray-800 flex items-center justify-between">
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                {filteredRoster.length} {filteredRoster.length === 1 ? 'Student' : 'Students'}
                {studentRosterQuery.trim() && ` (filtered from ${roster.length})`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50/50 dark:bg-gray-800/50 border-b border-purple-100 dark:border-gray-800">
                    {['Student', 'Enrollment', 'Attendance', 'Avg Quiz', 'Placement', ...(isAdmin ? ['Action'] : [])].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                        {studentRosterQuery.trim() ? `No students found matching "${studentRosterQuery}"` : 'No students enrolled'}
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                              {s.name?.[0] || 'S'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                              <p className="text-[10px] text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{s.enrollmentNo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${s.attendancePct || 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{s.attendancePct != null ? `${s.attendancePct}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(s.avgQuizScore || 0) >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {s.avgQuizScore != null ? `${s.avgQuizScore}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[s.placementStatus] || 'bg-gray-100 text-gray-500'}`}>
                            {s.placementStatus?.replace('_', ' ') || '—'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => handleRemoveStudent(s.id)}
                              className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <SlidePanel open={addStudentPanel} onClose={() => setAddStudentPanel(false)} title="Add Student to Batch">
            <form onSubmit={searchStudentsToAdd} className="flex gap-2 mb-4">
              <input
                value={addStudentQuery}
                onChange={e => setAddStudentQuery(e.target.value)}
                placeholder="Search by name, email, or enrollment no."
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
              />
              <button
                type="submit"
                disabled={addStudentSearching}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all"
              >
                {addStudentSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {addStudentSearching ? (
                <div className="py-8 text-center text-sm text-gray-400">Searching students...</div>
              ) : addStudentResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  {hasSearched && addStudentQuery.trim()
                    ? `No students found matching "${addStudentQuery}".`
                    : 'No available students to add.'}
                </p>
              ) : (
                addStudentResults.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email} · {s.enrollmentNo}</p>
                      {s.batch && <p className="text-[10px] text-orange-500 mt-0.5">Currently in {s.batch.name}</p>}
                    </div>
                    <button
                      onClick={() => handleAddStudent(s.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </SlidePanel>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === 'Schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 dark:border-purple-900/30 rounded-xl p-1">
              {['list', 'calendar'].map(v => (
                <button key={v} onClick={() => setScheduleView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${scheduleView === v ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => setClassPanel(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Schedule Class
            </button>
          </div>

          {scheduleView === 'list' ? (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      {['Date & Time', 'Title', 'Status', 'Topics', 'Recording', 'Attendance'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No classes scheduled</td></tr>
                    ) : (
                      classes.map(c => (
                        <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-medium">{format(new Date(c.date), 'dd MMM yyyy, hh:mm a')}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{c.title}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : c.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{c._count?.topics || 0}</td>
                          <td className="px-4 py-3">
                            {c.recordingUrl ? (
                              <a href={c.recordingUrl} target="_blank" className="text-xs text-purple-600 hover:underline">Watch</a>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => loadAttSheet(c.id)}
                              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-semibold">
                              <CheckSquare size={12} /> Mark
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setCalendarMonth(m => subMonths(m, 1))}
                  className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 shadow-sm hover:bg-purple-50 hover:text-purple-600 hover:shadow-md flex items-center justify-center transition-all">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-2">
                  <p className="font-display font-extrabold text-lg text-gray-800 dark:text-white">{format(calendarMonth, 'MMMM yyyy')}</p>
                  <button onClick={() => setCalendarMonth(new Date())}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 transition-colors">
                    Today
                  </button>
                </div>
                <button onClick={() => setCalendarMonth(m => addMonths(m, 1))}
                  className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 shadow-sm hover:bg-purple-50 hover:text-purple-600 hover:shadow-md flex items-center justify-center transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[10px] font-extrabold tracking-wider text-gray-400 dark:text-gray-500 uppercase pb-1 font-display">{d}</div>
                ))}
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(calendarMonth)),
                  end: endOfWeek(endOfMonth(calendarMonth)),
                }).map(day => {
                  const dayClasses = classes.filter(c => isSameDay(new Date(c.date), day))
                  const inMonth = isSameMonth(day, calendarMonth)
                  const today = isToday(day)
                  return (
                    <div key={day.toISOString()}
                      onClick={() => dayClasses.length === 0 && openScheduleForDay(day)}
                      className={`group relative min-h-[100px] rounded-xl border p-2 text-left align-top transition-all duration-200 ${!inMonth ? 'border-transparent opacity-30' :
                        today ? 'border-purple-300 dark:border-purple-700 bg-gradient-to-b from-purple-50/70 to-white dark:from-purple-950/20 dark:to-gray-900/40 shadow-sm' :
                        dayClasses.length > 0 ? 'border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5' :
                        'border-gray-100 dark:border-gray-800 cursor-pointer hover:border-purple-200 hover:bg-purple-50/40 dark:hover:bg-purple-900/10 hover:-translate-y-0.5'}`}>
                      <span className={`text-[11px] font-bold ${today ? 'inline-flex w-5 h-5 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}>
                        {format(day, 'd')}
                      </span>
                      <div className="mt-1.5 space-y-1">
                        {dayClasses.map(c => (
                          <button key={c.id} onClick={(e) => { e.stopPropagation(); loadAttSheet(c.id) }}
                            title={`${c.title} — ${format(new Date(c.date), 'h:mm a')} — ${c.status}${c.recordingUrl ? ' — recording available' : ''}`}
                            className={`w-full text-left leading-tight px-1.5 py-1 rounded-lg border transition-colors ${c.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200/70 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/40' : c.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200/70 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40' : 'bg-gray-50 text-gray-500 border-gray-200/70 hover:bg-gray-100 dark:bg-gray-800/60 dark:border-gray-700'}`}>
                            <span className="block text-[9px] font-bold opacity-70">{format(new Date(c.date), 'h:mm a')} · {c.status[0]}{c.status.slice(1).toLowerCase()}</span>
                            <span className="block truncate text-[10px] font-semibold">{c.title}</span>
                          </button>
                        ))}
                        {dayClasses.length === 0 && inMonth && (
                          <Plus size={12} className="mx-auto mt-3 text-gray-200 dark:text-gray-700 group-hover:text-purple-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 flex-wrap pt-4 mt-4 border-t border-gray-100 dark:border-gray-800/60 text-xs">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Legend</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span className="font-semibold text-gray-600 dark:text-gray-300">Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="font-semibold text-gray-600 dark:text-gray-300">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                  <span className="font-semibold text-gray-600 dark:text-gray-300">Cancelled</span>
                </div>
              </div>
            </div>
          )}

          <SlidePanel open={classPanel} onClose={() => setClassPanel(false)} title="Schedule Class">
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input value={classForm.title} onChange={e => setClassForm(f => ({ ...f, title: e.target.value }))} placeholder="Python OOP Concepts"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date & Time *</label>
                <DateTimePicker12h
                  required
                  value={classForm.date}
                  onChange={val => setClassForm(f => ({ ...f, date: val }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Meet Link</label>
                <input value={classForm.meetLink} onChange={e => setClassForm(f => ({ ...f, meetLink: e.target.value }))} placeholder="https://meet.google.com/..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={classForm.notes} onChange={e => setClassForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setClassPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : 'Schedule'}
                </button>
              </div>
            </form>
          </SlidePanel>
        </div>
      )}

      {/* Attendance Tab */}
      {tab === 'Attendance' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select a class from the Schedule tab and click "Mark" to take attendance.</p>
          <div className="glass-card p-6">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Select Class</p>
            <div className="space-y-2">
              {classes.filter(c => c.status !== 'CANCELLED').map(c => (
                <button key={c.id} onClick={() => { setTab('Schedule'); loadAttSheet(c.id) }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 transition-colors text-left">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.title}</span>
                  <span className="text-xs text-gray-400 font-medium">{format(new Date(c.date), 'dd MMM yyyy, hh:mm a')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {tab === 'Assignments' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100">
                  {['Title', 'Due Date', 'Max Marks', 'Submissions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(batch.assignments || []).length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No assignments</td></tr>
                ) : (
                  batch.assignments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{a.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(a.dueDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.maxMarks}</td>
                      <td className="px-4 py-3">
                        <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a._count?.submissions || 0}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Mark Panel */}
      <SlidePanel open={attPanel} onClose={() => setAttPanel(false)} title="Mark Attendance" width="w-[560px]">
        {attSheet && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{attSheet.length} students</p>
              <button onClick={() => setAttStatuses(Object.fromEntries(attSheet.map(s => [s.studentId, 'PRESENT'])))}
                className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg font-semibold hover:bg-green-100">
                Mark All Present
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Legend</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">P</span> Present</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-400 text-white text-[9px] font-bold flex items-center justify-center">A</span> Absent</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-400 text-white text-[9px] font-bold flex items-center justify-center">L</span> Late</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-teal-400 text-white text-[9px] font-bold flex items-center justify-center">Lv</span> Leave</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {attSheet.map(s => (
                <div key={s.studentId} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                  <div className="flex gap-1">
                    {['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].map(st => (
                      <button key={st} onClick={() => setAttStatuses(prev => ({ ...prev, [s.studentId]: st }))}
                        title={st === 'LEAVE' ? 'Leave' : st[0] + st.slice(1).toLowerCase()}
                        aria-label={st === 'LEAVE' ? 'Leave' : st[0] + st.slice(1).toLowerCase()}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${attStatuses[s.studentId] === st ? (st === 'PRESENT' ? 'bg-green-500 text-white' : st === 'ABSENT' ? 'bg-yellow-400 text-white' : st === 'LATE' ? 'bg-blue-400 text-white' : 'bg-teal-400 text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {st === 'LEAVE' ? 'Lv' : st[0]}
                      </button>
                    ))}
                  </div>

                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-gray-900 pb-2">
              <button onClick={() => setAttPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={saveAttendance} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Edit Batch Panel */}
      <SlidePanel open={editPanel} onClose={() => setEditPanel(false)} title="Edit Batch" subtitle="Update batch details">
        {batch && (() => {
          const selectedForEdit = courses.find(c => String(c.id) === String(editForm.courseId)) || batch.course
          const editDateError = validateBatchDates(editForm.startDate, editForm.endDate, selectedForEdit?.duration)
          const editMaxEnd = editForm.startDate && selectedForEdit?.duration ? calculateMaxEndDate(editForm.startDate, selectedForEdit.duration) : null
          return (
            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Python Batch Jan 2026"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course *</label>
                <select value={editForm.courseId} onChange={e => setEditForm(f => ({ ...f, courseId: e.target.value }))} required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select course</option>
                  {courses.filter(c => c.status === 'PUBLISHED').map(c => <option key={c.id} value={c.id}>{c.title} — {c.duration}</option>)}
                </select>
                {selectedForEdit && (
                  <p className="text-xs text-gray-500 mt-1">Course duration: <span className="font-semibold text-purple-600">{selectedForEdit.duration}</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                  <input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} required
                    className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 ${editDateError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`} />
                </div>
              </div>
              {selectedForEdit && editForm.startDate && editMaxEnd && (
                <p className="text-xs text-gray-500">
                  Max allowed end date for <span className="font-semibold">{selectedForEdit.duration}</span> from {format(new Date(editForm.startDate), 'dd MMM yyyy')} is <span className="font-semibold text-purple-600">{format(editMaxEnd, 'dd MMM yyyy')}</span>
                </p>
              )}
              {editDateError && (
                <p className="text-xs text-red-500 font-medium">{editDateError}</p>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Timing</label>
                <input value={editForm.timing} onChange={e => setEditForm(f => ({ ...f, timing: e.target.value }))} placeholder="09:00 AM - 12:00 PM"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <select value={editForm.mode} onChange={e => setEditForm(f => ({ ...f, mode: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                    <option>ONLINE</option><option>OFFLINE</option><option>HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Students</label>
                  <input type="number" min="1" max="500" value={editForm.maxStudents} onChange={e => setEditForm(f => ({ ...f, maxStudents: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )
        })()}
      </SlidePanel>
    </div>
  )
}
