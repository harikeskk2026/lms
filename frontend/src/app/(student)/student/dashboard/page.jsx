'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import {
  BookOpen, ClipboardList, Trophy, Calendar,
  BarChart3, Clock, Zap, Briefcase, Edit3,
  Megaphone, ChevronRight, ExternalLink, RefreshCw, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useDashboard } from '@/hooks/useStudentDashboard'
import { studentApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { ErrorCard } from '@/components/student/SkeletonCard'

// ─── SuperAdmin Style KPI Card ────────────────────────────────────────────────
function KCard({ title, value, icon: Icon, accent, href }) {
  const bgs = {
    purple: 'bg-purple-50 dark:bg-purple-950/50',
    green:  'bg-green-50 dark:bg-emerald-950/50',
    blue:   'bg-blue-50 dark:bg-blue-950/50',
    amber:  'bg-amber-50 dark:bg-amber-950/50'
  }
  const ics = {
    purple: 'text-purple-600 dark:text-purple-400',
    green:  'text-green-600 dark:text-emerald-400',
    blue:   'text-blue-600 dark:text-blue-400',
    amber:  'text-amber-600 dark:text-amber-400'
  }
  const bds = {
    purple: 'border-purple-100 dark:border-purple-900/30',
    green:  'border-green-100 dark:border-emerald-900/30',
    blue:   'border-blue-100 dark:border-blue-900/30',
    amber:  'border-amber-100 dark:border-amber-900/30'
  }
  const vs = {
    purple: 'text-purple-700 dark:text-purple-300',
    green:  'text-green-700 dark:text-emerald-300',
    blue:   'text-blue-700 dark:text-blue-300',
    amber:  'text-amber-700 dark:text-amber-300'
  }
  const a = accent || 'purple'

  const content = (
    <div className={`h-full min-h-[135px] bg-white dark:bg-gray-800/90 rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col justify-between ${bds[a]}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${bgs[a]}`}>
        {Icon && <Icon size={20} className={ics[a]} />}
      </div>
      <div>
        <p className={`text-2xl sm:text-3xl font-extrabold leading-none mb-1.5 ${vs[a]}`}>{value}</p>
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }
  return content
}

// ─── Live Clock Component ─────────────────────────────────────────────────────
function LiveClock() {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <p className="text-xs text-purple-100 opacity-70">
        {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <p className="font-mono text-amber-300 font-bold text-lg leading-tight">
        {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toLowerCase()}
      </p>
    </>
  )
}

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useDashboard()

  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [meetings, setMeetings] = useState([])
  const [dailyClasses, setDailyClasses] = useState([])
  const [attSummary, setAttSummary] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [progressView, setProgressView] = useState('courses') // 'courses' | 'topics'

  // Fetch supplementary dynamic data
  const loadExtraData = useCallback(async () => {
    try {
      const [cRes, aRes, annRes, attRes, mRes, clsRes] = await Promise.all([
        studentApi.getCourses().catch(() => null),
        studentApi.getAssignments().catch(() => null),
        studentApi.getAnnouncements().catch(() => null),
        studentApi.getAttSummary().catch(() => null),
        studentApi.getMeetings().catch(() => null),
        studentApi.getClasses().catch(() => null)
      ])

      if (cRes?.data?.data) setCourses(cRes.data.data)
      if (aRes?.data?.data) setAssignments(aRes.data.data)
      if (annRes?.data?.data) setAnnouncements(annRes.data.data)
      if (attRes?.data?.data) setAttSummary(attRes.data.data)
      if (mRes?.data?.data) setMeetings(mRes.data.data)
      else if (Array.isArray(mRes?.data)) setMeetings(mRes.data)
      if (clsRes?.data?.data) setDailyClasses(clsRes.data.data)
      else if (Array.isArray(clsRes?.data)) setDailyClasses(clsRes.data)
    } catch {
      // Gracefully handle partial failures
    }
  }, [])

  useEffect(() => {
    loadExtraData()
  }, [loadExtraData])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetch(true),
        loadExtraData()
      ])
      toast.success('Dashboard refreshed')
    } catch {
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  // ─── Extract Overview Data ──────────────────────────────────────────────────
  const overview = data?.overview || {}
  const upcomingClasses = data?.upcomingClasses || []
  const continueLearning = data?.continueLearning || []
  const activeCourseId = continueLearning[0]?.courseId || courses[0]?.courseId

  // Student First Name / Display Name
  const studentName = useMemo(() => {
    if (user?.name) {
      return user.name.trim().split(' ')[0]
    }
    return 'Student'
  }, [user?.name])

  // ─── Derived Metrics for KPI Cards ──────────────────────────────────────────
  const enrolledCoursesCount = overview.myCourses ?? courses.length ?? 0

  const pendingAssignmentsCount = useMemo(() => {
    if (assignments.length > 0) {
      return assignments.filter(a => !a.submission && a.status !== 'CLOSED').length
    }
    return overview.pendingAssignments ?? 0
  }, [assignments, overview.pendingAssignments])

  const quizzesCompletedCount = data?.performance?.quiz?.quizzesCompleted ?? 0

  const attendancePercentage = useMemo(() => {
    if (attSummary?.overallPercentage != null) return attSummary.overallPercentage
    if (data?.attendance?.currentPercentage != null) return data.attendance.currentPercentage
    if (overview.attendancePct != null) return overview.attendancePct
    return 0
  }, [attSummary, data?.attendance, overview.attendancePct])

  // ─── Learning Progress Chart Data ───────────────────────────────────────────
  const chartData = useMemo(() => {
    // 1. If viewing courses progress
    if (progressView === 'courses') {
      if (courses.length > 0) {
        return courses.map(item => {
          const title = item.course?.title || item.title || 'Course'
          const pct = Math.min(100, Math.max(0, Math.round(item.progress?.pct ?? 0)))
          return { name: title, pct }
        })
      }
      const breakdown = data?.performance?.assignment?.courseBreakdown || []
      if (breakdown.length > 0) {
        return breakdown.map(c => ({
          name: c.courseTitle || 'Course',
          pct: Math.min(100, Math.max(0, Math.round(c.averageScorePct ?? 0)))
        }))
      }
      if (continueLearning.length > 0) {
        return continueLearning.map(c => ({
          name: c.courseTitle || 'Course',
          pct: Math.min(100, Math.max(0, Math.round(overview.assignmentCompletionPct ?? 0)))
        }))
      }
    }

    // 2. If viewing topic performance
    const topicPerf = data?.performance?.quiz?.topicPerformance || []
    if (topicPerf.length > 0) {
      return topicPerf.slice(0, 6).map(t => ({
        name: t.topicName || 'Topic',
        pct: Math.min(100, Math.max(0, Math.round(t.accuracy ?? 0)))
      }))
    }

    return []
  }, [progressView, courses, data?.performance, continueLearning, overview.assignmentCompletionPct])

  // ─── Recent Activity Stream (Student's Personal Activity Only) ──────────────
  const recentActivities = useMemo(() => {
    const list = []

    // 1. Assignment Submissions (by this student)
    assignments.forEach(a => {
      if (a.submission?.submittedAt) {
        list.push({
          id: `asg-${a.id}-${a.submission.id}`,
          type: 'ASSIGNMENT_SUBMITTED',
          title: 'Assignment submitted',
          subtitle: `${a.course?.title || a.batchName || 'Course'} – ${a.title}`,
          date: new Date(a.submission.submittedAt),
          icon: Briefcase,
          color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
        })
      }
    })

    // 2. Quiz Attempts (by this student)
    const attempts = data?.performance?.quiz?.recentAttempts || []
    attempts.forEach(q => {
      if (q.attemptedAt || q.completedAt || q.date) {
        list.push({
          id: `quiz-${q.attemptId || q.id || Math.random()}`,
          type: 'QUIZ_COMPLETED',
          title: 'Quiz completed',
          subtitle: q.quizTitle || 'Practice Quiz',
          date: new Date(q.attemptedAt || q.completedAt || q.date),
          icon: Trophy,
          color: 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
        })
      }
    })

    // 3. Course Enrollments (for this student)
    courses.forEach(c => {
      if (c.enrolledAt) {
        list.push({
          id: `crs-${c.courseId}`,
          type: 'COURSE_ENROLLED',
          title: 'You enrolled in a course',
          subtitle: c.course?.title || 'Course',
          date: new Date(c.enrolledAt),
          icon: BookOpen,
          color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
        })
      }
    })

    // Sort descending by date
    list.sort((a, b) => b.date.getTime() - a.date.getTime())
    return list.slice(0, 4)
  }, [assignments, courses, data?.performance?.quiz?.recentAttempts])

// ─── Helpers for Today Classes ──────────────────────────────────────────────
const parseClassDate = (val) => {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (Array.isArray(val)) {
    const [yr, mo, dy, hr = 0, mn = 0, sc = 0] = val
    return new Date(yr, mo - 1, dy, hr, mn, sc)
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(' ', 'T').replace('Z', '')
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

const isClassToday = (d) => {
  if (!d) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

const computeClassStatus = (backendStatus, startDate, endDate) => {
  if (backendStatus === 'CANCELLED') return 'CANCELLED'
  if (backendStatus === 'LIVE') return 'ONGOING'
  if (backendStatus === 'COMPLETED') return 'COMPLETED'

  if (!startDate) return 'UPCOMING'

  const now = new Date()
  const effectiveEnd = endDate || new Date(startDate.getTime() + 60 * 60 * 1000)

  if (now < startDate) {
    return 'UPCOMING'
  }
  if (now >= startDate && now <= effectiveEnd) {
    return 'ONGOING'
  }
  return 'COMPLETED'
}

  // Fire-and-forget join recorder for attendance
  const recordJoin = (id) => {
    if (id && studentApi.joinMeeting) {
      studentApi.joinMeeting(id).catch(() => {})
    }
  }

  // ─── Today's Classes Only (Course & Batch Specific with Dynamic Status) ─────
  const todayClasses = useMemo(() => {
    const rawList = []

    // 1. Add meetings from studentApi.getMeetings()
    meetings.forEach(m => {
      rawList.push({
        id: `meeting-${m.id}`,
        classId: m.id,
        title: m.title,
        description: m.description,
        meetLink: m.meetUrl,
        platform: m.platform,
        batchName: m.batchName,
        courseTitle: m.courseTitle,
        startTime: m.scheduledStart,
        endTime: m.scheduledEnd,
        backendStatus: m.status
      })
    })

    // 2. Add classes from studentApi.getClasses()
    dailyClasses.forEach(c => {
      const isDuplicate = rawList.some(r =>
        (r.title && c.title && r.title.toLowerCase() === c.title.toLowerCase())
      )
      if (!isDuplicate) {
        rawList.push({
          id: `class-${c.id}`,
          classId: c.id,
          title: c.title,
          description: c.notes,
          meetLink: c.meetLink,
          platform: 'ZOOM',
          batchName: c.batchName,
          courseTitle: c.courseTitle,
          startTime: c.date,
          endTime: null,
          backendStatus: c.status
        })
      }
    })

    // 3. Add upcomingClasses from dashboard data if any not present
    upcomingClasses.forEach(u => {
      const isDuplicate = rawList.some(r =>
        (r.title && u.title && r.title.toLowerCase() === u.title.toLowerCase()) ||
        (r.classId === u.classId)
      )
      if (!isDuplicate) {
        rawList.push({
          id: `dash-${u.classId}`,
          classId: u.classId,
          title: u.title,
          description: null,
          meetLink: u.meetLink,
          platform: 'ZOOM',
          batchName: u.batchName,
          courseTitle: u.courseTitle,
          startTime: u.date,
          endTime: u.scheduledEnd,
          backendStatus: u.status
        })
      }
    })

    // 4. Filter strictly to classes scheduled for TODAY
    const filtered = rawList.filter(item => {
      const startDate = parseClassDate(item.startTime)
      return isClassToday(startDate)
    })

    // 5. Compute dynamic status & sort chronologically
    return filtered
      .map(item => {
        const startDate = parseClassDate(item.startTime)
        const endDate = parseClassDate(item.endTime)
        const status = computeClassStatus(item.backendStatus, startDate, endDate)
        return {
          ...item,
          startDate,
          endDate,
          displayStatus: status // 'ONGOING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
        }
      })
      .sort((a, b) => {
        const tA = a.startDate ? a.startDate.getTime() : 0
        const tB = b.startDate ? b.startDate.getTime() : 0
        return tA - tB
      })
  }, [meetings, dailyClasses, upcomingClasses])

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-wrapper space-y-6 animate-pulse max-w-7xl mx-auto">
        {/* Banner Skeleton */}
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
        {/* Row 2 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="lg:col-span-5 h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="page-wrapper max-w-7xl mx-auto">
        <ErrorCard message={error || 'Failed to load student dashboard'} onRetry={handleRefresh} />
      </div>
    )
  }

  return (
    <div className="page-wrapper space-y-6 max-w-7xl mx-auto pb-10">

      {/* ─── TOP WELCOME BANNER (SUPERADMIN THEME & STYLE) ────────────────── */}
      <div
        className="rounded-2xl overflow-hidden relative shadow-sm"
        style={{
          background: 'linear-gradient(135deg,#3b0764 0%,#5b21b6 45%,#7c3aed 80%,#8b5cf6 100%)',
          minHeight: '130px'
        }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.9) 1px,transparent 1px)',
            backgroundSize: '28px 28px'
          }}
        />
        <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-xs font-bold tracking-widest uppercase mb-2">Student Console</p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1">
              Welcome back, {studentName} 👋
            </h1>
            <p className="text-sm text-purple-200 opacity-80">
              Keep learning, keep growing. You&apos;re closer to your goals!
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <LiveClock />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 mt-1 text-xs text-purple-200 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: 4 KPI CARDS (SUPERADMIN STYLE & LAYOUT) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
        <KCard
          title="Enrolled Courses"
          value={enrolledCoursesCount}
          icon={BookOpen}
          accent="purple"
          href="/student/my-courses"
        />
        <KCard
          title="Pending Assignments"
          value={pendingAssignmentsCount}
          icon={ClipboardList}
          accent="green"
          href="/student/assignments"
        />
        <KCard
          title="Quizzes Completed"
          value={quizzesCompletedCount}
          icon={Trophy}
          accent="amber"
          href="/student/quizzes"
        />
        <KCard
          title="Attendance"
          value={`${attendancePercentage}%`}
          icon={Calendar}
          accent="blue"
          href="/student/attendance"
        />
      </div>

      {/* ─── ROW 2: LEARNING PROGRESS GRAPH + UPCOMING CLASSES ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Learning Progress (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header with Filter */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <BarChart3 size={18} />
                </div>
                <h2 className="font-display text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Learning Progress
                </h2>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-50 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200/60 dark:border-gray-600/50">
                <button
                  onClick={() => setProgressView('courses')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    progressView === 'courses'
                      ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  By Course
                </button>
                <button
                  onClick={() => setProgressView('topics')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    progressView === 'topics'
                      ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Quiz Topics
                </button>
              </div>
            </div>

            {/* Vertical Bar Chart matching reference */}
            {chartData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center p-4">
                <BarChart3 size={36} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {progressView === 'courses' ? 'No course progress recorded yet' : 'No quiz topic data recorded yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  {progressView === 'courses'
                    ? 'Enroll in a course to see your progress curve here.'
                    : 'Complete quizzes to see topic-level accuracy here.'}
                </p>
              </div>
            ) : (
              <div className="relative h-64 pt-4 pb-2">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-x-8 inset-y-4 flex flex-col justify-between pointer-events-none opacity-40 dark:opacity-20">
                  <div className="border-b border-dashed border-gray-300 dark:border-gray-600 w-full" />
                  <div className="border-b border-dashed border-gray-300 dark:border-gray-600 w-full" />
                  <div className="border-b border-dashed border-gray-300 dark:border-gray-600 w-full" />
                  <div className="border-b border-dashed border-gray-300 dark:border-gray-600 w-full" />
                  <div className="border-b border-gray-300 dark:border-gray-600 w-full" />
                </div>

                {/* Y-Axis Labels + Chart Container */}
                <div className="flex h-full">
                  <div className="w-8 flex flex-col justify-between text-[11px] font-semibold text-gray-400 dark:text-gray-500 pb-7 select-none">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  {/* Bars Flex Row */}
                  <div className="flex-1 flex items-end justify-around px-2 sm:px-4 pb-7">
                    {chartData.map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center group relative h-full justify-end">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white text-[10px] font-bold py-0.5 px-2 rounded shadow-md whitespace-nowrap z-20">
                          {item.name}: {item.pct}%
                        </div>

                        {/* Bar */}
                        <div
                          className="w-8 sm:w-11 bg-gradient-to-t from-purple-500 to-violet-400 dark:from-purple-600 dark:to-violet-500 hover:from-purple-600 hover:to-violet-400 rounded-t-xl transition-all duration-300 cursor-pointer shadow-sm"
                          style={{
                            height: `${Math.max(item.pct, 4)}%`
                          }}
                        />

                        {/* X-Axis Label */}
                        <span
                          title={item.name}
                          className="absolute -bottom-6 w-16 sm:w-20 text-center text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate select-none group-hover:text-purple-600 transition-colors"
                        >
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Bottom Row depending on View */}
          <div className="pt-4 border-t border-gray-50 dark:border-gray-700/40 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {progressView === 'courses'
                ? 'Course progress automatically updates as you learn'
                : 'Topic accuracy based on completed quizzes'}
            </span>
            {progressView === 'courses' ? (
              <Link
                href="/student/my-courses"
                className="font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                Course Details →
              </Link>
            ) : (
              <Link
                href="/student/quizzes"
                className="font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                Quiz Details →
              </Link>
            )}
          </div>
        </div>

        {/* Right: Today Classes (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    Today Classes
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {todayClasses.length === 0
                      ? 'No classes scheduled for today'
                      : `${todayClasses.length} ${todayClasses.length === 1 ? 'class' : 'classes'} scheduled today`}
                  </p>
                </div>
              </div>
              <Link
                href="/student/meeting-links"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                View All
              </Link>
            </div>

            {/* Classes List for Today */}
            {todayClasses.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-400 flex items-center justify-center mx-auto mb-2">
                  <Calendar size={22} />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Classes Today</p>
                <p className="text-xs text-gray-400 mt-0.5">You have no live classes scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {todayClasses.map((cls) => {
                  const isOngoing = cls.displayStatus === 'ONGOING'
                  const isCompleted = cls.displayStatus === 'COMPLETED'
                  const isUpcoming = cls.displayStatus === 'UPCOMING'

                  return (
                    <div
                      key={cls.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isOngoing
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs'
                          : isCompleted
                          ? 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200/60 dark:border-gray-700/40 opacity-85 hover:opacity-100'
                          : 'bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-purple-100/60 dark:border-purple-800/20'
                      }`}
                    >
                      {/* Time Badge */}
                      <div className={`w-14 py-2 px-1 rounded-xl text-center flex-shrink-0 flex flex-col items-center justify-center ${
                        isOngoing
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCompleted
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          : 'bg-purple-600 text-white shadow-sm'
                      }`}>
                        <span className="text-xs font-extrabold leading-tight">
                          {cls.startDate ? format(cls.startDate, 'hh:mm') : '--:--'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isOngoing
                            ? 'text-emerald-100'
                            : isCompleted
                            ? 'text-gray-500 dark:text-gray-400'
                            : 'text-purple-100'
                        }`}>
                          {cls.startDate ? format(cls.startDate, 'a') : ''}
                        </span>
                      </div>

                      {/* Class Details & Status */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {cls.title}
                          </p>

                          {/* Status Badge */}
                          {isOngoing && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs uppercase tracking-wide">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              Ongoing
                            </span>
                          )}

                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 uppercase tracking-wide">
                              <Clock size={10} className="text-blue-500 dark:text-blue-400" />
                              Upcoming
                            </span>
                          )}

                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300 border border-gray-200 dark:border-gray-600 uppercase tracking-wide">
                              <CheckCircle size={10} className="text-gray-500 dark:text-gray-400" />
                              Completed
                            </span>
                          )}

                          {cls.displayStatus === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 uppercase tracking-wide">
                              Cancelled
                            </span>
                          )}
                        </div>

                        {/* Metadata row: Course / Batch / Duration */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {cls.courseTitle && (
                            <span className="font-semibold text-purple-600 dark:text-purple-400 capitalize">
                              {cls.courseTitle}
                            </span>
                          )}
                          {cls.courseTitle && cls.batchName && <span>·</span>}
                          {cls.batchName && (
                            <span className="truncate">{cls.batchName}</span>
                          )}
                          {cls.endDate && (
                            <>
                              <span>·</span>
                              <span className="text-[11px]">to {format(cls.endDate, 'hh:mm a')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        {isOngoing && cls.meetLink ? (
                          <a
                            href={cls.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordJoin(cls.classId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                          >
                            Join <ExternalLink size={12} />
                          </a>
                        ) : isUpcoming && cls.meetLink ? (
                          <a
                            href={cls.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordJoin(cls.classId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                          >
                            Join <ExternalLink size={12} />
                          </a>
                        ) : isCompleted ? (
                          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 px-2">
                            Ended
                          </span>
                        ) : (
                          <ChevronRight size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-50 dark:border-gray-700/40 text-right">
            <Link
              href="/student/meeting-links"
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              View scheduled classes →
            </Link>
          </div>
        </div>

      </div>

      {/* ─── ROW 3: RECENT ACTIVITY + QUICK ACTIONS ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Recent Activity (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <h2 className="font-display text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  My Recent Activity
                </h2>
              </div>
              <Link href="/student/notifications" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                View All
              </Link>
            </div>

            {/* Activity Stream */}
            {recentActivities.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-400 flex items-center justify-center mx-auto mb-2">
                  <Clock size={22} />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Recent Activity</p>
                <p className="text-xs text-gray-400 mt-0.5">Submit an assignment or complete a quiz to see your timeline.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((act) => {
                  const Icon = act.icon
                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${act.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {act.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {act.subtitle}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 ml-2 font-medium">
                        {formatDistanceToNow(act.date, { addSuffix: true })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Zap size={18} />
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
            </div>

            {/* 2x2 Grid matching reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

              {/* Action 1: Continue Learning */}
              <Link
                href={activeCourseId ? `/student/my-courses/${activeCourseId}` : '/student/my-courses'}
                className="bg-purple-50/70 hover:bg-purple-100/70 dark:bg-purple-950/30 dark:hover:bg-purple-900/30 border border-purple-100 dark:border-purple-800/30 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <ChevronRight size={16} className="text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Continue Learning</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Go to my courses</p>
                </div>
              </Link>

              {/* Action 2: View Assignments */}
              <Link
                href="/student/assignments"
                className="bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <ClipboardList size={16} />
                  </div>
                  <ChevronRight size={16} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">View Assignments</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Check pending tasks</p>
                </div>
              </Link>

              {/* Action 3: Take a Quiz */}
              <Link
                href="/student/quizzes"
                className="bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/30 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                    <Edit3 size={16} />
                  </div>
                  <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Take a Quiz</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Improve your skills</p>
                </div>
              </Link>

              {/* Action 4: Explore Placement */}
              <Link
                href="/student/placement"
                className="bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                    <Briefcase size={16} />
                  </div>
                  <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Explore Placement</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">View drives &amp; updates</p>
                </div>
              </Link>

            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 dark:border-gray-700/40 text-right">
            <span className="text-xs text-gray-400">Quick shortcuts to your primary workflows</span>
          </div>
        </div>

      </div>

      {/* ─── ROW 4: LATEST ANNOUNCEMENTS (FULL WIDTH) ────────────────────── */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Megaphone size={18} />
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Latest Announcements
            </h2>
          </div>
          <Link href="/student/announcements" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
            View All
          </Link>
        </div>

        {announcements.length === 0 ? (
          <div className="py-8 text-center">
            <Megaphone size={30} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Announcements</p>
            <p className="text-xs text-gray-400 mt-0.5">There are no notices published for your courses or batches right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.slice(0, 3).map((ann, idx) => {
              const dateVal = ann.publishedAt || ann.createdAt
              return (
                <div key={ann.id || idx} className="flex items-start gap-4 group">
                  {/* Timeline dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-600 dark:bg-purple-400 ring-4 ring-purple-100 dark:ring-purple-950/60 mt-1.5 flex-shrink-0" />

                  {/* Announcement Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                      {ann.title}
                    </p>
                    {ann.body && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {ann.body}
                      </p>
                    )}
                  </div>

                  {/* Relative Date */}
                  {dateVal && (
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 font-medium">
                      {formatDistanceToNow(new Date(dateVal), { addSuffix: true })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
