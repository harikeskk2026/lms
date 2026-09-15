'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  FileDown, Download, BarChart2, FileText, Users, Eye, X,
  Sparkles, Filter, ChevronLeft, ChevronRight, CheckSquare, RotateCcw,
  AlertTriangle, Target, UserCheck, Briefcase, Calendar, Search,
  Award, CheckCircle2, Check, ArrowUpRight, ArrowDownRight, Layers,
  Laptop, TrendingUp, TrendingDown, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import reportService from '@/services/reportService'
import batchService from '@/services/batchService'
import courseService from '@/services/courseService'
import { adminApi } from '@/lib/api'
import CustomSelect from '@/components/ui/CustomSelect'

const TABS = ['Attendance', 'Performance', 'Placement', 'Export']

// Dynamic SSR-free chart loaders
const noSSR = (loader) => dynamic(loader, {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-2xl bg-purple-50/50 dark:bg-gray-800/50 animate-pulse border border-purple-100/50" />
})

const AttendanceDailyTrendChart        = noSSR(() => import('@/components/admin/attendance/AttendanceTrendCharts').then(m => m.AttendanceDailyTrendChart))
const WeeklyAttendanceRateChart        = noSSR(() => import('@/components/admin/attendance/AttendanceTrendCharts').then(m => m.WeeklyAttendanceRateChart))
const MonthlyAttendanceBreakdownChart  = noSSR(() => import('@/components/admin/attendance/AttendanceTrendCharts').then(m => m.MonthlyAttendanceBreakdownChart))
const AttendanceHeatmap                = noSSR(() => import('@/components/admin/AttendanceHeatmap'))

const AttendanceTrendChart        = noSSR(() => import('@/components/admin/reports/AttendanceReportCharts').then(m => m.AttendanceTrendChart))
const AttendanceByBatchChart      = noSSR(() => import('@/components/admin/reports/AttendanceReportCharts').then(m => m.AttendanceByBatchChart))
const AttendanceDistributionChart = noSSR(() => import('@/components/admin/reports/AttendanceReportCharts').then(m => m.AttendanceDistributionChart))

const CoursePerformanceChart          = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.CoursePerformanceChart))
const BatchPerformanceChart           = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.BatchPerformanceChart))
const PerformanceTrendChart           = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.PerformanceTrendChart))
const OverallPerformanceDonut         = noSSR(() => import('@/components/admin/reports/PerformanceReportCharts').then(m => m.OverallPerformanceDonut))
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
  LOW:      'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  MEDIUM:   'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  HIGH:     'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  CRITICAL: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
}

const READINESS_BADGE = {
  READY:             'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  NEARLY_READY:      'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  NEEDS_IMPROVEMENT: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  NOT_READY:         'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  ACADEMIC_GAP:      'bg-rose-50 text-rose-600 border border-rose-200',
  ATTENDANCE_GAP:    'bg-amber-50 text-amber-600 border border-amber-200',
  BACKLOG_GAP:       'bg-purple-50 text-purple-600 border border-purple-200',
}

const ATTENDANCE_STATUS_BADGE = {
  HEALTHY:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  AT_RISK:  'bg-amber-50 text-amber-700 border border-amber-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const GRADE_STYLES = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200',
  D: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200',
}

const AVATAR_BG_COLORS = [
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
]

function downloadCSV(data, filename) {
  if (!data || !data.length) return toast.error('No data to export')
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function getPageWindow(current, total, size = 5) {
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1)
  let start = Math.max(1, current - Math.floor(size / 2))
  let end = start + size - 1
  if (end > total) {
    end = total
    start = end - size + 1
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function getGradeFromScore(score) {
  if (score == null) return { grade: 'B', status: 'Good', pill: 'bg-blue-50 text-blue-700 border-blue-200' }
  if (score >= 90) return { grade: 'A', status: 'Excellent', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (score >= 70) return { grade: 'B', status: 'Good', pill: 'bg-blue-50 text-blue-700 border-blue-200' }
  if (score >= 50) return { grade: 'C', status: 'Needs Improvement', pill: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { grade: 'D', status: 'At Risk', pill: 'bg-rose-50 text-rose-700 border-rose-200' }
}

const DEFAULT_EXPORT_COLUMNS = {
  attendance: [
    { key: 'name', label: 'Student Name' },
    { key: 'email', label: 'Email' },
    { key: 'enrollmentNo', label: 'Enrollment No' },
    { key: 'batch', label: 'Batch' },
    { key: 'attendancePct', label: 'Attendance %' },
    { key: 'total', label: 'Total Classes' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'late', label: 'Late' },
  ],
  performance: [
    { key: 'name', label: 'Student Name' },
    { key: 'assignmentsSubmitted', label: 'Assignments' },
    { key: 'avgGradePct', label: 'Avg Grade %' },
    { key: 'avgQuizScorePct', label: 'Quiz Score %' },
    { key: 'attendancePct', label: 'Attendance %' },
    { key: 'riskLevel', label: 'Risk Level' },
  ],
  placement: [
    { key: 'name', label: 'Student Name' },
    { key: 'batch', label: 'Batch' },
    { key: 'performancePct', label: 'Performance %' },
    { key: 'quizPct', label: 'Quiz %' },
    { key: 'completionPct', label: 'Completion %' },
    { key: 'readinessScore', label: 'Readiness Score' },
    { key: 'readinessStatus', label: 'Readiness' },
    { key: 'placementStatus', label: 'Placement Status' },
  ]
}

export default function ReportsPage() {
  const [tab, setTab] = useState('Attendance')
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])

  // Filter States
  const [batchFilter, setBatchFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Loading states
  const [attLoading, setAttLoading] = useState(false)
  const [perfLoading, setPerfLoading] = useState(false)
  const [placementLoading, setPlacementLoading] = useState(false)

  // Report Data States
  const [attData, setAttData] = useState(null)
  const [perfData, setPerfData] = useState(null)
  const [placementReport, setPlacementReport] = useState(null)
  const [placementReadiness, setPlacementReadiness] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentDetail, setStudentDetail] = useState(null)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)

  // Advanced Analytics States
  const [batchHealth, setBatchHealth] = useState([])
  const [quizData, setQuizData] = useState(null)
  const [assignmentData, setAssignmentData] = useState(null)
  const [engagementData, setEngagementData] = useState(null)
  const [activityTrend, setActivityTrend] = useState([])
  const [topStudents, setTopStudents] = useState([])
  const [batchLeaderboard, setBatchLeaderboard] = useState([])
  const [decliningStudents, setDecliningStudents] = useState([])
  const [correlations, setCorrelations] = useState([])
  const [showAdvancedPerf, setShowAdvancedPerf] = useState(false)

  // Table State
  const [perfSearch, setPerfSearch] = useState('')
  const [perfPage, setPerfPage] = useState(1)
  const [perfPageSize, setPerfPageSize] = useState(5)

  const [placementSearch, setPlacementSearch] = useState('')
  const [placementPage, setPlacementPage] = useState(1)
  const [placementPageSize, setPlacementPageSize] = useState(5)

  // Attendance Analytics States
  const [attAnalyticsData, setAttAnalyticsData] = useState(null)
  const [attDays, setAttDays] = useState(30)
  const [attBreakdownView, setAttBreakdownView] = useState('batch')
  const [attSearch, setAttSearch] = useState('')
  const [attPage, setAttPage] = useState(1)
  const [attPageSize, setAttPageSize] = useState(10)

  // Export Tab State
  const [selectedExportType, setSelectedExportType] = useState('attendance')
  const [selectedColumns, setSelectedColumns] = useState(
    DEFAULT_EXPORT_COLUMNS.attendance.map(c => c.key)
  )
  const [exportPreview, setExportPreview] = useState(null)
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false)
  const [recentExports, setRecentExports] = useState([
    {
      id: 1,
      type: 'Attendance',
      filters: 'All Batches, All Courses',
      exportedBy: 'Admin',
      dateTime: '10 Sep 2026, 11:15 AM',
      format: 'CSV',
      dataRef: 'attendance'
    },
    {
      id: 2,
      type: 'Performance',
      filters: 'All Batches, All Courses',
      exportedBy: 'Admin',
      dateTime: '09 Sep 2026, 04:30 PM',
      format: 'CSV',
      dataRef: 'performance'
    },
    {
      id: 3,
      type: 'Placement',
      filters: 'All Batches',
      exportedBy: 'Admin',
      dateTime: '08 Sep 2026, 10:20 AM',
      format: 'CSV',
      dataRef: 'placement'
    }
  ])

  // Initial Data Load (Batches, Courses, Trainers)
  useEffect(() => {
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    reportService.getBatchLeaderboard().then(r => setBatchLeaderboard(r.data || [])).catch(() => {})
  }, [])

  // Batches scoped to the selected course; falls back to all batches when no course is selected
  const filteredBatches = useMemo(() => {
    if (!courseFilter) return batches
    return batches.filter(b => String(b.course?.id ?? b.courseId) === String(courseFilter))
  }, [batches, courseFilter])

  // Clear the batch filter if it no longer belongs to the newly selected course.
  // Depends on `batches` too, since courseFilter can be set before the initial batch fetch resolves.
  useEffect(() => {
    if (!courseFilter || !batchFilter) return
    if (!filteredBatches.some(b => String(b.id) === String(batchFilter))) {
      setBatchFilter('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseFilter, batches])

  // Auto-reload on filter updates
  useEffect(() => {
    loadAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter, courseFilter, startDate, endDate, attDays])

  useEffect(() => {
    loadPerformance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter, courseFilter, startDate, endDate])

  useEffect(() => {
    loadPlacement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter, courseFilter])

  // Sync columns when export type changes
  useEffect(() => {
    const defaultCols = DEFAULT_EXPORT_COLUMNS[selectedExportType] || []
    setSelectedColumns(defaultCols.map(c => c.key))
    setExportPreview(null)
  }, [selectedExportType])

  const loadAttendance = async () => {
    setAttLoading(true)
    setAttPage(1)
    try {
      const [r, analyticsRes] = await Promise.all([
        reportService.getAttendance({
          batchId: batchFilter || undefined,
          courseId: courseFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        adminApi.getAttendanceAnalytics({
          days: attDays || 30,
          ...(batchFilter ? { batchId: batchFilter } : {}),
          ...(courseFilter ? { courseId: courseFilter } : {})
        }).catch(() => ({ data: { data: null } }))
      ])
      setAttData(r.data)
      if (analyticsRes?.data?.data) {
        setAttAnalyticsData(analyticsRes.data.data)
      }
    } catch {
      toast.error('Failed to load attendance report')
    } finally {
      setAttLoading(false)
    }
  }

  const loadPerformance = async () => {
    setPerfLoading(true)
    setPerfPage(1)
    try {
      const params = {
        batchId: batchFilter || undefined,
        courseId: courseFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
      const [perf, health, quiz, assignments, engagement, trend, top, declining, corr] = await Promise.all([
        reportService.getPerformance(params),
        reportService.getBatchHealth(batchFilter || undefined).catch(() => ({ data: [] })),
        reportService.getQuizAnalytics(params).catch(() => ({ data: null })),
        reportService.getAssignmentAnalytics({ batchId: params.batchId }).catch(() => ({ data: null })),
        reportService.getEngagement({ batchId: params.batchId }).catch(() => ({ data: null })),
        reportService.getActivityTrend().catch(() => ({ data: [] })),
        reportService.getTopStudents({ batchId: params.batchId, limit: 10 }).catch(() => ({ data: [] })),
        reportService.getDecliningStudents({ batchId: params.batchId }).catch(() => ({ data: [] })),
        reportService.getCorrelations({ batchId: params.batchId }).catch(() => ({ data: [] })),
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
    } catch {
      toast.error('Failed to load performance report')
    } finally {
      setPerfLoading(false)
    }
  }

  const loadPlacement = async () => {
    setPlacementLoading(true)
    setPlacementPage(1)
    try {
      const [placement, readiness] = await Promise.all([
        reportService.getPlacement({ batchId: batchFilter || undefined, courseId: courseFilter || undefined }),
        reportService.getPlacementReadiness({ batchId: batchFilter || undefined, courseId: courseFilter || undefined }),
      ])
      setPlacementReport(placement.data)
      setPlacementReadiness(readiness.data || [])
    } catch {
      toast.error('Failed to load placement data')
    } finally {
      setPlacementLoading(false)
    }
  }

  const loadStudentDetail = async (studentId) => {
    setSelectedStudentId(studentId)
    if (!studentId) {
      setStudentDetail(null)
      setIsStudentModalOpen(false)
      return
    }
    try {
      const r = await reportService.getStudentPerformance(studentId)
      setStudentDetail(r.data)
      setIsStudentModalOpen(true)
    } catch {
      toast.error('Failed to load student performance details')
    }
  }

  const handlePreviewExport = async () => {
    setExportPreviewLoading(true)
    try {
      const r = await reportService.export({
        type: selectedExportType,
        batchId: batchFilter || undefined,
        courseId: courseFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      const rows = r.data || []
      setExportPreview({
        type: selectedExportType,
        total: rows.length,
        rows: rows.slice(0, 10),
      })
      if (!rows.length) {
        toast('No records found matching filters', { icon: 'ℹ️' })
      } else {
        toast.success(`Previewing ${Math.min(10, rows.length)} of ${rows.length} records`)
      }
    } catch {
      toast.error('Failed to fetch export preview')
    } finally {
      setExportPreviewLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const r = await reportService.export({
        type: selectedExportType,
        batchId: batchFilter || undefined,
        courseId: courseFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      const data = r.data || []
      if (!data.length) {
        return toast.error('No records available to export for selected filters')
      }

      // Filter by selected columns
      const filteredData = data.map(item => {
        if (!selectedColumns.length) return item
        const row = {}
        selectedColumns.forEach(col => {
          row[col] = item[col] ?? '—'
        })
        return row
      })

      downloadCSV(filteredData, `${selectedExportType}-report.csv`)
      toast.success('Report downloaded successfully')

      // Record export in dynamic log
      const newEntry = {
        id: Date.now(),
        type: selectedExportType.charAt(0).toUpperCase() + selectedExportType.slice(1),
        filters: [
          batchFilter ? `Batch: ${batches.find(b => b.id === batchFilter)?.name || batchFilter}` : 'All Batches',
          courseFilter ? `Course: ${courses.find(c => c.id === courseFilter)?.title || courseFilter}` : 'All Courses'
        ].filter(Boolean).join(', '),
        exportedBy: 'Admin',
        dateTime: new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        format: 'CSV',
        dataRef: selectedExportType,
      }
      setRecentExports(prev => [newEntry, ...prev.slice(0, 4)])
    } catch {
      toast.error('Export failed')
    }
  }

  // Pure dynamic performance calculations
  const perfReport = perfData?.students || []
  const perfFiltered = useMemo(() => {
    if (!perfSearch.trim()) return perfReport
    const q = perfSearch.toLowerCase()
    return perfReport.filter(s =>
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.batchName && s.batchName.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    )
  }, [perfReport, perfSearch])

  const perfTotalPages = Math.max(1, Math.ceil(perfFiltered.length / perfPageSize))
  const perfPaginated = perfFiltered.slice((perfPage - 1) * perfPageSize, perfPage * perfPageSize)

  // Overall Performance Donut: Calculated dynamically from live student grades
  const perfDonutData = useMemo(() => {
    let exc = 0, gd = 0, ni = 0, ar = 0
    perfReport.forEach(s => {
      const score = s.overallPerformancePct ?? s.avgGrade ?? s.avgQuizScore ?? 0
      if (score >= 90) exc++
      else if (score >= 70) gd++
      else if (score >= 50) ni++
      else ar++
    })
    return [
      { name: 'Excellent (≥ 90%)', value: exc, fill: '#10b981', color: 'text-emerald-600', dot: 'bg-emerald-500' },
      { name: 'Good (70% - 89%)', value: gd, fill: '#6366f1', color: 'text-indigo-600', dot: 'bg-indigo-500' },
      { name: 'Needs Improvement (50% - 69%)', value: ni, fill: '#f59e0b', color: 'text-amber-600', dot: 'bg-amber-500' },
      { name: 'At Risk (< 50%)', value: ar, fill: '#ef4444', color: 'text-rose-600', dot: 'bg-rose-500' },
    ]
  }, [perfReport])

  const dynamicPerfAvgScore = useMemo(() => {
    if (perfData?.summary?.averageScorePct != null) return perfData.summary.averageScorePct
    if (!perfReport.length) return 0
    const total = perfReport.reduce((acc, s) => acc + (s.overallPerformancePct ?? s.avgGrade ?? s.avgQuizScore ?? 0), 0)
    return Math.round(total / perfReport.length)
  }, [perfData, perfReport])

  const perfTotalStudents = perfData?.summary?.totalStudents ?? perfReport.length
  const perfTotalAssessments = useMemo(() => {
    if (assignmentData?.totalAssignments != null) return assignmentData.totalAssignments
    if (perfData?.courseBreakdown?.length) {
      return perfData.courseBreakdown.reduce((acc, c) => acc + (c.assignmentCount || 0), 0)
    }
    return perfReport.reduce((acc, s) => acc + (s.assignmentsSubmitted || 0), 0)
  }, [assignmentData, perfData, perfReport])

  const perfBelow50Count = useMemo(() => {
    return perfReport.filter(s => (s.overallPerformancePct ?? s.avgGrade ?? s.avgQuizScore ?? 0) < 50).length
  }, [perfReport])

  // Pure dynamic placement calculations
  const placementSeeking = placementReport?.statusCounts?.SEEKING ?? placementReadiness.filter(r => r.status === 'READY').length
  const placementInterviewing = placementReport?.statusCounts?.INTERVIEWING ?? placementReadiness.filter(r => r.status === 'NEARLY_READY').length
  const placementPlaced = placementReport?.statusCounts?.PLACED ?? placementReadiness.filter(r => r.currentPlacementStatus === 'PLACED').length
  const placementNotSeeking = placementReport?.statusCounts?.NOT_SEEKING ?? placementReadiness.filter(r => r.currentPlacementStatus === 'NOT_SEEKING').length
  const placementTotal = (placementSeeking + placementInterviewing + placementPlaced + placementNotSeeking) || placementReadiness.length

  const placementChartData = useMemo(() => [
    { name: 'Seeking', count: placementSeeking, fill: '#3b82f6', dot: 'bg-blue-500' },
    { name: 'Interviewing', count: placementInterviewing, fill: '#f59e0b', dot: 'bg-amber-500' },
    { name: 'Placed', count: placementPlaced, fill: '#10b981', dot: 'bg-emerald-500' },
    { name: 'Not Seeking', count: placementNotSeeking, fill: '#9ca3af', dot: 'bg-gray-400' },
  ], [placementSeeking, placementInterviewing, placementPlaced, placementNotSeeking])

  const dynamicFunnelData = useMemo(() => {
    const total = placementTotal || 1
    const active = placementSeeking + placementInterviewing + placementPlaced
    const inInterviews = placementInterviewing + placementPlaced
    return [
      { name: 'Total Students', value: placementTotal, pct: '100%', fill: '#6366f1' },
      { name: 'Eligible & Active', value: active, pct: `${Math.round((active / total) * 100)}%`, fill: '#3b82f6' },
      { name: 'Interviewing / Placed', value: inInterviews, pct: `${Math.round((inInterviews / total) * 100)}%`, fill: '#f59e0b' },
      { name: 'Selected (Placed)', value: placementPlaced, pct: `${Math.round((placementPlaced / total) * 100)}%`, fill: '#10b981' },
    ]
  }, [placementTotal, placementSeeking, placementInterviewing, placementPlaced])

  const placementFiltered = useMemo(() => {
    if (!placementSearch.trim()) return placementReadiness
    const q = placementSearch.toLowerCase()
    return placementReadiness.filter(s =>
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.batchName && s.batchName.toLowerCase().includes(q))
    )
  }, [placementReadiness, placementSearch])

  const placementTotalPages = Math.max(1, Math.ceil(placementFiltered.length / placementPageSize))
  const placementPaginated = placementFiltered.slice((placementPage - 1) * placementPageSize, placementPage * placementPageSize)

  // Dynamic attendance calculations
  const attReport = attData?.students || []
  const attFiltered = useMemo(() => {
    if (!attSearch.trim()) return attReport
    const q = attSearch.toLowerCase()
    return attReport.filter(s =>
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.batchName && s.batchName.toLowerCase().includes(q))
    )
  }, [attReport, attSearch])
  const attTotalPages = Math.max(1, Math.ceil(attFiltered.length / attPageSize))
  const attPaginated = attFiltered.slice((attPage - 1) * attPageSize, attPage * attPageSize)
  const ATTENDANCE_STATUS_COLOR = { PRESENT: '#10b981', ABSENT: '#ef4444', LATE: '#f59e0b', EXCUSED: '#9ca3af' }
  const attendanceDistributionData = useMemo(() => (attData?.attendanceDistribution || [])
    .map(d => ({ name: d.status, value: d.count, fill: ATTENDANCE_STATUS_COLOR[d.status] || '#9ca3af' })), [attData])

  // Day-of-week analysis for Attendance
  const mostAbsentDay = useMemo(() => {
    if (!attAnalyticsData?.dailyTrend?.length) return null
    const dowAvgs = {}
    for (const d of attAnalyticsData.dailyTrend) {
      if (!d.total || d.total === 0) continue
      const dow = new Date(d.date).getDay()
      if (!dowAvgs[dow]) dowAvgs[dow] = { total: 0, count: 0 }
      dowAvgs[dow].total += d.pct
      dowAvgs[dow].count++
    }
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const sorted = Object.entries(dowAvgs).sort(([, a], [, b]) => (a.total / a.count) - (b.total / b.count))
    if (sorted.length) {
      const [dow, stat] = sorted[0]
      return `${DAYS[dow]} (avg ${Math.round(stat.total / stat.count)}%)`
    }
    return null
  }, [attAnalyticsData])

  const totalClassesTracked = useMemo(() => {
    return attAnalyticsData?.dailyTrend?.filter(d => (d.total > 0 || d.classTitle))?.length || attData?.totalClasses || 0
  }, [attAnalyticsData, attData])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans antialiased">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Reports &amp; Analytics
        </h1>
      </div>

      {/* Navigation Tabs Pill Bar & Secondary Analytics Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-white/90 dark:bg-gray-900/80 p-1.5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs max-w-fit overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                tab === t
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-300 dark:shadow-none'
                  : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50/60 dark:hover:bg-purple-950/30'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Secondary Analytics Toggle Button in top bar near tabs */}
        {(tab === 'Performance' || tab === 'Placement') && (
          <button
            onClick={() => setShowAdvancedPerf(!showAdvancedPerf)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <Layers size={14} />
            {showAdvancedPerf ? 'Hide Secondary Analytics' : 'Show Secondary Analytics & Breakdown'}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTENDANCE REPORT & ANALYTICS                                      */}
      {/* ========================================================================= */}
      {tab === 'Attendance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Subheader & description */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Attendance Report &amp; Analytics
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comprehensive attendance trends, mode analysis, trainer performance, batch breakdown, and student records.
            </p>
          </div>

          {/* Dynamic Filter Bar */}
          <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              {/* Quick Days Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Timeframe</label>
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                  {[7, 30, 90].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAttDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        attDays === d
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300'
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Course */}
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Course</label>
                <CustomSelect
                  value={courseFilter}
                  onChange={(val) => setCourseFilter(val)}
                  options={courses.map(c => ({ value: c.id, label: c.title }))}
                  placeholder="All Courses"
                  compact
                  searchable={courses.length >= 10}
                />
              </div>

              {/* Batch */}
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Batch</label>
                <CustomSelect
                  value={batchFilter}
                  onChange={(val) => setBatchFilter(val)}
                  options={filteredBatches.map(b => ({ value: b.id, label: b.name }))}
                  placeholder="All Batches"
                  compact
                  searchable={filteredBatches.length >= 10}
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Date Range</label>
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 shadow-2xs">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent outline-none w-28 text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent outline-none w-28 text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadAttendance}
                disabled={attLoading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {attLoading ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                onClick={() => loadAttendance()}
                disabled={attLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-gray-700/50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                title="Refresh attendance data"
              >
                <RotateCcw size={13} className={attLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* 5 Dynamic Attendance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Overall Rate */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
                <TrendingUp size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {attAnalyticsData?.overallPct ?? attData?.summary?.averageScorePct ?? 0}%
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Overall Attendance</p>
              </div>
            </div>

            {/* Card 2: Total Students */}
            <div className="glass-card p-5 rounded-2xl border border-blue-100/60 dark:border-blue-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {attData?.summary?.totalStudents ?? attReport.length ?? 0}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Students</p>
              </div>
            </div>

            {/* Card 3: Total Classes Tracked */}
            <div className="glass-card p-5 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                <BookOpen size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {totalClassesTracked}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Classes Tracked</p>
              </div>
            </div>

            {/* Card 4: Most Absent Day */}
            <div className="glass-card p-5 rounded-2xl border border-amber-100/60 dark:border-amber-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingDown size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white font-display truncate block">
                  {mostAbsentDay || '—'}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Most Absent Day</p>
              </div>
            </div>

            {/* Card 5: Low Attendance */}
            <div className="glass-card p-5 rounded-2xl border border-rose-100/60 dark:border-rose-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {attData?.lowAttendanceCount ?? 0}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Below 75% Threshold</p>
              </div>
            </div>
          </div>

          {/* Area Chart — Attendance Daily Trend */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs">
            <AttendanceDailyTrendChart data={attAnalyticsData?.dailyTrend || []} days={attDays} />
          </div>

          {/* Attendance by Class Mode */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs">
            <div className="mb-4">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Attendance by Class Mode</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Compare attendance by online and offline classes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Online Classes Card */}
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs transition-all hover:shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0 shadow-inner">
                  <Laptop size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    Online Classes
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                    {attAnalyticsData?.modeAttendance?.onlineAvgPct ?? 0}%
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Avg Attendance
                  </p>
                  <p className="text-sm font-extrabold text-gray-800 dark:text-gray-100 leading-none mt-3">
                    {attAnalyticsData?.modeAttendance?.onlineConducted ?? 0} / {attAnalyticsData?.modeAttendance?.onlineTotal ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Classes Conducted
                  </p>
                </div>
              </div>

              {/* Offline Classes Card */}
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs transition-all hover:shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0 shadow-inner">
                  <Users size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                    Offline Classes
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                    {attAnalyticsData?.modeAttendance?.offlineAvgPct ?? 0}%
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Avg Attendance
                  </p>
                  <p className="text-sm font-extrabold text-gray-800 dark:text-gray-100 leading-none mt-3">
                    {attAnalyticsData?.modeAttendance?.offlineConducted ?? 0} / {attAnalyticsData?.modeAttendance?.offlineTotal ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Classes Conducted
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Breakdown — Batch / Weekly / Monthly (single tab, switched via dropdown) */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Attendance Breakdown</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {attBreakdownView === 'batch' && 'Compare attendance across all batches'}
                  {attBreakdownView === 'weekly' && 'Weekly attendance rate trend'}
                  {attBreakdownView === 'monthly' && 'Monthly attendance breakdown'}
                </p>
              </div>
              <div className="w-full sm:w-56">
                <CustomSelect
                  value={attBreakdownView}
                  onChange={(val) => setAttBreakdownView(val)}
                  options={[
                    { value: 'batch', label: 'Attendance by Batch' },
                    { value: 'weekly', label: 'Weekly Attendance Rate' },
                    { value: 'monthly', label: 'Monthly Breakdown' },
                  ]}
                  compact
                />
              </div>
            </div>

            {attBreakdownView === 'batch' && (
              <div className="overflow-x-auto overflow-y-auto max-h-[360px]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <th className="pb-3 font-semibold">Batch Name</th>
                      <th className="pb-3 font-semibold text-center">Classes Conducted</th>
                      <th className="pb-3 font-semibold min-w-[140px] text-right">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 text-xs">
                    {(!attAnalyticsData?.batchAttendance || attAnalyticsData.batchAttendance.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-xs text-gray-400">No batch attendance data for this period</td>
                      </tr>
                    ) : (
                      attAnalyticsData.batchAttendance.map((b, idx) => {
                        const colors = [
                          'bg-emerald-500',
                          'bg-purple-600',
                          'bg-blue-500',
                          'bg-amber-500',
                          'bg-pink-500',
                          'bg-indigo-500'
                        ]
                        const barColor = colors[idx % colors.length]
                        return (
                          <tr key={b.batchId || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="py-3.5 font-bold text-gray-800 dark:text-gray-200">{b.batchName}</td>
                            <td className="py-3.5 text-center text-gray-600 dark:text-gray-300 font-medium">{b.classesConducted}</td>
                            <td className="py-3.5">
                              <div className="flex items-center justify-end gap-3">
                                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-1 max-w-[120px]">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                    style={{ width: `${Math.min(100, Math.max(0, b.attendancePct))}%` }}
                                  />
                                </div>
                                <span className="font-extrabold text-xs text-gray-800 dark:text-gray-200 min-w-[32px] text-right">
                                  {b.attendancePct}%
                                </span>
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

            {attBreakdownView === 'weekly' && (
              <WeeklyAttendanceRateChart data={attAnalyticsData?.weeklyTrend || []} />
            )}

            {attBreakdownView === 'monthly' && (
              <MonthlyAttendanceBreakdownChart data={attAnalyticsData?.monthlyTrend || []} />
            )}
          </div>

          {/* Heatmap */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs">
            <AttendanceHeatmap dailyTrend={attAnalyticsData?.dailyTrend || []} />
          </div>

          {/* Student-Level Detailed Attendance Breakdown Table */}
          {attReport.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden border border-purple-100/60 shadow-xs">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Student Attendance Records</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Detailed breakdown of individual student attendance</p>
                </div>
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={attSearch}
                    onChange={e => {
                      setAttSearch(e.target.value)
                      setAttPage(1)
                    }}
                    className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30">
                      {['Student', 'Batch', 'Present', 'Absent', 'Attendance %', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attPaginated.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-gray-400">No student records match search filters</td>
                      </tr>
                    ) : (
                      attPaginated.map((r, i) => (
                        <tr key={i} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.studentName}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.batchName}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{r.presentCount ?? '—'}</td>
                          <td className="px-4 py-3 text-rose-500 font-semibold">{r.absentCount ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${r.attendancePct >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : r.attendancePct >= 70 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                              {r.attendancePct != null ? `${r.attendancePct}%` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {r.status ? (
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${ATTENDANCE_STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                                {r.status.replace('_', ' ')}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Attendance Pagination Controls */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {attFiltered.length > 0 ? (attPage - 1) * attPageSize + 1 : 0} to {Math.min(attPage * attPageSize, attFiltered.length)} of {attFiltered.length} students
                  </span>
                  <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200 dark:border-gray-700">
                    <span className="text-gray-400 font-medium">Rows:</span>
                    <select
                      value={attPageSize}
                      onChange={(e) => {
                        setAttPageSize(Number(e.target.value))
                        setAttPage(1)
                      }}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-200 font-semibold outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
                    >
                      {[5, 10, 20, 50, 100].map(sz => (
                        <option key={sz} value={sz}>{sz} rows</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAttPage(p => Math.max(1, p - 1))}
                    disabled={attPage === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {getPageWindow(attPage, attTotalPages).map(p => (
                    <button
                      key={p}
                      onClick={() => setAttPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        attPage === p
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {attTotalPages > 5 && <span className="px-1 text-gray-400">...</span>}
                  {attTotalPages > 5 && (
                    <button
                      onClick={() => setAttPage(attTotalPages)}
                      className="w-7 h-7 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
                    >
                      {attTotalPages}
                    </button>
                  )}
                  <button
                    onClick={() => setAttPage(p => Math.min(attTotalPages, p + 1))}
                    disabled={attPage === attTotalPages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERFORMANCE REPORT (Image 1 Dynamic)                              */}
      {/* ========================================================================= */}
      {tab === 'Performance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Subheader */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display">Performance Report</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Analyze student performance across quizzes, assignments, tests, and projects.
            </p>
          </div>

          {/* Dynamic Filter Bar */}
          <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              {/* Course */}
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Course</label>
                <CustomSelect
                  value={courseFilter}
                  onChange={(val) => setCourseFilter(val)}
                  options={courses.map(c => ({ value: c.id, label: c.title }))}
                  placeholder="All Courses"
                  compact
                  searchable={courses.length >= 10}
                />
              </div>

              {/* Batch */}
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Batch</label>
                <CustomSelect
                  value={batchFilter}
                  onChange={(val) => setBatchFilter(val)}
                  options={filteredBatches.map(b => ({ value: b.id, label: b.name }))}
                  placeholder="All Batches"
                  compact
                  searchable={filteredBatches.length >= 10}
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Date Range</label>
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 shadow-2xs">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent outline-none w-28 text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent outline-none w-28 text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadPerformance}
                disabled={perfLoading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {perfLoading ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                onClick={() => loadPerformance()}
                disabled={perfLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-gray-700/50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                title="Refresh report data"
              >
                <RotateCcw size={13} className={perfLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* 4 Dynamic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Average Score */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
                <BarChart2 size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {dynamicPerfAvgScore}%
                </span>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Average Score</p>
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                  <span>Class Performance Index</span>
                </p>
              </div>
            </div>

            {/* Card 2: Total Students */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {perfTotalStudents}
                </span>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">Active enrolled</p>
              </div>
            </div>

            {/* Card 3: Total Assessments */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {perfTotalAssessments}
                </span>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Assessments</p>
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                  <span>Quizzes &amp; Assignments</span>
                </p>
              </div>
            </div>

            {/* Card 4: Students Below 50% */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="min-w-0">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {perfBelow50Count}
                </span>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Students Below 50%</p>
                <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-0.5 mt-0.5">
                  <span>Requires Attention</span>
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row: Performance Trend (Left) + Overall Performance (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Performance Trend */}
            <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Performance Trend</h3>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300">
                  Average Score
                </div>
              </div>
              <PerformanceTrendChart data={perfData?.performanceTrend} />
            </div>

            {/* Right: Overall Performance Donut & Bracket Breakdown */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80 flex flex-col justify-between">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm mb-2">Overall Performance</h3>
              <OverallPerformanceDonut data={perfDonutData} avgScore={dynamicPerfAvgScore} />
              <div className="space-y-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                {perfDonutData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {item.value} ({perfTotalStudents > 0 ? Math.round((item.value / perfTotalStudents) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Analytics & Breakdown (Expandable below Primary Charts) */}
          {showAdvancedPerf && (
            <div className="space-y-5 pt-2 animate-in fade-in duration-200">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="glass-card p-5 rounded-2xl border border-purple-100/60 shadow-xs bg-white/90 dark:bg-gray-900/80">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 text-sm">Course Performance</h3>
                  <CoursePerformanceChart data={perfData?.courseBreakdown} />
                </div>
                <div className="glass-card p-5 rounded-2xl border border-purple-100/60 shadow-xs bg-white/90 dark:bg-gray-900/80">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 text-sm">Batch Performance</h3>
                  <BatchPerformanceChart data={perfData?.batchBreakdown} />
                </div>
              </div>

              {batchHealth.length > 0 && (
                <div className="glass-card p-5 rounded-2xl border border-purple-100/60 shadow-xs bg-white/90 dark:bg-gray-900/80">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 text-sm">Batch Health Comparison</h3>
                  <BatchHealthChart data={batchHealth} />
                </div>
              )}

              {quizData?.quizBreakdown?.length > 0 && (
                <div className="glass-card p-5 rounded-2xl border border-purple-100/60 shadow-xs bg-white/90 dark:bg-gray-900/80">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 text-sm">Quiz Breakdown</h3>
                  <QuizBreakdownChart data={quizData.quizBreakdown} />
                </div>
              )}
            </div>
          )}

          {/* Student Performance Table */}
          <div className="glass-card rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs overflow-hidden bg-white/90 dark:bg-gray-900/80">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Student Performance</h3>
              </div>
              <div className="relative min-w-[260px] sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or enrollment ID..."
                  value={perfSearch}
                  onChange={e => {
                    setPerfSearch(e.target.value)
                    setPerfPage(1)
                  }}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Batch</th>
                    <th className="px-4 py-3 text-center">Quizzes (Avg)</th>
                    <th className="px-4 py-3 text-center">Assignments (Avg)</th>
                    <th className="px-4 py-3 text-center">Tests (Avg)</th>
                    <th className="px-4 py-3 text-center">Overall Score</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {perfPaginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400">
                        No student performance records found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    perfPaginated.map((s, idx) => {
                      const rowNum = (perfPage - 1) * perfPageSize + idx + 1
                      const score = s.overallPerformancePct ?? s.avgGrade ?? s.avgQuizScore ?? 0
                      const { grade, status, pill } = getGradeFromScore(score)
                      const avatarBg = AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length]
                      const initial = s.studentName ? s.studentName.trim().charAt(0).toUpperCase() : 'S'

                      return (
                        <tr key={s.studentId || idx} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors">
                          <td className="px-4 py-3.5 text-gray-400 font-medium">{rowNum}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${avatarBg}`}>
                                {initial}
                              </div>
                              <span className="font-semibold text-gray-900 dark:text-white">{s.studentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400">{s.batchName || '—'}</td>
                          <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">
                            {s.avgQuizScore != null ? `${s.avgQuizScore}%` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">
                            {s.avgGrade != null && s.avgGrade > 0 ? `${s.avgGrade}%` : (s.assignmentsSubmitted > 0 ? `${s.assignmentsSubmitted} done` : '—')}
                          </td>
                          <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">
                            {s.avgGrade != null ? `${s.avgGrade}%` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-gray-900 dark:text-white">
                            {score}%
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${GRADE_STYLES[grade] || GRADE_STYLES.B}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${pill}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => loadStudentDetail(s.studentId)}
                              className="px-3 py-1 text-xs font-semibold rounded-lg text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span>
                  Showing {perfFiltered.length > 0 ? (perfPage - 1) * perfPageSize + 1 : 0} to {Math.min(perfPage * perfPageSize, perfFiltered.length)} of {perfFiltered.length} students
                </span>
                <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Rows:</span>
                  <select
                    value={perfPageSize}
                    onChange={(e) => {
                      setPerfPageSize(Number(e.target.value))
                      setPerfPage(1)
                    }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-200 font-semibold outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    {[5, 10, 20, 50, 100].map(sz => (
                      <option key={sz} value={sz}>{sz} rows</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPerfPage(p => Math.max(1, p - 1))}
                  disabled={perfPage === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                {getPageWindow(perfPage, perfTotalPages).map(p => (
                  <button
                    key={p}
                    onClick={() => setPerfPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      perfPage === p
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {perfTotalPages > 5 && <span className="px-1 text-gray-400">...</span>}
                {perfTotalPages > 5 && (
                  <button
                    onClick={() => setPerfPage(perfTotalPages)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
                  >
                    {perfTotalPages}
                  </button>
                )}
                <button
                  onClick={() => setPerfPage(p => Math.min(perfTotalPages, p + 1))}
                  disabled={perfPage === perfTotalPages}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLACEMENT REPORT (Image 2 Dynamic)                                */}
      {/* ========================================================================= */}
      {tab === 'Placement' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Subheader */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display">Placement Report</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Placement readiness, drive eligibility and student movement funnel.
            </p>
          </div>

          {/* Dynamic Filter Bar */}
          <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              {/* Course */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Course</label>
                <CustomSelect
                  value={courseFilter}
                  onChange={(val) => setCourseFilter(val)}
                  options={courses.map(c => ({ value: c.id, label: c.title }))}
                  placeholder="All Courses"
                  compact
                  searchable={courses.length >= 10}
                />
              </div>

              {/* Batch */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Batch</label>
                <CustomSelect
                  value={batchFilter}
                  onChange={(val) => setBatchFilter(val)}
                  options={filteredBatches.map(b => ({ value: b.id, label: b.name }))}
                  placeholder="All Batches"
                  compact
                  searchable={filteredBatches.length >= 10}
                />
              </div>

              {/* Date Lite */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Date lite</label>
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 shadow-2xs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent outline-none w-28 text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
                  />
                  <span className="text-gray-400">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent outline-none w-28 text-xs text-gray-700 dark:text-gray-200 cursor-pointer"
                  />
                  <Calendar size={14} className="text-gray-400 ml-1" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadPlacement}
                disabled={placementLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {placementLoading ? 'Applying...' : 'Apply Filters'}
              </button>
              <button
                onClick={() => {
                  setBatchFilter('')
                  setCourseFilter('')
                  setStartDate('')
                  setEndDate('')
                  loadPlacement()
                }}
                className="flex items-center gap-1 px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>
          </div>

          {/* 4 Dynamic Placement KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Students */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {placementTotal}
                </span>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">Across selected filters</p>
              </div>
            </div>

            {/* Card 2: Placement Ready */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                <Target size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Placement Ready</p>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {placementSeeking}
                </span>
                <p className="text-[11px] font-medium text-emerald-600 font-semibold mt-0.5">
                  {placementTotal > 0 ? Math.round((placementSeeking / placementTotal) * 100) : 0}% of students
                </p>
              </div>
            </div>

            {/* Card 3: Drive Eligible */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                <UserCheck size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Drive Eligible</p>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {placementInterviewing}
                </span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                  {placementTotal > 0 ? Math.round((placementInterviewing / placementTotal) * 100) : 0}% of students
                </p>
              </div>
            </div>

            {/* Card 4: Selected */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 shadow-xs flex items-center gap-4 bg-white/80 dark:bg-gray-900/80">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center shrink-0">
                <Briefcase size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Selected</p>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">
                  {placementPlaced}
                </span>
                <p className="text-[11px] font-medium text-rose-500 font-semibold mt-0.5">
                  {placementTotal > 0 ? Math.round((placementPlaced / placementTotal) * 100) : 0}% of students
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Placement Distribution + Placement by Batch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Placement Distribution */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80">
              <div className="mb-2">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Placement Distribution</h3>
                <p className="text-xs text-gray-500">Current placement status of students</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <PlacementDistributionChart data={placementChartData} total={placementTotal} />
                <div className="space-y-2.5 text-xs">
                  {placementChartData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.count} ({placementTotal > 0 ? Math.round((item.count / placementTotal) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Placement by Batch */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80">
              <div className="mb-2">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Placement by Batch</h3>
                <p className="text-xs text-gray-500">Placement ready percentage across batches</p>
              </div>
              <PlacementByBatchChart data={placementReport?.byBatch} />
            </div>
          </div>

          {/* Charts Row 2: Placement by Course + Placement Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Placement by Course */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80">
              <div className="mb-2">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Placement by Course</h3>
                <p className="text-xs text-gray-500">Placement ready percentage across courses</p>
              </div>
              <PlacementByCourseChart data={placementReport?.byCourse} />
            </div>

            {/* Placement Funnel */}
            <div className="glass-card p-5 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80">
              <div className="mb-2">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Placement Funnel</h3>
                <p className="text-xs text-gray-500">Student movement through the placement process</p>
              </div>
              <PlacementFunnelChart data={dynamicFunnelData} />
            </div>
          </div>

          {/* Student Placement Readiness Table */}
          <div className="glass-card rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs overflow-hidden bg-white/90 dark:bg-gray-900/80">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Student Placement Readiness</h3>
                <p className="text-xs text-gray-500">List of students with eligibility and placement status</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={placementSearch}
                    onChange={e => {
                      setPlacementSearch(e.target.value)
                      setPlacementPage(1)
                    }}
                    className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={() => downloadCSV(placementFiltered, 'placement-readiness.csv')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-semibold hover:bg-purple-50 cursor-pointer"
                >
                  <Download size={13} /> Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Student Name</th>
                    <th className="px-4 py-3 text-left">Batch</th>
                    <th className="px-4 py-3 text-center">Performance %</th>
                    <th className="px-4 py-3 text-center">Quiz %</th>
                    <th className="px-4 py-3 text-center">Completion %</th>
                    <th className="px-4 py-3 text-center">Readiness Score</th>
                    <th className="px-4 py-3 text-center">Readiness Status</th>
                    <th className="px-4 py-3 text-center">Placement Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {placementPaginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400">
                        No placement readiness data found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    placementPaginated.map((r, idx) => {
                      const rowNum = (placementPage - 1) * placementPageSize + idx + 1
                      const readinessBadge = READINESS_BADGE[r.status] || READINESS_BADGE.READY

                      return (
                        <tr key={r.studentId || idx} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors">
                          <td className="px-4 py-3.5 text-gray-400 font-medium">{rowNum}</td>
                          <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{r.studentName}</td>
                          <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400">{r.batchName || '—'}</td>
                          <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">
                            {r.performancePct != null ? `${r.performancePct}%` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">
                            {r.quizPct != null ? `${r.quizPct}%` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">
                            {r.assignmentCompletionPct != null ? `${r.assignmentCompletionPct}%` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-gray-800 dark:text-gray-200">
                            {r.readinessScore != null ? `${r.readinessScore}%` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${readinessBadge}`}>
                              {r.status ? r.status.replace(/_/g, ' ') : 'READY'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[10px]">
                              {r.currentPlacementStatus || 'SEEKING'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => loadStudentDetail(r.studentId)}
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 font-semibold flex items-center justify-end gap-1 ml-auto cursor-pointer"
                            >
                              <Eye size={13} /> View
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span>
                  Showing {placementFiltered.length > 0 ? (placementPage - 1) * placementPageSize + 1 : 0} to {Math.min(placementPage * placementPageSize, placementFiltered.length)} of {placementFiltered.length} students
                </span>
                <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Rows:</span>
                  <select
                    value={placementPageSize}
                    onChange={(e) => {
                      setPlacementPageSize(Number(e.target.value))
                      setPlacementPage(1)
                    }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-200 font-semibold outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    {[5, 10, 20, 50, 100].map(sz => (
                      <option key={sz} value={sz}>{sz} rows</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPlacementPage(p => Math.max(1, p - 1))}
                  disabled={placementPage === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                {getPageWindow(placementPage, placementTotalPages).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlacementPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      placementPage === p
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {placementTotalPages > 5 && <span className="px-1 text-gray-400">...</span>}
                {placementTotalPages > 5 && (
                  <button
                    onClick={() => setPlacementPage(placementTotalPages)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
                  >
                    {placementTotalPages}
                  </button>
                )}
                <button
                  onClick={() => setPlacementPage(p => Math.min(placementTotalPages, p + 1))}
                  disabled={placementPage === placementTotalPages}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXPORT REPORT                                                      */}
      {/* ========================================================================= */}
      {tab === 'Export' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Card */}
          <div className="glass-card p-6 rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs bg-white/90 dark:bg-gray-900/80 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="font-display font-bold text-gray-900 dark:text-white text-base">Export Report</h2>
                <p className="text-xs text-gray-500">Download filtered data from LMS reports</p>
              </div>
            </div>

            {/* Step 1: Select Report Type */}
            <div>
              <h3 className="text-xs font-bold text-gray-800 dark:text-white mb-3">1. Select Report Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Report */}
                <div
                  onClick={() => setSelectedExportType('attendance')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    selectedExportType === 'attendance'
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-gray-900 dark:text-white text-xs">Attendance Report</h4>
                      <p className="text-[11px] text-gray-500">Student attendance records</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedExportType === 'attendance' ? 'border-purple-600' : 'border-gray-300'}`}>
                    {selectedExportType === 'attendance' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                  </div>
                </div>

                {/* Performance Report */}
                <div
                  onClick={() => setSelectedExportType('performance')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    selectedExportType === 'performance'
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                      <BarChart2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-gray-900 dark:text-white text-xs">Performance Report</h4>
                      <p className="text-[11px] text-gray-500">Quiz, assignment and overall performance</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedExportType === 'performance' ? 'border-purple-600' : 'border-gray-300'}`}>
                    {selectedExportType === 'performance' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                  </div>
                </div>

                {/* Placement Report */}
                <div
                  onClick={() => setSelectedExportType('placement')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    selectedExportType === 'placement'
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                      <Target size={18} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-gray-900 dark:text-white text-xs">Placement Report</h4>
                      <p className="text-[11px] text-gray-500">Placement readiness and drive status</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedExportType === 'placement' ? 'border-purple-600' : 'border-gray-300'}`}>
                    {selectedExportType === 'placement' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Apply Filters */}
            <div>
              <h3 className="text-xs font-bold text-gray-800 dark:text-white mb-3">2. Apply Filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Course */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Course</label>
                  <CustomSelect
                    value={courseFilter}
                    onChange={(val) => setCourseFilter(val)}
                    options={courses.map(c => ({ value: c.id, label: c.title }))}
                    placeholder="All Courses"
                    compact
                    searchable={courses.length >= 10}
                  />
                </div>

                {/* Batch */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Batch</label>
                  <CustomSelect
                    value={batchFilter}
                    onChange={(val) => setBatchFilter(val)}
                    options={filteredBatches.map(b => ({ value: b.id, label: b.name }))}
                    placeholder="All Batches"
                    compact
                    searchable={filteredBatches.length >= 10}
                  />
                </div>

                {/* From Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">From Date</label>
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 shadow-2xs">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-transparent outline-none w-full text-[11px] text-gray-700 dark:text-gray-200 cursor-pointer"
                    />
                  </div>
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">To Date</label>
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 shadow-2xs">
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent outline-none w-full text-[11px] text-gray-700 dark:text-gray-200 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Select Columns to Export */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-800 dark:text-white">3. Select Columns to Export</h3>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => {
                      const all = (DEFAULT_EXPORT_COLUMNS[selectedExportType] || []).map(c => c.key)
                      setSelectedColumns(all)
                    }}
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                  >
                    <CheckSquare size={13} /> Select All
                  </button>
                  <button
                    onClick={() => setSelectedColumns([])}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {(DEFAULT_EXPORT_COLUMNS[selectedExportType] || []).map(col => {
                  const isChecked = selectedColumns.includes(col.key)
                  return (
                    <label
                      key={col.key}
                      onClick={() => {
                        setSelectedColumns(prev =>
                          prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key]
                        )
                      }}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}>
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{col.label}</span>
                    </label>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-800 mt-5">
                <button
                  onClick={handlePreviewExport}
                  disabled={exportPreviewLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 rounded-xl text-xs font-semibold hover:bg-purple-100 cursor-pointer disabled:opacity-60"
                >
                  <Eye size={14} />
                  {exportPreviewLoading ? 'Loading Preview...' : 'Preview Data'}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {exportPreview && (
            <div className="glass-card rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs overflow-hidden bg-white/90 dark:bg-gray-900/80">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Preview (First 10 Records)</h3>
                  <p className="text-xs text-gray-500">Showing sample data based on selected filters</p>
                </div>
                <div className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800/40">
                  Total Records: {exportPreview.total}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-gray-500 uppercase tracking-wider font-semibold">
                      <th className="px-4 py-3 text-left w-10">#</th>
                      {selectedColumns.map(colKey => {
                        const colDef = (DEFAULT_EXPORT_COLUMNS[selectedExportType] || []).find(c => c.key === colKey)
                        return (
                          <th key={colKey} className="px-4 py-3 text-left whitespace-nowrap">
                            {colDef?.label || colKey}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {exportPreview.rows.length === 0 ? (
                      <tr>
                        <td colSpan={selectedColumns.length + 1} className="text-center py-6 text-gray-400">
                          No matching records for the current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      exportPreview.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10">
                          <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                          {selectedColumns.map(colKey => (
                            <td key={colKey} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {row[colKey] != null ? String(row[colKey]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Exports */}
          <div className="glass-card rounded-2xl border border-purple-100/70 dark:border-purple-900/30 shadow-xs overflow-hidden bg-white/90 dark:bg-gray-900/80">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm">Recent Exports</h3>
              <p className="text-xs text-gray-500">Your recently downloaded reports</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Report Type</th>
                    <th className="px-4 py-3 text-left">Filters</th>
                    <th className="px-4 py-3 text-left">Exported By</th>
                    <th className="px-4 py-3 text-left">Date &amp; Time</th>
                    <th className="px-4 py-3 text-center">Format</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentExports.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{item.type}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.filters}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.exportedBy}</td>
                      <td className="px-4 py-3 text-gray-500">{item.dateTime}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-[10px]">
                          {item.format}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              const r = await reportService.export({
                                type: item.dataRef || 'attendance',
                                batchId: batchFilter || undefined,
                              })
                              downloadCSV(r.data || [], `${item.type.toLowerCase()}-report.csv`)
                              toast.success('Report re-downloaded')
                            } catch {
                              toast.error('Re-download failed')
                            }
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-800 font-semibold flex items-center justify-end gap-1 ml-auto cursor-pointer"
                        >
                          <Download size={13} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Global Student Detail Modal (Accessible from Performance, Placement & all tabs) */}
      {isStudentModalOpen && studentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <span>{studentDetail.studentName}</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60">
                    {studentDetail.batchName || 'No Batch'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Comprehensive Performance &amp; Placement Readiness Profile</p>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 text-center">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Performance</span>
                <span className="text-base font-bold text-purple-700 dark:text-purple-300 font-display">
                  {studentDetail.overallPerformancePct != null ? `${studentDetail.overallPerformancePct}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Attendance</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-display">
                  {studentDetail.attendancePct != null ? `${studentDetail.attendancePct}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-center">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Quiz Accuracy</span>
                <span className="text-base font-bold text-blue-700 dark:text-blue-300 font-display">
                  {studentDetail.avgQuizScore != null ? `${studentDetail.avgQuizScore}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40 text-center">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Assignments</span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-300 font-display">
                  {studentDetail.assignmentCompletionPct != null ? `${studentDetail.assignmentCompletionPct}%` : '—'}
                </span>
              </div>
            </div>

            {studentDetail.riskLevel && (
              <div className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl">
                <span className="text-gray-500 font-medium">Risk Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold ${RISK_BADGE[studentDetail.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                  {studentDetail.riskLevel} {studentDetail.riskScore != null ? `(${studentDetail.riskScore}/100)` : ''}
                </span>
              </div>
            )}

            {studentDetail.courseBreakdown?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Course-wise Performance</h4>
                <StudentCourseBreakdownChart data={studentDetail.courseBreakdown} />
              </div>
            )}

            {studentDetail.progressTrend?.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Score Progress Trend</h4>
                <StudentProgressTrendChart data={studentDetail.progressTrend} />
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
