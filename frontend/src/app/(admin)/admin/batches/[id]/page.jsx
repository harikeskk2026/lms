'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Trash2, UserCheck, Pencil, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'
import { useConfirmModal } from '@/components/ui/ConfirmModal'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/lib/api'
import studentService from '@/services/studentService'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import reportService from '@/services/reportService'
import courseService from '@/services/courseService'
import SlidePanel from '@/components/admin/SlidePanel'
import CustomSelect from '@/components/ui/CustomSelect'
import MultiSelect from '@/components/ui/MultiSelect'
import Pagination from '@/components/ui/Pagination'
import { validateBatchDates, calculateMaxEndDate } from '@/utils/courseDuration'

const TABS = ['Overview', 'Students', 'Attendance']

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
  const [ask, confirmModal] = useConfirmModal()
  const [batch, setBatch] = useState(null)
  const [classes, setClasses] = useState([])
  const [roster, setRoster] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [attPanel, setAttPanel] = useState(false)
  const [attClass, setAttClass] = useState(null)
  const [attSheet, setAttSheet] = useState(null)
  const [attStatuses, setAttStatuses] = useState({})
  const [saving, setSaving] = useState(false)
  const [addStudentPanel, setAddStudentPanel] = useState(false)
  const [addStudentQuery, setAddStudentQuery] = useState('')
  const [addStudentResults, setAddStudentResults] = useState([])
  const [addStudentSearching, setAddStudentSearching] = useState(false)
  const [editPanel, setEditPanel] = useState(false)
  const [courses, setCourses] = useState([])
  const [editForm, setEditForm] = useState({ name: '', courseId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30 })
  const [hasSearched, setHasSearched] = useState(false)
  const [studentRosterInput, setStudentRosterInput] = useState('')
  const studentRosterQuery = useDebouncedValue(studentRosterInput, 400)
  const [rejectModal, setRejectModal] = useState({ open: false, student: null, reason: '' })
  const [rosterPage, setRosterPage] = useState(1)
  const [rosterPageSize, setRosterPageSize] = useState(20)
  const [rawDisplayedRoster, setRawDisplayedRoster] = useState([])
  const [displayedRosterTotal, setDisplayedRosterTotal] = useState(0)
  const [rosterSearching, setRosterSearching] = useState(false)
  const [perfById, setPerfById] = useState({})
  const rosterAbortRef = useRef(null)

  // The roster table itself is server-searched + server-paginated (see the
  // effect below); `roster` (the full, unfiltered batch roster fetched once
  // in `load()`) is kept only for the "enrolled" stat and to exclude
  // already-enrolled students from the Add-Student search. Attendance/quiz
  // stats come from a separate per-batch performance report, so each raw
  // search result page is enriched with it here rather than re-fetched.
  useEffect(() => {
    if (!id) return
    rosterAbortRef.current?.abort()
    const controller = new AbortController()
    rosterAbortRef.current = controller
    setRosterSearching(true)
    studentService.list(
      { batchId: id, search: studentRosterQuery.trim() || undefined, page: rosterPage, limit: rosterPageSize },
      { signal: controller.signal }
    )
      .then(r => {
        const data = r.data
        setRawDisplayedRoster(data?.students || [])
        setDisplayedRosterTotal(data?.totalElements ?? data?.total ?? 0)
      })
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return
        toast.error(err.message || 'Failed to load students')
      })
      .finally(() => {
        if (rosterAbortRef.current === controller) setRosterSearching(false)
      })
  }, [id, studentRosterQuery, rosterPage, rosterPageSize])

  useEffect(() => { setRosterPage(1) }, [studentRosterQuery])

  const displayedRoster = rawDisplayedRoster.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    enrollmentNo: s.enrollmentNo,
    placementStatus: s.placementStatus,
    attendancePct: perfById[s.id]?.attendancePct,
    avgQuizScore: perfById[s.id]?.avgQuizScore,
  }))

  const handleAssignTrainers = async (newTrainerIds) => {
    const errMsg = validateBatchDates(batch.startDate, batch.endDate, batch.course?.duration)
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    try {
      await adminApi.updateBatch(id, {
        name: batch.name,
        courseId: batch.course?.id ?? batch.courseId,
        trainerIds: newTrainerIds.map(Number),
        startDate: batch.startDate,
        endDate: batch.endDate,
        timing: batch.timing,
        mode: batch.mode,
        maxStudents: batch.maxStudents,
      })
      toast.success('Trainer assignment updated')
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
        trainerIds: (batch.trainers || []).map(t => t.id),
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
      setPerfById(perfById)

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
        .then(r => {
          const list = r.data?.data?.trainers || []
          setTrainers(list.filter(t => t.active === true))
        })
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


  const handleRemoveStudent = async (studentUserId) => {
    const ok = await ask({
      title: 'Remove Student from Batch?',
      message: 'Are you sure you want to remove this student from the batch? Their course enrollment and materials access will remain unaffected.',
      confirmLabel: 'Remove Student',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await adminApi.removeFromBatch(id, studentUserId)
      toast.success('Student removed')
      load()
    } catch { toast.error('Failed to remove') }
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      const validTabs = ['Overview', 'Students', 'Attendance']
      const match = validTabs.find(t => t.toLowerCase() === (tabParam || '').toLowerCase())
      if (match) {
        setTab(match)
      } else {
        const saved = sessionStorage.getItem(`batch_tab_${id}`)
        if (saved && validTabs.includes(saved)) setTab(saved)
      }
    } catch {}
  }, [id])

  const handleTabChange = (t) => {
    setTab(t)
    try {
      sessionStorage.setItem(`batch_tab_${id}`, t)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', t)
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch {}
  }

  if (loading) return <div className="max-w-7xl mx-auto"><div className="glass-card p-6 animate-pulse h-40" /></div>
  if (!batch) return <div className="text-center py-20 text-gray-400">Batch not found</div>

  const totalClasses = classes.length
  const completedClasses = classes.filter(c => c.status === 'COMPLETED').length
  const enrolled = roster.length
  const totalDays = Math.max(1, (new Date(batch.endDate) - new Date(batch.startDate)) / 86400000)
  const elapsedDays = Math.min(totalDays, Math.max(0, (Date.now() - new Date(batch.startDate)) / 86400000))
  const progressPct = Math.round((elapsedDays / totalDays) * 100)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
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
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              batch.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
              : batch.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
            }`}>
              {batch.status === 'ACTIVE' ? 'Active' : batch.status === 'UPCOMING' ? 'Upcoming' : 'Ended'}
            </span>
          </div>
        ) : (
          <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
            batch.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
            : batch.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-500'
          }`}>
            {batch.status === 'ACTIVE' ? 'Active' : batch.status === 'UPCOMING' ? 'Upcoming' : 'Ended'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => handleTabChange(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          {/* Assigned Trainers Card */}
          <div className="glass-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold">
                  <UserCheck size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Trainers</p>
                  {batch.trainers && batch.trainers.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {batch.trainers.map(t => (
                        <div key={t.id}>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 dark:text-white text-base">{t.name}</p>
                            {t.active === false && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t.email}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 font-medium italic">No trainers assigned to this batch yet</p>
                  )}
                </div>
              </div>

              {['SUPERADMIN', 'ADMIN'].includes(user?.role) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Assign:</span>
                  <MultiSelect
                    value={(batch.trainers || []).map(t => String(t.id))}
                    onChange={(vals) => handleAssignTrainers(vals)}
                    options={trainers.filter(t => t.active === true).map(t => ({
                      value: String(t.id),
                      label: `${t.name}${t.designation ? ` · ${t.designation}` : ''}`
                    }))}
                    placeholder="-- No Trainers Assigned --"
                    searchable={trainers.length >= 10}
                    compact
                  />
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Batch Timeline</p>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>{format(new Date(batch.startDate), 'dd MMM yyyy')}</span>
              <span>{format(new Date(), 'dd MMM yyyy')}</span>
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
                value={studentRosterInput}
                onChange={e => setStudentRosterInput(e.target.value)}
                placeholder="Search enrolled students..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
              />
              {studentRosterInput && (
                <button
                  onClick={() => setStudentRosterInput('')}
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
                {displayedRosterTotal} {displayedRosterTotal === 1 ? 'Student' : 'Students'}
                {studentRosterQuery.trim() && ` (filtered from ${roster.length})`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-purple-50/50 dark:bg-gray-800/50 border-b border-purple-100 dark:border-gray-800">
                    {['Student', 'Enrollment', 'Attendance', 'Avg Quiz', 'Placement', ...(isAdmin ? ['Action'] : [])].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!rosterSearching && displayedRoster.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                        {studentRosterQuery.trim() ? `No students found matching "${studentRosterQuery}"` : 'No students enrolled'}
                      </td>
                    </tr>
                  ) : (
                    displayedRoster.map(s => (
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
            <Pagination
              total={displayedRosterTotal}
              page={rosterPage}
              pageSize={rosterPageSize}
              onPageChange={setRosterPage}
              onPageSizeChange={(v) => { setRosterPageSize(v); setRosterPage(1) }}
              label="students"
            />
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
                disabled={addStudentSearching || !addStudentQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      {/* Attendance Tab */}
      {tab === 'Attendance' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Class to Mark Attendance</p>
            <div className="space-y-2">
              {classes.filter(c => c.status !== 'CANCELLED').length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No active classes found for attendance</p>
              ) : (
                classes.filter(c => c.status !== 'CANCELLED').map(c => (
                  <button key={c.id} onClick={() => loadAttSheet(c.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.title}</span>
                    <span className="text-xs text-gray-400 font-medium">{format(new Date(c.date), 'dd MMM yyyy, hh:mm a')}</span>
                  </button>
                ))
              )}
            </div>
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
                    {['PRESENT', 'ABSENT'].map(st => (
                      <button key={st} onClick={() => setAttStatuses(prev => ({ ...prev, [s.studentId]: st }))}
                        title={st[0] + st.slice(1).toLowerCase()}
                        aria-label={st[0] + st.slice(1).toLowerCase()}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${attStatuses[s.studentId] === st ? (st === 'PRESENT' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {st[0]}
                      </button>
                    ))}
                  </div>

                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-gray-900 pb-2">
              <button onClick={() => setAttPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
              <button
                onClick={saveAttendance}
                disabled={saving || !attSheet || attSheet.length === 0 || !attSheet.every(s => attStatuses[s.studentId])}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Edit Batch Panel */}
      <SlidePanel
        open={editPanel}
        onClose={() => setEditPanel(false)}
        title="Edit Batch"
        subtitle="Update batch details"
        isDirty={Boolean(batch && (
          editForm.name !== (batch.name || '') ||
          editForm.courseId !== (batch.course?.id ? String(batch.course.id) : '') ||
          editForm.startDate !== (batch.startDate ? batch.startDate.slice(0, 10) : '') ||
          editForm.endDate !== (batch.endDate ? batch.endDate.slice(0, 10) : '') ||
          editForm.timing !== (batch.timing || '') ||
          editForm.mode !== (batch.mode || 'ONLINE') ||
          editForm.maxStudents !== (batch.maxStudents || '')
        ))}
      >
        {batch && (() => {
          const selectedForEdit = courses.find(c => String(c.id) === String(editForm.courseId)) || batch.course
          const editDateError = validateBatchDates(editForm.startDate, editForm.endDate, selectedForEdit?.duration)
          const editMaxEnd = editForm.startDate && selectedForEdit?.duration ? calculateMaxEndDate(editForm.startDate, selectedForEdit.duration) : null
          const editMaxEndStr = editMaxEnd ? format(editMaxEnd, 'yyyy-MM-dd') : undefined
          return (
            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter batch name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course *</label>
                <CustomSelect
                  value={editForm.courseId}
                  onChange={(val) => setEditForm(f => ({ ...f, courseId: val }))}
                  options={courses.filter(c => c.status === 'PUBLISHED').map(c => ({
                    value: c.id,
                    label: `${c.title} — ${c.duration}`
                  }))}
                  placeholder="Select course"
                />
                {selectedForEdit && (
                  <p className="text-xs text-gray-500 mt-1">Course duration: <span className="font-semibold text-purple-600">{selectedForEdit.duration}</span></p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={e => {
                      const newStart = e.target.value
                      setEditForm(f => ({
                        ...f,
                        startDate: newStart,
                        endDate: f.endDate && newStart && f.endDate < newStart ? '' : f.endDate,
                      }))
                    }}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    min={editForm.startDate || undefined}
                    max={editMaxEndStr}
                    value={editForm.endDate}
                    onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                    required
                    className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 ${editDateError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`}
                  />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <CustomSelect
                    value={editForm.mode}
                    onChange={(val) => setEditForm(f => ({ ...f, mode: val }))}
                    options={[
                      { value: 'ONLINE', label: 'ONLINE' },
                      { value: 'OFFLINE', label: 'OFFLINE' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Students</label>
                  <input type="number" min="1" max="500" value={editForm.maxStudents} onChange={e => setEditForm(f => ({ ...f, maxStudents: e.target.value }))} placeholder="e.g. 30 or 40"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                  {editForm.maxStudents && (Number(editForm.maxStudents) < 1 || Number(editForm.maxStudents) > 500) && (
                    <p className="text-xs text-red-500 font-medium mt-1">Max students must be between 1 and 500</p>
                  )}
                </div>
              </div>
              {(() => {
                const isMaxStudentsValid = !editForm.maxStudents || (Number(editForm.maxStudents) >= 1 && Number(editForm.maxStudents) <= 500)
                const isEditValid = Boolean(
                  editForm.name?.trim() &&
                  editForm.courseId &&
                  editForm.startDate &&
                  editForm.endDate &&
                  !editDateError &&
                  isMaxStudentsValid
                )
                return (
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                    <button
                      type="submit"
                      disabled={saving || !isEditValid}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )
              })()}
            </form>
          )
        })()}
      </SlidePanel>
      {confirmModal}
    </div>
  )
}

