'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FileDown, BarChart2, FileText, Users, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import reportService from '@/services/reportService'
import batchService from '@/services/batchService'
import courseService from '@/services/courseService'

const TABS = ['Attendance', 'Performance', 'Placement', 'Export']

// recharts is a heavy dependency - load each report tab's charts only when
// that tab is viewed, and only on the client (SSR doesn't need them).
const noSSR = (loader) => dynamic(loader, { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" /> })

const AttendanceTrendChart      = noSSR(() => import('@/components/admin/reports/AttendanceReportCharts').then(m => m.AttendanceTrendChart))
const AttendanceByBatchChart    = noSSR(() => import('@/components/admin/reports/AttendanceReportCharts').then(m => m.AttendanceByBatchChart))
const AttendanceDistributionChart = noSSR(() => import('@/components/admin/reports/AttendanceReportCharts').then(m => m.AttendanceDistributionChart))

const CoursePerformanceChart          = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.CoursePerformanceChart))
const BatchPerformanceChart           = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.BatchPerformanceChart))
const PerformanceTrendChart           = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.PerformanceTrendChart))
const AtRiskBreakdownChart            = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.AtRiskBreakdownChart))
const StudentCourseBreakdownChart     = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.StudentCourseBreakdownChart))
const StudentProgressTrendChart       = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.StudentProgressTrendChart))
const BatchHealthChart                = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.BatchHealthChart))
const QuizBreakdownChart              = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.QuizBreakdownChart))
const EngagementDistributionChart     = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.EngagementDistributionChart))
const AssignmentCompletionByBatchChart = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.AssignmentCompletionByBatchChart))
const ActivityTrendChart              = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.ActivityTrendChart))
const CorrelationScatterChart         = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.CorrelationScatterChart))

const PlacementDistributionChart = noSSR(() => import('@/components/admin/reports/PlacementReportCharts').then(m => m.PlacementDistributionChart))
const PlacementByBatchChart      = noSSR(() => import('@/components/admin/reports/PlacementReportCharts').then(m => m.PlacementByBatchChart))
const PlacementByCourseChart     = noSSR(() => import('@/components/admin/reports/PlacementReportCharts').then(m => m.PlacementByCourseChart))
const PlacementFunnelChart       = noSSR(() => import('@/components/admin/reports/PlacementReportCharts').then(m => m.PlacementFunnelChart))

const RISK_BADGE = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const READINESS_BADGE = {
  READY: 'bg-green-100 text-green-700',
  NEARLY_READY: 'bg-blue-100 text-blue-700',
  NEEDS_IMPROVEMENT: 'bg-yellow-100 text-yellow-700',
  NOT_READY: 'bg-red-100 text-red-700',
}

const DIFFICULTY_BADGE = {
  DIFFICULT: 'bg-red-100 text-red-700',
  MODERATE: 'bg-yellow-100 text-yellow-700',
  EASY: 'bg-green-100 text-green-700',
}

function downloadCSV(data, filename) {
  if (!data.length) return toast.error('No data to export')
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function StatCard({ label, value, color = 'text-gray-800 dark:text-white' }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className={`text-xl font-extrabold font-display ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-500 uppercase font-semibold mt-1">{label}</p>
    </div>
  )
}

function ChartCard({ title, empty, emptyMessage, height = 220, children, footer }) {
  return (
    <div className="glass-card p-5 min-w-0 min-h-0">
      <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">{title}</h3>
      {empty ? (
        <div style={{ height: Math.min(height, 140) }} className="flex items-center justify-center text-center px-4">
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="min-w-0" style={{ width: '100%' }}>{children}</div>
      )}
      {footer}
    </div>
  )
}

function TableCard({ title, rows, columns, emptyMessage, note }) {
  return (
    <div className="glass-card p-5 overflow-x-auto">
      <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">{title}</h3>
      {!rows.length ? (
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {columns.map(c => (
                <th key={c.header} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? row.studentId ?? row.batchId ?? row.courseId ?? i} className="border-b border-gray-50 dark:border-gray-800/50">
                {columns.map(c => (
                  <td key={c.header} className="px-3 py-2">{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {note}
    </div>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState('Attendance')
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [batchFilter, setBatchFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [attData, setAttData] = useState(null)
  const [perfData, setPerfData] = useState(null)
  const [placementReport, setPlacementReport] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentDetail, setStudentDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exportPreview, setExportPreview] = useState(null)
  const [exportPreviewLoading, setExportPreviewLoading] = useState('')

  const [batchHealth, setBatchHealth] = useState([])
  const [quizData, setQuizData] = useState(null)
  const [assignmentData, setAssignmentData] = useState(null)
  const [engagementData, setEngagementData] = useState(null)
  const [activityTrend, setActivityTrend] = useState([])
  const [topStudents, setTopStudents] = useState([])
  const [batchLeaderboard, setBatchLeaderboard] = useState([])
  const [decliningStudents, setDecliningStudents] = useState([])
  const [placementReadiness, setPlacementReadiness] = useState([])
  const [correlations, setCorrelations] = useState([])

  useEffect(() => {
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    reportService.getPlacement().then(r => setPlacementReport(r.data)).catch(() => {})
    reportService.getBatchLeaderboard().then(r => setBatchLeaderboard(r.data || [])).catch(() => {})
    reportService.getPlacementReadiness().then(r => setPlacementReadiness(r.data || [])).catch(() => {})
  }, [])

  // Auto-load (and auto-refresh on filter change) so reports always reflect current data
  // without waiting on a manual "Generate Report" click.
  useEffect(() => {
    loadAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter, courseFilter, startDate, endDate])

  useEffect(() => {
    loadPerformance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter, courseFilter])

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const r = await reportService.getAttendance({
        batchId: batchFilter || undefined, courseId: courseFilter || undefined, startDate, endDate,
      })
      setAttData(r.data)
      if (!r.data?.available) toast(r.data?.message || 'No data available for the selected filters.', { icon: 'ℹ️' })
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const loadPerformance = async () => {
    setLoading(true)
    try {
      const params = { batchId: batchFilter || undefined, courseId: courseFilter || undefined }
      const [perf, health, quiz, assignments, engagement, trend, top, declining, corr] = await Promise.all([
        reportService.getPerformance(params),
        reportService.getBatchHealth(),
        reportService.getQuizAnalytics(params),
        reportService.getAssignmentAnalytics({ batchId: params.batchId }),
        reportService.getEngagement({ batchId: params.batchId }),
        reportService.getActivityTrend(),
        reportService.getTopStudents({ batchId: params.batchId, limit: 10 }),
        reportService.getDecliningStudents({ batchId: params.batchId }),
        reportService.getCorrelations({ batchId: params.batchId }),
      ])
      setPerfData(perf.data)
      setBatchHealth(health.data || [])
      setQuizData(quiz.data)
      setAssignmentData(assignments.data)
      setEngagementData(engagement.data)
      setActivityTrend(trend.data || [])
      setTopStudents(top.data || [])
      setDecliningStudents(declining.data || [])
      setCorrelations(corr.data || [])
      setSelectedStudentId('')
      setStudentDetail(null)
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const loadStudentDetail = async (studentId) => {
    setSelectedStudentId(studentId)
    if (!studentId) { setStudentDetail(null); return }
    try {
      const r = await reportService.getStudentPerformance(studentId)
      setStudentDetail(r.data)
    } catch { toast.error('Failed to load student performance') }
  }

  const handleViewExportDetails = async (type, label) => {
    setExportPreviewLoading(type)
    try {
      const r = await reportService.export({ type, batchId: batchFilter || undefined, startDate, endDate })
      setExportPreview({ type, label, rows: r.data || [] })
    } catch { toast.error('Failed to load details') } finally { setExportPreviewLoading('') }
  }

  const attReport = attData?.students || []
  const attAvg = attReport.length ? Math.round(attReport.reduce((a, r) => a + (r.attendancePct || 0), 0) / attReport.length) : 0
  const perfReport = perfData?.students || []

  const placementChartData = placementReport ? [
    { name: 'Seeking', count: placementReport.statusCounts?.SEEKING || 0, fill: '#3b82f6' },
    { name: 'Interviewing', count: placementReport.statusCounts?.INTERVIEWING || 0, fill: '#f59e0b' },
    { name: 'Placed', count: placementReport.statusCounts?.PLACED || 0, fill: '#22c55e' },
    { name: 'Not Seeking', count: placementReport.statusCounts?.NOT_SEEKING || 0, fill: '#9ca3af' },
  ] : []
  const placementTotal = placementChartData.reduce((a, d) => a + d.count, 0)
  const placementSeeking = placementReport?.statusCounts?.SEEKING || 0
  const placementInterviewing = placementReport?.statusCounts?.INTERVIEWING || 0
  const placementPlaced = placementReport?.statusCounts?.PLACED || 0
  const placementNotSeeking = placementReport?.statusCounts?.NOT_SEEKING || 0
  const placementNotPlaced = placementTotal - placementPlaced

  const funnelData = [
    { name: 'Total Students', value: placementTotal, fill: '#9333ea' },
    { name: 'Active in Process', value: placementTotal - placementNotSeeking, fill: '#3b82f6' },
    { name: 'Interviewing or Placed', value: placementInterviewing + placementPlaced, fill: '#f59e0b' },
    { name: 'Placed', value: placementPlaced, fill: '#22c55e' },
  ]

  const ATTENDANCE_STATUS_COLOR = { PRESENT: '#22c55e', ABSENT: '#ef4444', LATE: '#f59e0b', EXCUSED: '#9ca3af' }
  const attendanceDistributionData = (attData?.attendanceDistribution || [])
    .map(d => ({ name: d.status, value: d.count, fill: ATTENDANCE_STATUS_COLOR[d.status] || '#9ca3af' }))
  const attendanceDistributionTotal = attendanceDistributionData.reduce((a, d) => a + d.value, 0)

  const engagementDonutData = engagementData ? [
    { name: 'High', value: engagementData.highCount, fill: '#22c55e' },
    { name: 'Medium', value: engagementData.mediumCount, fill: '#f59e0b' },
    { name: 'Low', value: engagementData.lowCount, fill: '#ef4444' },
  ] : []
  const engagementTotal = engagementDonutData.reduce((a, d) => a + d.value, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Reports & Analytics</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Attendance Report */}
      {tab === 'Attendance' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Batch</label>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Course</label>
              <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <button onClick={loadAttendance} disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            {attReport.length > 0 && (
              <button onClick={() => downloadCSV(attReport, 'attendance-report.csv')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
                <FileDown size={14} /> Export CSV
              </button>
            )}
          </div>

          {attData && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Average Attendance" value={attData.summary?.averageScorePct != null ? `${attData.summary.averageScorePct}%` : '—'} color="text-purple-600" />
                <StatCard label="Total Students" value={attData.summary?.totalStudents ?? '—'} color="text-blue-600" />
                <StatCard label="Total Classes" value={attData.totalClasses ?? '—'} color="text-green-600" />
                <StatCard label="Low Attendance Students" value={attData.lowAttendanceCount ?? '—'} color="text-orange-600" />
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                <ChartCard title="Attendance Trend" empty={!attData.attendanceTrend?.length} emptyMessage="Not enough attendance data yet to show a trend.">
                  <AttendanceTrendChart data={attData.attendanceTrend} />
                </ChartCard>

                <ChartCard title="Attendance by Batch" empty={!attData.attendanceByBatch?.length} emptyMessage="No batch attendance data available.">
                  <AttendanceByBatchChart data={attData.attendanceByBatch} />
                </ChartCard>

                <ChartCard title="Present / Absent / Late" empty={attendanceDistributionTotal === 0} emptyMessage="No attendance data available.">
                  <AttendanceDistributionChart data={attendanceDistributionData} />
                </ChartCard>
              </div>
            </>
          )}

          {attReport.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      {['Student', 'Batch', 'Present', 'Absent', 'Attendance %', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attReport.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/20">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{r.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">{r.batchName}</td>
                        <td className="px-4 py-3 text-green-600 font-semibold">{r.presentCount ?? '—'}</td>
                        <td className="px-4 py-3 text-red-500 font-semibold">{r.absentCount ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.attendancePct >= 85 ? 'bg-green-100 text-green-700' : r.attendancePct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                            {r.attendancePct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.status || '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-purple-50/30 border-t-2 border-purple-200">
                      <td className="px-4 py-3 font-bold text-gray-700" colSpan={4}>Class Average</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${attAvg >= 85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{attAvg}%</span>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Report */}
      {tab === 'Performance' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Batch</label>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Course</label>
              <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <button onClick={loadPerformance} disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            {perfReport.length > 0 && (
              <button onClick={() => downloadCSV(perfReport, 'performance-report.csv')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
                <FileDown size={14} /> Export CSV
              </button>
            )}
          </div>

          {perfData && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Average Score" value={perfData.summary?.averageScorePct != null ? `${perfData.summary.averageScorePct}%` : '—'} color="text-purple-600" />
                <StatCard label="Assignment Completion" value={perfData.summary?.averageCompletionPct != null ? `${perfData.summary.averageCompletionPct}%` : '—'} color="text-blue-600" />
                <StatCard label="Quiz Average" value={perfData.summary?.averageQuizScorePct != null ? `${perfData.summary.averageQuizScorePct}%` : '—'} color="text-amber-600" />
                <StatCard label="Overall Performance" value={perfData.summary?.overallPerformancePct != null ? `${perfData.summary.overallPerformancePct}%` : '—'} color="text-green-600" />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <ChartCard title="Course Performance" empty={!perfData.courseBreakdown?.length} emptyMessage="No course performance data available.">
                  <CoursePerformanceChart data={perfData.courseBreakdown} />
                </ChartCard>

                <ChartCard title="Batch Performance" empty={!perfData.batchBreakdown?.length} emptyMessage="No batch performance data available.">
                  <BatchPerformanceChart data={perfData.batchBreakdown} />
                </ChartCard>

                <ChartCard title="Performance Trend" empty={!perfData.performanceTrend?.length} emptyMessage="Not enough graded submissions yet to show a trend.">
                  <PerformanceTrendChart data={perfData.performanceTrend} />
                </ChartCard>

                <ChartCard title="At-Risk Students by Reason" empty={!perfData.atRiskBreakdown?.some(b => b.count > 0)} emptyMessage="No at-risk students for the selected filters.">
                  <AtRiskBreakdownChart data={perfData.atRiskBreakdown} />
                </ChartCard>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white">Student Performance</h3>
                  <select value={selectedStudentId} onChange={e => loadStudentDetail(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Select a student…</option>
                    {perfReport.map(s => <option key={s.studentId} value={s.studentId}>{s.studentName}</option>)}
                  </select>
                </div>
                {!studentDetail ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-gray-400">Select a student above to see their course-wise performance.</p>
                  </div>
                ) : (
                  <>
                    {studentDetail.riskLevel && (
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Risk level:</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RISK_BADGE[studentDetail.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                          {studentDetail.riskLevel} {studentDetail.riskScore != null ? `(${studentDetail.riskScore}/100)` : ''}
                        </span>
                      </div>
                    )}
                    {!studentDetail.courseBreakdown?.length ? (
                      <div className="h-[200px] flex items-center justify-center">
                        <p className="text-sm text-gray-400">No graded assignments yet for this student.</p>
                      </div>
                    ) : (
                      <StudentCourseBreakdownChart data={studentDetail.courseBreakdown} />
                    )}
                    {studentDetail.progressTrend?.length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Progress Trend</p>
                        <StudentProgressTrendChart data={studentDetail.progressTrend} />
                      </div>
                    )}
                  </>
                )}
              </div>

              <TableCard
                title="Course Difficulty"
                rows={perfData.courseBreakdown || []}
                emptyMessage="No course data available."
                columns={[
                  { header: 'Course', render: c => <span className="font-semibold text-gray-800 dark:text-white">{c.courseTitle}</span> },
                  { header: 'Avg Score', render: c => c.averageScorePct != null ? `${c.averageScorePct}%` : '—' },
                  { header: 'Pass Rate', render: c => c.passRatePct != null ? `${c.passRatePct}%` : '—' },
                  { header: 'Status', render: c => c.difficultyStatus ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[c.difficultyStatus] || 'bg-gray-100 text-gray-600'}`}>{c.difficultyStatus}</span>
                  ) : '—' },
                ]}
              />

              <ChartCard title="Batch Health Comparison" empty={!batchHealth.length} emptyMessage="No batch data available.">
                <BatchHealthChart data={batchHealth} />
              </ChartCard>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Quiz Avg Score" value={quizData?.averageScorePct != null ? `${quizData.averageScorePct}%` : '—'} color="text-purple-600" />
                <StatCard label="Quiz Pass Rate" value={quizData?.passRatePct != null ? `${quizData.passRatePct}%` : '—'} color="text-green-600" />
                <StatCard label="Quiz Fail Rate" value={quizData?.failRatePct != null ? `${quizData.failRatePct}%` : '—'} color="text-red-500" />
                <StatCard label="Avg Attempts / Student" value={quizData?.averageAttemptsPerStudent ?? '—'} color="text-blue-600" />
              </div>

              <ChartCard title="Quiz Performance by Quiz" empty={!quizData?.quizBreakdown?.length} emptyMessage="No quiz attempts yet for the selected filters.">
                <QuizBreakdownChart data={quizData?.quizBreakdown} />
              </ChartCard>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Assignment Analytics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Submission Rate" value={assignmentData?.submissionRatePct != null ? `${assignmentData.submissionRatePct}%` : '—'} color="text-green-600" />
                    <StatCard label="Late Rate" value={assignmentData?.lateRatePct != null ? `${assignmentData.lateRatePct}%` : '—'} color="text-amber-600" />
                    <StatCard label="Missing Rate" value={assignmentData?.missingRatePct != null ? `${assignmentData.missingRatePct}%` : '—'} color="text-red-500" />
                    <StatCard label="Avg Score" value={assignmentData?.averageScorePct != null ? `${assignmentData.averageScorePct}%` : '—'} color="text-purple-600" />
                  </div>
                </div>

                <ChartCard title="Engagement Distribution" empty={engagementTotal === 0} emptyMessage="No engagement data available.">
                  <EngagementDistributionChart data={engagementDonutData} />
                </ChartCard>
              </div>

              <ChartCard title="Assignment Completion by Batch" empty={!assignmentData?.byBatch?.length} emptyMessage="No batch data available.">
                <AssignmentCompletionByBatchChart data={assignmentData?.byBatch} />
              </ChartCard>

              <ChartCard title="LMS Activity Trends" empty={!activityTrend.length} emptyMessage="Not enough historical data yet." height={240}>
                <ActivityTrendChart data={activityTrend} />
              </ChartCard>

              <div className="grid sm:grid-cols-2 gap-5">
                <TableCard
                  title="Top Performing Students"
                  rows={topStudents}
                  emptyMessage="No ranked students yet."
                  columns={[
                    { header: 'Rank', render: s => <span className="font-bold text-purple-600">#{s.rank}</span> },
                    { header: 'Student', render: s => <span className="font-semibold text-gray-800 dark:text-white">{s.name}</span> },
                    { header: 'Batch', render: s => <span className="text-gray-500">{s.subtitle}</span> },
                    { header: 'Score', render: s => <span className="font-semibold text-green-600">{s.score}%</span> },
                  ]}
                />
                <TableCard
                  title="Batch Leaderboard"
                  rows={batchLeaderboard}
                  emptyMessage="No batch data available."
                  columns={[
                    { header: 'Rank', render: b => <span className="font-bold text-purple-600">#{b.rank}</span> },
                    { header: 'Batch', render: b => <span className="font-semibold text-gray-800 dark:text-white">{b.name}</span> },
                    { header: 'Status', render: b => <span className="text-gray-500">{b.subtitle}</span> },
                    { header: 'Health', render: b => <span className="font-semibold text-green-600">{b.score}%</span> },
                  ]}
                />
              </div>

              <TableCard
                title="Declining Students"
                rows={decliningStudents}
                emptyMessage="No students showing a declining trend right now."
                columns={[
                  { header: 'Student', render: s => <span className="font-semibold text-gray-800 dark:text-white">{s.studentName}</span> },
                  { header: 'Batch', render: s => <span className="text-gray-500">{s.batchName}</span> },
                  { header: 'Current', render: s => `${s.currentScorePct}%` },
                  { header: 'Previous', render: s => <span className="text-gray-500">{s.previousScorePct}%</span> },
                  { header: 'Change', render: s => <span className="font-semibold text-red-500">{s.changePct}%</span> },
                  { header: 'Status', render: s => <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{s.status}</span> },
                ]}
              />

              {correlations.map(corr => (
                <ChartCard key={corr.label} title={corr.label} empty={!corr.points?.length} emptyMessage="Not enough data for this relationship yet." height={240}
                  footer={corr.points?.length > 0 && <p className="text-[11px] text-gray-400 mt-2">{corr.note}</p>}>
                  <CorrelationScatterChart points={corr.points} xLabel={corr.xLabel} yLabel={corr.yLabel} />
                </ChartCard>
              ))}
            </>
          )}

          {perfReport.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      {['Student', 'Attendance%', 'Avg Quiz', 'Assignments', 'Avg Grade', 'Risk'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perfReport.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/20">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{r.studentName}</td>
                        <td className="px-4 py-3">
                          {r.attendancePct != null ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.attendancePct >= 85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {r.attendancePct}%
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.avgQuizScore != null ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.avgQuizScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {r.avgQuizScore}%
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.assignmentsSubmitted}</td>
                        <td className="px-4 py-3 text-gray-600">{r.avgGrade > 0 ? `${r.avgGrade}%` : '—'}</td>
                        <td className="px-4 py-3">
                          {r.riskLevel ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RISK_BADGE[r.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                              {r.riskLevel}{r.riskScore != null ? ` (${r.riskScore})` : ''}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placement Report */}
      {tab === 'Placement' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Students" value={placementTotal} color="text-gray-700 dark:text-gray-200" />
            <StatCard label="Eligible (Seeking)" value={placementSeeking} color="text-blue-600" />
            <StatCard label="Interviewing" value={placementInterviewing} color="text-amber-600" />
            <StatCard label="Placed" value={placementPlaced} color="text-green-600" />
            <StatCard label="Not Placed" value={placementNotPlaced} color="text-gray-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <ChartCard title="Placement Distribution" empty={placementTotal === 0} emptyMessage="No placement data available.">
              <PlacementDistributionChart data={placementChartData} />
            </ChartCard>

            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Summary</h3>
              <div className="space-y-3">
                {placementChartData.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">{d.name}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-white">{d.count}</span>
                  </div>
                ))}
                {placementReport && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold text-green-600">
                      Conversion rate: {placementReport.conversionRate || 0}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            <ChartCard title="Placement by Batch" empty={!placementReport?.byBatch?.length} emptyMessage="No batches to compare yet.">
              <PlacementByBatchChart data={placementReport?.byBatch} />
            </ChartCard>

            <ChartCard title="Placement by Course" empty={!placementReport?.byCourse?.length} emptyMessage="No courses to compare yet.">
              <PlacementByCourseChart data={placementReport?.byCourse} />
            </ChartCard>

            <div className="sm:col-span-2">
              <ChartCard title="Placement Funnel" empty={placementTotal === 0} emptyMessage="No placement data available.">
                <PlacementFunnelChart data={funnelData} />
              </ChartCard>
            </div>
          </div>

          <TableCard
            title="Placement Readiness"
            rows={placementReadiness.slice(0, 25)}
            emptyMessage="No students to assess yet."
            note={placementReadiness.length > 25 && (
              <p className="text-[11px] text-gray-400 mt-2">Showing top 25 of {placementReadiness.length} students.</p>
            )}
            columns={[
              { header: 'Student', render: r => <span className="font-semibold text-gray-800 dark:text-white">{r.studentName}</span> },
              { header: 'Batch', render: r => <span className="text-gray-500">{r.batchName}</span> },
              { header: 'Performance', render: r => r.performancePct != null ? `${r.performancePct}%` : '—' },
              { header: 'Quiz', render: r => r.quizPct != null ? `${r.quizPct}%` : '—' },
              { header: 'Completion', render: r => r.assignmentCompletionPct != null ? `${r.assignmentCompletionPct}%` : '—' },
              { header: 'Readiness', render: r => <span className="font-semibold">{r.readinessScore != null ? `${r.readinessScore}%` : '—'}</span> },
              { header: 'Status', render: r => (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${READINESS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                  {r.status?.replace('_', ' ')}
                </span>
              ) },
            ]}
          />
        </div>
      )}

      {/* Export Tab */}
      {tab === 'Export' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { label: 'Student List', desc: 'All students with profiles, batch, placement status', icon: Users, type: 'students', file: 'students.csv' },
              { label: 'Attendance Report', desc: 'Per-student attendance breakdown', icon: BarChart2, type: 'attendance', file: 'attendance.csv' },
              { label: 'Performance Report', desc: 'Quiz scores, attendance, assignment grades', icon: FileText, type: 'performance', file: 'performance.csv' },
            ].map(({ label, desc, icon: Icon, type, file }) => (
              <div key={type} className="glass-card p-6 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Icon size={22} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-800 dark:text-white">{label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                {type === 'attendance' && (
                  <div className="space-y-2">
                    <input type="date" placeholder="Start date" onChange={e => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                    <input type="date" placeholder="End date" onChange={e => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                )}
                <div className="mt-auto flex flex-col gap-2">
                  <button
                    onClick={() => handleViewExportDetails(type, label)}
                    disabled={exportPreviewLoading === type}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-sm font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-60 transition-colors">
                    <Eye size={15} /> {exportPreviewLoading === type ? 'Loading...' : 'View Details'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const r = await reportService.export({ type, batchId: batchFilter || undefined, startDate, endDate })
                        downloadCSV(r.data || [], file)
                      } catch { toast.error('Export failed') }
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all">
                    <Download size={15} /> Download CSV
                  </button>
                </div>
              </div>
            ))}
          </div>

          {exportPreview && (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-display font-bold text-gray-800 dark:text-white">{exportPreview.label} — Details</h3>
                <button onClick={() => setExportPreview(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X size={16} />
                </button>
              </div>
              {!exportPreview.rows.length ? (
                <p className="text-sm text-gray-400 p-5">No data available for the selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-50/50 border-b border-purple-100">
                        {Object.keys(exportPreview.rows[0]).map(key => (
                          <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exportPreview.rows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/20">
                          {Object.keys(exportPreview.rows[0]).map(key => (
                            <td key={key} className="px-4 py-3 text-gray-600 whitespace-nowrap">{row[key] != null ? String(row[key]) : '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
