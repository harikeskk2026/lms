'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Eye, User, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, BookOpen, Layers, CheckCircle2, ArrowRight, Activity, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import CustomSelect from '@/components/ui/CustomSelect'

const STATUS_BADGE = {
  PRESENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/40',
  ABSENT:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/40',
  LATE:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  LEAVE:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40',
  EXCUSED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40',
}

const ROLE_BADGE = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200',
  SUPERADMIN:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200',
  ADMIN:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200',
  TRAINER:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200',
  FACULTY:     'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200',
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

const emptyFilters = { from: '', to: '', batchId: '', courseId: '', status: '', search: '' }

function StudentDetailModal({ studentId, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModalTab, setActiveModalTab] = useState('audit') // 'audit' | 'classes'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    adminApi.getStudentAttHistory(studentId)
      .then(r => setDetail(r.data.data))
      .catch(() => toast.error('Failed to load student attendance'))
      .finally(() => setLoading(false))
  }, [studentId])

  if (!mounted) return null

  const totalClasses = detail?.totalAll ?? ((detail?.totalPresent || 0) + (detail?.totalAbsent || 0) + (detail?.totalLate || 0))
  const auditLogs = detail?.auditLogs || []

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/40 p-6 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-lg">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Student Attendance Profile</h3>
              <p className="text-xs text-gray-500">Summary, change audit logs & batch breakdown</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-20" />
            <Skeleton className="h-24" />
            <Skeleton className="h-44" />
          </div>
        ) : !detail ? (
          <p className="text-sm text-gray-400 py-6 text-center">Could not load attendance details.</p>
        ) : (
          <div className="py-4 space-y-5 overflow-y-auto pr-1">
            {/* Student Info */}
            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-base">{detail.student?.name}</p>
                <p className="text-xs text-gray-500">{detail.student?.email} {detail.student?.enrollmentNo && `· ${detail.student.enrollmentNo}`}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{detail.overallPct ?? 0}%</span>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Overall Attendance</p>
              </div>
            </div>

            {/* Quick Stat Pill Grid */}
            <div className="grid grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">Total Classes</p>
                <p className="text-xl font-black text-purple-900 dark:text-purple-200 mt-0.5">{totalClasses}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/30">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">Present</p>
                <p className="text-xl font-black text-green-800 dark:text-green-300 mt-0.5">{detail.totalPresent ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">Absent</p>
                <p className="text-xl font-black text-red-800 dark:text-red-300 mt-0.5">{detail.totalAbsent ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Late</p>
                <p className="text-xl font-black text-yellow-800 dark:text-yellow-300 mt-0.5">{detail.totalLate ?? 0}</p>
              </div>
            </div>

            {/* Batch Breakdown */}
            {detail.batches?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-purple-500" /> Batch Breakdown
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {detail.batches.map(b => (
                    <div key={b.batchId} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white break-words">{b.batchName}</p>
                           {b.course && <p className="text-[11px] text-gray-400 break-words">{b.course}</p>}
                        </div>
                        <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 shrink-0">{b.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                        <span>P: <strong className="text-green-600 dark:text-green-400">{b.present}</strong></span>
                        <span>A: <strong className="text-red-600 dark:text-red-400">{b.absent}</strong></span>
                        <span>L: <strong className="text-yellow-600 dark:text-yellow-400">{b.late}</strong></span>
                        <span>Total: <strong>{b.total}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab switcher: Audit Trail vs Class Records */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModalTab('audit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'audit'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-100/70 dark:bg-gray-800/70'
                  }`}
                >
                  <Activity size={13} />
                  Audit Trail / Change Logs ({auditLogs.length})
                </button>
                <button
                  onClick={() => setActiveModalTab('classes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'classes'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-100/70 dark:bg-gray-800/70'
                  }`}
                >
                  <Calendar size={13} />
                  Class Sessions ({detail.recentRecords?.length || 0})
                </button>
              </div>
            </div>

            {/* TAB 1: Audit Trail / Change Logs */}
            {activeModalTab === 'audit' && (
              <div className="space-y-2.5">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No attendance audit logs recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {auditLogs.map((log, i) => (
                      <div key={log.id || i} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/70 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">{log.classTitle || 'Class Session'}</p>
                            {log.batchName && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                                {log.batchName}
                              </span>
                            )}
                          </div>
                          
                          {/* Status Transition Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {log.previousStatus && log.previousStatus !== log.newStatus ? (
                              <div className="flex items-center gap-1">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase line-through opacity-70 ${STATUS_BADGE[log.previousStatus] || ''}`}>
                                  {log.previousStatus}
                                </span>
                                <ArrowRight size={10} className="text-gray-400" />
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-sm ${STATUS_BADGE[log.newStatus] || ''}`}>
                                  {log.newStatus}
                                </span>
                              </div>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-sm ${STATUS_BADGE[log.newStatus] || ''}`}>
                                {log.newStatus}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Marker / Changer Info & Role Badge */}
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <User size={11} className="text-purple-500" />
                            <span>Changed by <strong className="text-gray-800 dark:text-gray-200">{log.changedByName || 'System'}</strong></span>
                            {log.changedByRole && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${ROLE_BADGE[log.changedByRole] || 'bg-gray-100 text-gray-600'}`}>
                                {log.changedByRole.replace('_', ' ')}
                              </span>
                            )}
                          </span>

                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock size={10} />
                            {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy · h:mm:ss a') : '—'}
                          </span>
                        </div>

                        {log.remarks && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 italic bg-white/70 dark:bg-gray-900/50 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                            Note: {log.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Class Sessions */}
            {activeModalTab === 'classes' && (
              <div className="space-y-2">
                {(!detail.recentRecords || detail.recentRecords.length === 0) ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No class records found for this student.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {detail.recentRecords.map((r, i) => (
                      <div key={r.attendanceId || i} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/50 dark:hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{r.classTitle || 'Class Session'}</p>
                              {r.batchName && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                                  {r.batchName}
                                </span>
                              )}
                              {r.courseTitle && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px]">
                                  {r.courseTitle}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} className="text-gray-400" />
                                {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
                              </span>
                              {r.markedByName && (
                                <span className="flex items-center gap-1">
                                  <User size={11} className="text-purple-400" />
                                  Marked by <strong className="text-gray-700 dark:text-gray-300">{r.markedByName}</strong>
                                </span>
                              )}
                              {r.markedAt && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                  <Clock size={10} />
                                  {format(new Date(r.markedAt), 'h:mm a, MMM d')}
                                </span>
                              )}
                            </div>

                            {r.remarks && (
                              <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 italic bg-white/60 dark:bg-gray-900/40 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800 inline-block">
                                Note: {r.remarks}
                              </p>
                            )}
                          </div>

                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${STATUS_BADGE[r.status] || ''}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
  const [pageSize, setPageSize] = useState(20)
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
    const params = { page, limit: pageSize }
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
        const totalCount = data?.total || 0
        setTotal(totalCount)
        setTotalPages(data?.totalPages || Math.ceil(totalCount / pageSize) || 1)
      })
      .catch(() => toast.error('Failed to load attendance history'))
      .finally(() => setLoading(false))
  }, [page, pageSize, filters])

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
            <CustomSelect
              value={filters.batchId}
              onChange={(val) => updateFilter('batchId', val)}
              options={batches.map(b => ({ value: b.id, label: b.name }))}
              placeholder="All Batches"
              searchable={batches.length >= 10}
              compact
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Course</label>
            <CustomSelect
              value={filters.courseId}
              onChange={(val) => updateFilter('courseId', val)}
              options={courses.map(c => ({ value: c.id, label: c.title }))}
              placeholder="All Courses"
              searchable={courses.length >= 10}
              compact
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <CustomSelect
              value={filters.status}
              onChange={(val) => updateFilter('status', val)}
              options={Object.keys(STATUS_BADGE).map(s => ({ value: s, label: s }))}
              placeholder="All Statuses"
              compact
            />
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
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="sticky top-0 z-10 bg-purple-50/95 dark:bg-purple-950/95 backdrop-blur border-b border-purple-100 dark:border-purple-900/30">
                <tr>
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
                    <td className="px-4 py-3 text-gray-500 text-xs break-words">{row.classTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${STATUS_BADGE[row.status] || ''}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium">{row.markedByName || (row.markedBy ? `User #${row.markedBy}` : '—')}</td>
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

      {/* Pagination & Controls Bar */}
      <GlassCard className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <p className="text-gray-600 dark:text-gray-400">
            {total > 0
              ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} records`
              : '0 records found'}
          </p>
          <div className="flex items-center gap-1.5 text-gray-500 pl-3 border-l border-gray-200 dark:border-gray-700">
            <span>Rows:</span>
            <CustomSelect
              value={pageSize}
              onChange={(val) => {
                setPageSize(Number(val))
                setPage(1)
              }}
              options={[10, 20, 50, 100].map(s => ({ value: s, label: s }))}
              compact
              clearable={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1 || loading}
            title="First Page"
            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            title="Previous Page"
            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1 px-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (p > totalPages || p < 1) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-gray-200 dark:border-gray-700'}`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            title="Next Page"
            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages || loading}
            title="Last Page"
            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </GlassCard>

      {detailStudentId && (
        <StudentDetailModal studentId={detailStudentId} onClose={() => setDetailStudentId(null)} />
      )}
    </div>
  )
}
