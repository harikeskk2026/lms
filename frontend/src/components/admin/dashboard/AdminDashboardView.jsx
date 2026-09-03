'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  GraduationCap, UserCheck, BookOpen, Layers, ClipboardList, Brain, Briefcase,
  UserPlus, TrendingUp, AlertTriangle, Calendar, ExternalLink, Users, BarChart3,
  Shield, RefreshCw
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { adminApi } from '@/lib/api'
import StatCard from '@/components/admin/StatCard'
import { SkeletonStat, ErrorCard } from '@/components/student/SkeletonCard'

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
  NEW_STUDENT:  { icon: UserPlus,      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' },
  SUBMISSION:   { icon: ClipboardList, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300' },
  QUIZ_ATTEMPT: { icon: Brain,         color: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' },
}

const QUICK_ACTIONS = [
  { label: 'Add Student',             icon: UserPlus,      href: '/admin/students',       color: 'from-purple-600 to-violet-600' },
  { label: 'Add Trainer',             icon: Users,         href: '/admin/profile',        color: 'from-violet-600 to-indigo-600' },
  { label: 'Create Batch',            icon: Layers,        href: '/admin/batches',        color: 'from-indigo-600 to-purple-600' },
  { label: 'Create Course',           icon: BookOpen,      href: '/admin/course-catalog', color: 'from-purple-700 to-fuchsia-600' },
  { label: 'Manage Attendance',       icon: Calendar,      href: '/admin/attendance',     color: 'from-fuchsia-600 to-purple-700' },
  { label: 'Manage Assignments',      icon: ClipboardList, href: '/admin/assignments',    color: 'from-violet-600 to-purple-700' },
  { label: 'Manage Placement Drives', icon: Briefcase,     href: '/admin/placement',      color: 'from-purple-600 to-violet-700' },
]

const REFRESH_INTERVAL_MS = 60_000

function SectionHeader({ label }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
      <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">{label}</h3>
    </div>
  )
}

export default function AdminDashboardView() {
  const router = useRouter()
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [clock, setClock]           = useState(new Date())

  // Live clock — tick every second
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    adminApi.getDashboard()
      .then(r => {
        setStats(r.data.data)
        setLastUpdated(new Date())
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  // Initial load + auto-refresh every 60 s
  useEffect(() => {
    load()
    const id = setInterval(() => load(true), REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  const attendancePieData = stats ? [
    { name: 'Healthy',  value: stats.attendance?.healthy  || 0, color: ATTENDANCE_COLORS.healthy },
    { name: 'At Risk',  value: stats.attendance?.atRisk   || 0, color: ATTENDANCE_COLORS.atRisk },
    { name: 'Critical', value: stats.attendance?.critical || 0, color: ATTENDANCE_COLORS.critical },
  ].filter(d => d.value > 0) : []

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <ErrorCard message={error} onRetry={() => load()} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Welcome Banner */}
      <div className="rounded-2xl p-7 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #3b0764 0%, #5b21b6 40%, #7c3aed 75%, #8b5cf6 100%)' }}>
        <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full opacity-[0.08] bg-white" />
        <div className="absolute right-16 bottom-0 w-36 h-36 rounded-full opacity-[0.05] bg-white" />
        <div className="absolute left-1/2 top-0 w-80 h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(167,139,250,0.18) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/20">
                <Shield size={14} className="text-purple-100" />
              </div>
              <p className="text-purple-200 text-xs font-bold tracking-widest uppercase">Admin · Operations Hub</p>
            </div>
            <h1 className="font-display text-2xl font-extrabold mb-1">Operational Overview</h1>
            <p className="text-purple-200 text-sm">
              {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              <span className="font-mono font-bold">{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </p>
          </div>
          {/* Refresh control */}
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg ring-1 ring-white/20 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            {lastUpdated && (
              <p className="text-[11px] text-purple-300">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div>
        <SectionHeader label="Platform Summary" />
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {loading ? [...Array(7)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Total Students"   value={stats?.overview?.totalStudents ?? 0}   subtitle={`${stats?.overview?.activeStudents ?? 0} active`} icon={GraduationCap} color="purple" />
              <StatCard title="Active Students"  value={stats?.overview?.activeStudents ?? 0}   icon={UserCheck}    color="green"  />
              <StatCard title="Total Courses"    value={stats?.overview?.totalCourses ?? 0}     icon={BookOpen}     color="blue"   />
              <StatCard title="Active Batches"   value={stats?.overview?.activeBatches ?? 0}    icon={Layers}       color="indigo" />
              <StatCard title="Assignments"      value={stats?.overview?.totalAssignments ?? 0} icon={ClipboardList} color="yellow" />
              <StatCard title="Quizzes"          value={stats?.overview?.totalQuizzes ?? 0}     icon={Brain}        color="purple" />
              <StatCard title="Placement Drives" value={stats?.overview?.placementDrives ?? 0}  icon={Briefcase}    color="green"  />
            </>
          )}
        </div>
      </div>

      {/* Student Performance */}
      <div>
        <SectionHeader label="Student Performance" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? [...Array(3)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Average Performance"  value={`${Math.round(stats?.performance?.averagePerformancePct ?? 0)}%`} icon={TrendingUp}    color="purple" />
              <StatCard title="At-Risk Students"     value={stats?.performance?.atRiskCount ?? 0}                              icon={AlertTriangle} color="yellow" />
              <StatCard title="Needs Improvement"    value={stats?.performance?.needsImprovementCount ?? 0}                    icon={AlertTriangle} color="blue"   />
            </>
          )}
        </div>
      </div>

      {/* Attendance & Assignments */}
      <div>
        <SectionHeader label="Attendance & Assignments" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? [...Array(4)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Overall Attendance"   value={`${stats?.attendance?.overallPct ?? 0}%`}        icon={Calendar}      color="blue"   />
              <StatCard title="Healthy"              value={stats?.attendance?.healthy ?? 0}                  icon={UserCheck}     color="green"  />
              <StatCard title="Pending Submissions"  value={stats?.assignments?.pendingSubmissions ?? 0}      icon={ClipboardList} color="yellow" />
              <StatCard title="Graded Submissions"   value={stats?.assignments?.graded ?? 0}                  icon={ClipboardList} color="purple" />
            </>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={17} className="text-purple-500" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Performance Trend</h3>
          </div>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : (stats?.performance?.trend || []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No performance data yet</div>
          ) : (
            <PerformanceTrendChart trend={stats.performance.trend} />
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={17} className="text-purple-500" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Attendance Breakdown</h3>
          </div>
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
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={17} className="text-purple-500" />
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Upcoming Sessions</h3>
        </div>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (stats?.upcomingSessions || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming sessions in the next 7 days</p>
        ) : (
          <div className="space-y-3">
            {stats.upcomingSessions.map(s => (
              <div key={s.classId} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10 border border-purple-100/60 dark:border-purple-800/20">
                <div className="flex-shrink-0 px-2 py-1.5 rounded-lg text-center min-w-[52px] bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-purple-600">{s.date ? format(new Date(s.date), 'EEE') : ''}</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{s.date ? format(new Date(s.date), 'dd') : ''}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.batchName} · {s.date ? format(new Date(s.date), 'h:mm a') : ''}</p>
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Recent Activity</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {(stats?.recentActivity || []).map((item, i) => {
                const cfg = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.NEW_STUDENT
                const Icon = cfg.icon
                return (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ''}</p>
                    </div>
                  </div>
                )
              })}
              {(!stats?.recentActivity?.length) && (
                <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Operational Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href, color }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`bg-gradient-to-r ${color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200`}
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
