'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Eye, User, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'

const STATUS_BADGE = {
  PRESENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/40',
  ABSENT:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/40',
  LATE:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  LEAVE:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40',
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  )
}

function Skeleton({ className = 'h-32' }) {
  return <div className={`rounded-2xl bg-purple-50 dark:bg-purple-900/20 animate-pulse ${className}`} />
}

const PAGE_SIZE = 20
const emptyFilters = { from: '', to: '', batchId: '', courseId: '', status: '', search: '' }

function StudentDetailModal({ studentId, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    adminApi.getStudentAttHistory(studentId)
      .then(r => setDetail(r.data.data))
      .catch(() => toast.error('Failed to load student attendance'))
      .finally(() => setLoading(false))
  }, [studentId])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-2xl w-full max-w-lg relative overflow-hidden space-y-5" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">Student Attendance Profile</h3>
              <p className="text-[11px] text-gray-400">Detailed record & summary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <Skeleton className="h-56" />
        ) : !detail ? (
          <p className="text-sm text-gray-400 py-6 text-center">Could not load attendance details.</p>
        ) : (
          <div className="space-y-5">
            {/* Student Info */}
            <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{detail.student?.name}</p>
                <p className="text-xs text-gray-500 truncate">{detail.student?.email}</p>
              </div>
              {detail.student?.enrollmentNo && (
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-mono font-bold shrink-0">
                  {detail.student.enrollmentNo}
                </span>
              )}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5">
                <p className={`text-2xl font-extrabold ${
                  detail.overallPct >= 85 ? 'text-green-600 dark:text-green-400' :
                  detail.overallPct >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'
                }`}>
                  {detail.overallPct}%
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Overall</p>
              </div>

              <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl p-3.5">
                <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{detail.totalPresent}</p>
                <p className="text-[10px] text-green-600/70 dark:text-green-400/70 font-bold uppercase tracking-wider mt-0.5">Present</p>
              </div>

              <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-3.5">
                <p className="text-2xl font-extrabold text-red-500 dark:text-red-400">{detail.totalAbsent}</p>
                <p className="text-[10px] text-red-500/70 dark:text-red-400/70 font-bold uppercase tracking-wider mt-0.5">Absent</p>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50/70 dark:bg-gray-800/40 rounded-xl p-3 text-center text-xs text-gray-600 dark:text-gray-300">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Late</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">{detail.totalLate || 0}</span>
              </div>
              <div className="border-x border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Classes</span>
                <span className="font-bold text-gray-800 dark:text-white">{detail.totalAll || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Streak</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">🔥 {detail.streak || 0}</span>
              </div>
            </div>

            {/* Recent Attendance Logs */}
            {detail.recentRecords?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-purple-500" /> Recent Attendance Logs
                  </p>
                  <span className="text-[10px] text-gray-400 font-medium">Last 10 sessions</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {detail.recentRecords.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-purple-50/30 transition-colors">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{r.classTitle}</p>
                        <p className="text-[10px] text-gray-400">{format(new Date(r.date), 'MMM d, yyyy')}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${STATUS_BADGE[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )

}

export default function HistoryTab() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(emptyFilters)
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [detailStudentId, setDetailStudentId] = useState(null)

  useEffect(() => {
    adminApi.getBatches({ isActive: 'true' }).then(r => setBatches(r.data.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, limit: PAGE_SIZE }
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    if (filters.batchId) params.batchId = filters.batchId
    if (filters.courseId) params.courseId = filters.courseId
    if (filters.status) params.status = filters.status
    if (filters.search) params.search = filters.search

    adminApi.getAttendanceHistory(params)
      .then(r => {
        const data = r.data.data
        setRows(data?.items || [])
        setTotal(data?.total || 0)
        setTotalPages(data?.totalPages || 1)
      })
      .catch(() => toast.error('Failed to load attendance history'))
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { load() }, [load])

  const updateFilter = (key, value) => {
    if (key === 'to' && value && filters.from && value < filters.from) {
      toast.error('The "To" date cannot be earlier than the "From" date')
      return
    }
    if (key === 'from' && value && filters.to && value > filters.to) {
      setFilters(prev => ({ ...prev, from: value, to: '' }))
      setPage(1)
      return
    }
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={e => updateFilter('from', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={e => updateFilter('to', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Batch</label>
            <select value={filters.batchId} onChange={e => updateFilter('batchId', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Course</label>
            <select value={filters.courseId} onChange={e => updateFilter('courseId', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">All Statuses</option>
              {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Search Student</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={filters.search} onChange={e => updateFilter('search', e.target.value)}
                placeholder="Name, email, or enrollment no..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>
        {(filters.from || filters.to || filters.batchId || filters.courseId || filters.status || filters.search) && (
          <button onClick={() => { setFilters(emptyFilters); setPage(1) }}
            className="mt-3 text-xs font-semibold text-purple-600 hover:text-purple-800">
            Clear filters
          </button>
        )}
      </GlassCard>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Marked By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Marked At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No attendance records match these filters.</td></tr>
                ) : rows.map(row => (
                  <tr key={row.attendanceId} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20 dark:hover:bg-purple-900/10">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{format(new Date(row.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white font-medium text-xs">{row.studentName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.batchName || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.courseTitle || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{row.classTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${STATUS_BADGE[row.status] || ''}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{row.markedBy ? `User #${row.markedBy}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{row.markedAt ? format(new Date(row.markedAt), 'MMM d, h:mm a') : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailStudentId(row.studentId)}
                        className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800">
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
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

      {detailStudentId && (
        <StudentDetailModal studentId={detailStudentId} onClose={() => setDetailStudentId(null)} />
      )}
    </div>
  )
}
