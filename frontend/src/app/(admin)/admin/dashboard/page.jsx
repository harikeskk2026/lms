'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  GraduationCap, UserCheck, BookOpen, Layers, ClipboardList, Brain, Briefcase,
  UserPlus, TrendingUp, AlertTriangle, Calendar, ExternalLink
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { adminApi } from '@/lib/api'
import StatCard from '@/components/admin/StatCard'
import { SkeletonStat, ErrorCard } from '@/components/student/SkeletonCard'

// recharts is a heavy dependency - load it only for this dashboard's chart
// section, and only on the client (SSR doesn't need it).
const PerformanceTrendChart = dynamic(
  () => import('@/components/admin/dashboard/PerformanceCharts').then(m => m.PerformanceTrendChart),
  { ssr: false, loading: () => <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> }
)
const AttendanceBreakdownChart = dynamic(
  () => import('@/components/admin/dashboard/PerformanceCharts').then(m => m.AttendanceBreakdownChart),
  { ssr: false, loading: () => <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> }
)

const ATTENDANCE_COLORS = { healthy: '#22c55e', atRisk: '#f59e0b', critical: '#ef4444' }

const ACTIVITY_ICONS = {
  NEW_STUDENT:  { icon: UserPlus,      color: 'bg-purple-100 text-purple-600' },
  SUBMISSION:   { icon: ClipboardList, color: 'bg-blue-100 text-blue-600' },
  QUIZ_ATTEMPT: { icon: Brain,         color: 'bg-indigo-100 text-indigo-600' },
}

const QUICK_ACTIONS = [
  { label: 'Add Student',           icon: UserPlus,      href: '/admin/students',       color: 'from-purple-600 to-violet-600' },
  { label: 'Create Course',         icon: BookOpen,       href: '/admin/course-catalog', color: 'from-blue-600 to-indigo-600' },
  { label: 'Create Batch',          icon: Layers,         href: '/admin/batch-catalog',  color: 'from-indigo-600 to-purple-600' },
  { label: 'Create Assignment',     icon: ClipboardList,  href: '/admin/assignments',    color: 'from-violet-600 to-purple-700' },
  { label: 'Create Quiz',           icon: Brain,          href: '/admin/quizzes',        color: 'from-purple-600 to-fuchsia-600' },
  { label: 'Create Placement Drive',icon: Briefcase,      href: '/admin/placement',      color: 'from-emerald-600 to-green-600' },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi.getDashboard()
      .then(r => setStats(r.data.data))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const attendancePieData = stats ? [
    { name: 'Healthy', value: stats.attendance.healthy, color: ATTENDANCE_COLORS.healthy },
    { name: 'At Risk', value: stats.attendance.atRisk, color: ATTENDANCE_COLORS.atRisk },
    { name: 'Critical', value: stats.attendance.critical, color: ATTENDANCE_COLORS.critical },
  ].filter(d => d.value > 0) : []

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <ErrorCard message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl p-7 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 60%, #7c3aed 100%)' }}>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute right-12 bottom-0 w-32 h-32 rounded-full opacity-5 bg-white" />
        <div className="relative z-10">
          <p className="text-purple-200 text-sm font-medium mb-1">Admin Dashboard</p>
          <h1 className="font-display text-2xl font-extrabold mb-1">CareerLabs Overview</h1>
          <p className="text-purple-200 text-sm">Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {loading ? [...Array(7)].map((_, i) => <SkeletonStat key={i} />) : (
          <>
            <StatCard title="Total Students" value={stats.overview.totalStudents} subtitle={`${stats.overview.activeStudents} active`} icon={GraduationCap} color="purple" />
            <StatCard title="Active Students" value={stats.overview.activeStudents} icon={UserCheck} color="green" />
            <StatCard title="Total Courses" value={stats.overview.totalCourses} icon={BookOpen} color="blue" />
            <StatCard title="Active Batches" value={stats.overview.activeBatches} icon={Layers} color="indigo" />
            <StatCard title="Assignments" value={stats.overview.totalAssignments} icon={ClipboardList} color="yellow" />
            <StatCard title="Quizzes" value={stats.overview.totalQuizzes} icon={Brain} color="purple" />
            <StatCard title="Placement Drives" value={stats.overview.placementDrives} icon={Briefcase} color="green" />
          </>
        )}
      </div>

      {/* Student Performance */}
      <section>
        <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Student Performance</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? [...Array(3)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Average Performance" value={`${Math.round(stats.performance.averagePerformancePct ?? 0)}%`} icon={TrendingUp} color="purple" />
              <StatCard title="At-Risk Students" value={stats.performance.atRiskCount} icon={AlertTriangle} color="yellow" />
              <StatCard title="Needs Improvement" value={stats.performance.needsImprovementCount} icon={AlertTriangle} color="blue" />
            </>
          )}
        </div>
      </section>

      {/* Attendance */}
      <section>
        <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Attendance</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? [...Array(4)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Overall Attendance" value={`${stats.attendance.overallPct}%`} icon={Calendar} color="blue" />
              <StatCard title="Healthy" value={stats.attendance.healthy} icon={UserCheck} color="green" />
              <StatCard title="At Risk" value={stats.attendance.atRisk} icon={AlertTriangle} color="yellow" />
              <StatCard title="Critical" value={stats.attendance.critical} icon={AlertTriangle} color="indigo" />
            </>
          )}
        </div>
      </section>

      {/* Assignments */}
      <section>
        <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Assignments</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? [...Array(4)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Published" value={stats.assignments.published} icon={ClipboardList} color="purple" />
              <StatCard title="Pending Submissions" value={stats.assignments.pendingSubmissions} icon={ClipboardList} color="yellow" />
              <StatCard title="Late Submissions" value={stats.assignments.lateSubmissions} icon={ClipboardList} color="indigo" />
              <StatCard title="Graded" value={stats.assignments.graded} icon={ClipboardList} color="green" />
            </>
          )}
        </div>
      </section>

      {/* Quizzes */}
      <section>
        <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Quizzes</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? [...Array(4)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Total Quizzes" value={stats.quizzes.total} icon={Brain} color="purple" />
              <StatCard title="Attempts" value={stats.quizzes.attempts} icon={Brain} color="blue" />
              <StatCard title="Average Score" value={`${Math.round(stats.quizzes.avgScore ?? 0)}%`} icon={Brain} color="indigo" />
              <StatCard title="Pass Rate" value={`${Math.round(stats.quizzes.passRate ?? 0)}%`} icon={Brain} color="green" />
            </>
          )}
        </div>
      </section>

      {/* Placement */}
      <section>
        <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Placement</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? [...Array(3)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Active Drives" value={stats.placement.activeDrives} icon={Briefcase} color="purple" />
              <StatCard title="Interested Students" value={stats.placement.interestedStudents} icon={UserCheck} color="blue" />
              <StatCard title="Available Drives" value={stats.placement.availableDrives} icon={Briefcase} color="green" />
            </>
          )}
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Performance Trend</h3>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : (stats.performance.trend || []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No performance data yet</div>
          ) : (
            <PerformanceTrendChart trend={stats.performance.trend} />
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Attendance Breakdown</h3>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : attendancePieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No attendance data yet</div>
          ) : (
            <AttendanceBreakdownChart data={attendancePieData} />
          )}
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="glass-card p-6">
        <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Upcoming Sessions</h3>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (stats.upcomingSessions || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming sessions in the next 7 days</p>
        ) : (
          <div className="space-y-3">
            {stats.upcomingSessions.map(s => (
              <div key={s.classId} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10">
                <div className="flex-shrink-0 px-2 py-1.5 rounded-lg text-center min-w-[52px] bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800">
                  <p className="text-[10px] font-bold uppercase text-purple-600">{format(new Date(s.date), 'EEE')}</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{format(new Date(s.date), 'dd')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.batchName} · {format(new Date(s.date), 'h:mm a')}</p>
                </div>
                {s.meetLink && (
                  <a href={s.meetLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">
                    <ExternalLink size={13} /> Join
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {(stats.recentActivity || []).map((item, i) => {
                const cfg = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.NEW_STUDENT
                const Icon = cfg.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</p>
                      <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(item.time), { addSuffix: true })}</p>
                    </div>
                  </div>
                )
              })}
              {(!stats.recentActivity?.length) && (
                <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href, color }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`bg-gradient-to-r ${color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] hover:shadow-lg transition-all duration-200`}
              >
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
