'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  Plus,
  FileDown,
  UserMinus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  GraduationCap,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import courseService from '@/services/courseService'
import studentService from '@/services/studentService'
import batchService from '@/services/batchService'
import { useAuth } from '@/context/AuthContext'

export default function EnrolledStudentsTab({ courseId, courseTitle, courseStatus }) {
  const { user } = useAuth()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const [enrollments, setEnrollments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active') // default: active enrollments

  // Batches for this course
  const [batches, setBatches] = useState([])

  // Modal states
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [unenrollModalData, setUnenrollModalData] = useState(null) // enrollment to unenroll
  const [unenrolling, setUnenrolling] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Enroll Form state
  const [candidateStudents, setCandidateStudents] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  const searchTimer = useRef(null)

  // Load course enrollments
  const loadEnrollments = useCallback(() => {
    setLoading(true)
    setError(null)
    courseService.getEnrollments(courseId, {
      search: search || undefined,
      batchId: batchFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20,
    })
      .then(res => {
        const d = res.data
        setEnrollments(d.enrollments || [])
        setTotal(d.total || 0)
        setTotalPages(d.totalPages || 1)
      })
      .catch(err => {
        console.error('Failed to load course enrollments:', err)
        setError(err.message || 'Failed to load enrolled students')
      })
      .finally(() => setLoading(false))
  }, [courseId, search, batchFilter, statusFilter, page])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  // Load batches for this course
  useEffect(() => {
    batchService.list()
      .then(res => {
        const list = res.data || []
        const courseBatches = list.filter(b => String(b.course?.id) === String(courseId))
        setBatches(courseBatches)
      })
      .catch(err => console.error('Failed to load course batches:', err))
  }, [courseId])

  // Search debounce
  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(v)
      setPage(1)
    }, 300)
  }

  // Load candidate students when enroll modal opens
  const openEnrollModal = () => {
    setSelectedStudentIds([])
    setSelectedBatchId('')
    setCandidateSearch('')
    setEnrollModalOpen(true)
    setLoadingCandidates(true)

    Promise.all([
      studentService.list({ limit: 500, status: 'active' }),
      courseService.getEnrollments(courseId, { status: 'active', limit: 10000 }),
    ])
      .then(([studentsRes, enrollmentsRes]) => {
        const allStudents = studentsRes.data?.students || []
        const activeCourseEnrollments = enrollmentsRes.data?.enrollments || []
        const alreadyEnrolledIds = new Set(activeCourseEnrollments.map(e => String(e.studentId)))

        // Only keep active students who are NOT already enrolled in this course
        const availableCandidates = allStudents.filter(s => !alreadyEnrolledIds.has(String(s.id)))
        setCandidateStudents(availableCandidates)
      })
      .catch(err => {
        toast.error('Failed to load students list: ' + err.message)
      })
      .finally(() => setLoadingCandidates(false))
  }

  // Toggle student selection
  const toggleStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Select / Deselect all filtered candidates
  const handleSelectAllCandidates = (filteredList) => {
    const candidateIds = filteredList.map(s => s.id)
    const allSelected = candidateIds.every(id => selectedStudentIds.includes(id))
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !candidateIds.includes(id)))
    } else {
      const merged = new Set([...selectedStudentIds, ...candidateIds])
      setSelectedStudentIds(Array.from(merged))
    }
  }

  // Submit enrollment (supports single or multiple students)
  const handleEnrollSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStudentIds || selectedStudentIds.length === 0) {
      toast.error('Please select at least one student')
      return
    }

    setEnrolling(true)
    try {
      const payload = {
        studentIds: selectedStudentIds.map(Number),
        batchId: selectedBatchId ? Number(selectedBatchId) : null,
      }

      try {
        await courseService.bulkEnrollStudents(courseId, payload)
      } catch (bulkErr) {
        // Fallback to sequential single enrollments if bulk endpoint is unavailable
        for (const sid of selectedStudentIds) {
          await courseService.enrollStudent(courseId, {
            studentId: Number(sid),
            batchId: selectedBatchId ? Number(selectedBatchId) : null,
          })
        }
      }

      const count = selectedStudentIds.length
      toast.success(`Successfully enrolled ${count} student${count > 1 ? 's' : ''}`)
      setEnrollModalOpen(false)
      loadEnrollments()
    } catch (err) {
      toast.error(err.message || 'Failed to enroll student(s)')
    } finally {
      setEnrolling(false)
    }
  }

  // Submit unenrollment
  const handleConfirmUnenroll = async () => {
    if (!unenrollModalData) return
    setUnenrolling(true)
    try {
      await courseService.unenrollStudent(courseId, unenrollModalData.enrollmentId)
      toast.success(`Unenrolled ${unenrollModalData.name} from course`)
      setUnenrollModalData(null)
      loadEnrollments()
    } catch (err) {
      toast.error(err.message || 'Failed to unenroll student')
    } finally {
      setUnenrolling(false)
    }
  }

  // Export full enrolled student roster to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const exportLimit = Math.max(total || 0, 10000)
      const res = await courseService.getEnrollments(courseId, {
        search: search || undefined,
        batchId: batchFilter || undefined,
        status: statusFilter || undefined,
        page: 1,
        limit: exportLimit,
      })

      const list = res.data?.enrollments || []
      if (list.length === 0) {
        toast.error('No enrolled students to export')
        return
      }

      const headers = ['Enrollment ID', 'Student Name', 'Email', 'Phone', 'Batch', 'Placement Status', 'Enrollment Status', 'Enrolled Date']
      const rows = list.map(item => [
        item.enrollmentNo || '',
        item.name || '',
        item.email || '',
        item.phone || '',
        item.batch?.name || 'No Batch',
        item.placementStatus || '',
        item.active ? 'Active' : 'Inactive',
        item.enrolledAt ? format(new Date(item.enrolledAt), 'yyyy-MM-dd HH:mm') : '',
      ])

      const csvContent = '\uFEFF' + [headers, ...rows]
        .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(courseTitle || 'course').toLowerCase().replace(/[^a-z0-9]/g, '_')}_enrolled_students_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success(`Exported all ${list.length} enrolled student records`)
    } catch (err) {
      toast.error('Failed to export students: ' + (err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setBatchFilter('')
    setStatusFilter('active')
    setPage(1)
  }

  // Filter candidate students for the modal
  const filteredCandidates = candidateStudents.filter(s => {
    if (!candidateSearch) return true
    const q = candidateSearch.toLowerCase()
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(q))
    )
  })

  // Selected batch capacity info
  const selectedBatchObj = batches.find(b => String(b.id) === String(selectedBatchId))

  return (
    <div className="glass-card p-5 space-y-5">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enrolled Students</h2>
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {total}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Students actively registered for <span className="font-semibold text-gray-700 dark:text-gray-300">{courseTitle}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={openEnrollModal}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-3.5 py-2 text-xs font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm shadow-purple-500/20"
            >
              <Plus size={15} /> Enroll Student
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={exporting || total === 0}
            className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={loadEnrollments}
            title="Refresh list"
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30 flex flex-wrap gap-2.5">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 flex-1 min-w-[200px] border border-gray-200 dark:border-gray-800">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name, email, or enrollment ID..."
            defaultValue={search}
            onChange={e => handleSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
          />
        </div>

        <select
          value={batchFilter}
          onChange={e => {
            setBatchFilter(e.target.value)
            setPage(1)
          }}
          className="bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 rounded-xl px-3 py-1.5 outline-none border border-gray-200 dark:border-gray-800"
        >
          <option value="">All Batches</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 rounded-xl px-3 py-1.5 outline-none border border-gray-200 dark:border-gray-800"
        >
          <option value="active">Active Enrollments</option>
          <option value="inactive">Unenrolled / Inactive</option>
          <option value="all">All Status</option>
        </select>

        {(search || batchFilter || statusFilter !== 'active') && (
          <button
            onClick={resetFilters}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline self-center px-1 font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Table / State Views */}
      {loading ? (
        <div className="space-y-2.5 p-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <h3 className="font-bold text-sm text-red-800 dark:text-red-300">Unable to load enrollments</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-sm mx-auto">{error}</p>
          <button
            onClick={loadEnrollments}
            className="mt-3 px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : enrollments.length === 0 ? (
        search || batchFilter || statusFilter !== 'active' ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No matching students found</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Try adjusting your search query or filters</p>
            </div>
            <button
              onClick={resetFilters}
              className="px-3.5 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/40 rounded-xl hover:bg-purple-100 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="text-center py-14 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
              <GraduationCap size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No students enrolled yet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs mx-auto">
                Start building this course roster by enrolling registered students into this course and its batches.
              </p>
            </div>
            {canManage && (
              <button
                onClick={openEnrollModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition-all shadow-sm"
              >
                <Plus size={14} /> Enroll First Student
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Enrollment ID</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Assigned Batch</th>
                  <th className="px-4 py-3">Enrolled Date</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {enrollments.map((item, index) => {
                  const initials = item.name
                    ? item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'ST'

                  return (
                    <tr key={item.enrollmentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 20 + index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-700 dark:text-gray-300">
                        {item.enrollmentNo || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {item.phone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {item.batch?.name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40">
                            {item.batch.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {item.enrolledAt ? format(new Date(item.enrolledAt), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {item.active ? 'Enrolled' : 'Unenrolled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          item.active ? (
                            <button
                              onClick={() => setUnenrollModalData(item)}
                              title="Unenroll student from this course"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            >
                              <UserMinus size={13} /> Unenroll
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedStudentId(String(item.studentId))
                                setSelectedBatchId(item.batch?.id ? String(item.batch.id) : '')
                                setEnrollModalOpen(true)
                              }}
                              title="Re-enroll student"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              Re-enroll
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Prev
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-xl text-sm font-semibold transition-colors ${
                        p === page
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Enroll Students Modal */}
      {enrollModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Enroll Students</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enroll one or multiple students into {courseTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="p-6 space-y-4">
              {/* Selected Students Chips summary */}
              {selectedStudentIds.length > 0 && (
                <div className="space-y-1.5 bg-purple-50/60 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                      Selected Students ({selectedStudentIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-[11px] text-purple-600 hover:underline font-semibold"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {selectedStudentIds.map(id => {
                      const studentObj = candidateStudents.find(s => String(s.id) === String(id))
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-600 text-white text-xs font-medium shadow-sm"
                        >
                          {studentObj?.name || `ID: ${id}`}
                          <button
                            type="button"
                            onClick={() => toggleStudent(id)}
                            className="hover:bg-purple-700 rounded-full p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Student Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Select Students *
                  </label>
                  {!loadingCandidates && filteredCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectAllCandidates(filteredCandidates)}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {filteredCandidates.every(s => selectedStudentIds.includes(s.id))
                        ? 'Deselect Filtered'
                        : `Select All Matching (${filteredCandidates.length})`}
                    </button>
                  )}
                </div>

                {loadingCandidates ? (
                  <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Filter student by name, email, or enrollment ID..."
                        value={candidateSearch}
                        onChange={e => setCandidateSearch(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                      />
                    </div>

                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {filteredCandidates.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          {candidateSearch ? 'No matching students found' : 'No available active students'}
                        </div>
                      ) : (
                        filteredCandidates.map(s => {
                          const isSelected = selectedStudentIds.includes(s.id)
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors ${
                                isSelected ? 'bg-purple-50/80 dark:bg-purple-950/30' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleStudent(s.id)}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300 dark:border-gray-700"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{s.name}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {s.email} {s.enrollmentNo ? `· ${s.enrollmentNo}` : ''}
                                  </p>
                                </div>
                              </div>
                              {s.batch && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                                  batches.some(b => String(b.id) === String(s.batch.id))
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                  {batches.some(b => String(b.id) === String(s.batch.id)) ? s.batch.name : `Other course: ${s.batch.name}`}
                                </span>
                              )}
                            </label>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Batch Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Assign Course Batch (Optional)
                </label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                >
                  <option value="">No Batch (Assign later)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.mode || 'HYBRID'}) · Max {b.maxStudents || 30} seats
                    </option>
                  ))}
                </select>
                {selectedBatchObj && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Timing: {selectedBatchObj.timing || 'TBD'} &bull; Max capacity: {selectedBatchObj.maxStudents} students
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling || selectedStudentIds.length === 0}
                  className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/20"
                >
                  {enrolling ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {enrolling
                    ? `Enrolling (${selectedStudentIds.length})...`
                    : `Confirm Enrollment (${selectedStudentIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Unenroll Confirmation Modal */}
      {unenrollModalData && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Unenroll Student?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Are you sure you want to unenroll <span className="font-semibold text-gray-800 dark:text-gray-200">{unenrollModalData.name}</span> from <span className="font-semibold text-gray-800 dark:text-gray-200">{courseTitle}</span>?
              </p>
              <p className="text-[11px] text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl text-left">
                &bull; The student will immediately lose access to course materials, syllabus, and sessions.<br/>
                &bull; The enrollment history will be preserved as inactive and can be reactivated at any time.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={unenrolling}
                onClick={() => setUnenrollModalData(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unenrolling}
                onClick={handleConfirmUnenroll}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/20"
              >
                {unenrolling ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                {unenrolling ? 'Unenrolling...' : 'Yes, Unenroll'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
