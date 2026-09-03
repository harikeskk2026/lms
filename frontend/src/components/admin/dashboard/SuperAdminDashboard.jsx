'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  GraduationCap, UserCheck, Users, BookOpen, Layers, Briefcase, Building,
  UserPlus, FileText, Globe, Activity, Zap, Crown, RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { adminApi } from '@/lib/api'
import { SkeletonStat, ErrorCard } from '@/components/student/SkeletonCard'

const PerformanceTrendChart = dynamic(
  () => import('@/components/admin/dashboard/PerformanceCharts').then(m => m.PerformanceTrendChart),
  { ssr: false, loading: () => <div className="h-40 bg-slate-800 rounded-xl animate-pulse" /> }
)
const AttendanceBreakdownChart = dynamic(
  () => import('@/components/admin/dashboard/PerformanceCharts').then(m => m.AttendanceBreakdownChart),
  { ssr: false, loading: () => <div className="h-40 bg-slate-800 rounded-xl animate-pulse" /> }
)

const ATTENDANCE_COLORS = { healthy: '#22c55e', atRisk: '#f59e0b', critical: '#ef4444' }

const QUICK_ACTIONS = [
  { label: 'Add Student',      icon: UserPlus,  href: '/admin/students',       grad: 'from-amber-500 to-yellow-600' },
  { label: 'Add Trainer',      icon: Users,      href: '/admin/profile',        grad: 'from-slate-600 to-slate-700' },
  { label: 'Create Batch',     icon: Layers,     href: '/admin/batches',        grad: 'from-amber-600 to-orange-600' },
  { label: 'Course Catalog',   icon: BookOpen,   href: '/admin/course-catalog', grad: 'from-slate-700 to-slate-800' },
  { label: 'Placement Drives', icon: Briefcase,  href: '/admin/placement',      grad: 'from-amber-700 to-yellow-700' },
  { label: 'System Reports',   icon: FileText,   href: '/admin/reports',        grad: 'from-slate-500 to-slate-600' },
]

const REFRESH_INTERVAL_MS = 60_000

function DarkStatCard({ title, value, subtitle, icon: Icon, accent = 'amber' }) {
  const accents = {
    amber: { ring: 'ring-amber-500/30',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  val: 'text-amber-100' },
    gold:  { ring: 'ring-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400', val: 'text-yellow-100' },
    slate: { ring: 'ring-slate-500/30',  bg: 'bg-slate-500/10',  text: 'text-slate-300',  val: 'text-slate-100' },
    green: { ring: 'ring-green-500/30',  bg: 'bg-green-500/10',  text: 'text-green-400',  val: 'text-green-100' },
    blue:  { ring: 'ring-blue-500/30',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   val: 'text-blue-100' },
  }
  const c = accents[accent] || accents.amber
  return (
    <div
      className={`relative rounded-2xl p-4 border border-white/5 ring-1 ${c.ring} hover:scale-[1.02] transition-transform duration-200 overflow-hidden`}
      style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(245,158,11,0.04) 0%, transparent 70%)' }} />
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        {Icon && <Icon size={18} className={c.text} />}
      </div>
      <p className={`text-2xl font-extrabold font-display ${c.val}`}>{value}</p>
      <p className="text-xs font-semibold text-slate-400 mt-0.5">{title}</p>
      {subtitle && <p className="text-[11px] text-slate-600 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function CommandCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-white/5 overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 100%)' }}
    >
      {children}
    </div>
  )
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [stats, setStats]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [clock, setClock]             = useState(new Date())

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    adminApi.getSuperAdminDashboard()
      .then(r => {
        setStats(r.data.data)
        setLastUpdated(new Date())
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load SuperAdmin dashboard'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

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

      {/* Hero Banner */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #0f2044 100%)', minHeight: 148 }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-amber-500/10" />
        <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full border border-amber-500/15" />
        <div className="absolute right-24 bottom-0 w-32 h-32 rounded-full border border-slate-600/20" />
        <div className="absolute right-0 top-0 w-96 h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 p-7 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center ring-1 ring-amber-500/40">
                <Crown size={14} className="text-amber-400" />
              </div>
              <p className="text-amber-400/80 text-xs font-bold tracking-widest uppercase">Super Admin · Command Center</p>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white mb-1">System-Wide Overview</h1>
            <p className="text-slate-400 text-sm">
              {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              <span className="font-mono font-bold text-amber-400/70">{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </p>
          </div>
          {/* Refresh control */}
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg ring-1 ring-amber-500/30 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            {lastUpdated && (
              <p className="text-[11px] text-slate-600">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Platform Overview */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 rounded-full bg-amber-500" />
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">Platform Overview</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {loading ? [...Array(8)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <DarkStatCard title="Total Students"  value={stats?.overview?.totalStudents  ?? 0} icon={GraduationCap} accent="amber" />
              <DarkStatCard title="Active Students" value={stats?.overview?.activeStudents  ?? 0} icon={UserCheck}    accent="green" />
              <DarkStatCard title="Total Trainers"  value={stats?.overview?.totalTrainers  ?? 0} icon={Users}        accent="blue"  />
              <DarkStatCard title="Active Trainers" value={stats?.overview?.activeTrainers  ?? 0} icon={UserCheck}   accent="green" />
              <DarkStatCard title="Total Batches"   value={stats?.overview?.totalBatches   ?? 0} icon={Layers}       accent="slate" />
              <DarkStatCard title="Active Batches"  value={stats?.overview?.activeBatches  ?? 0} icon={Layers}       accent="amber" />
              <DarkStatCard title="Total Courses"   value={stats?.overview?.totalCourses   ?? 0} icon={BookOpen}     accent="gold"  />
              <DarkStatCard title="Colleges"         value={stats?.overview?.totalColleges  ?? 0} icon={Building}     accent="blue"  />
            </>
          )}
        </div>
      </div>

      {/* Performance & Analytics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="font-display font-bold text-white">System Performance Trend</h3>
          </div>
          {loading ? (
            <div className="h-40 bg-slate-800 rounded-xl animate-pulse" />
          ) : (stats?.performance?.trend || []).length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Activity size={28} className="text-slate-600" />
              <p className="text-sm text-slate-500">No performance data yet</p>
            </div>
          ) : (
            <PerformanceTrendChart trend={stats.performance.trend} />
          )}
        </CommandCard>

        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="font-display font-bold text-white">Student Attendance Health</h3>
          </div>
          {loading ? (
            <div className="h-40 bg-slate-800 rounded-xl animate-pulse" />
          ) : attendancePieData.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Globe size={28} className="text-slate-600" />
              <p className="text-sm text-slate-500">No attendance data yet</p>
            </div>
          ) : (
            <AttendanceBreakdownChart data={attendancePieData} />
          )}
        </CommandCard>
      </div>

      {/* Placement Overview */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 rounded-full bg-amber-500" />
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">Placement Drives Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? [...Array(3)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <DarkStatCard title="Active Placement Drives"  value={stats?.placement?.activeDrives       ?? 0} icon={Briefcase} accent="amber" />
              <DarkStatCard title="Interested Students"       value={stats?.placement?.interestedStudents ?? 0} icon={UserCheck} accent="green" />
              <DarkStatCard title="Total Available Drives"    value={stats?.placement?.availableDrives    ?? 0} icon={Briefcase} accent="gold"  />
            </>
          )}
        </div>
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="font-display font-bold text-white">Recent System Activity</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {(stats?.recentActivity || []).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-500/10 ring-1 ring-amber-500/20">
                    <Zap size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{item.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ''}</p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity?.length) && (
                <p className="text-sm text-slate-500 text-center py-6">No recent system activity</p>
              )}
            </div>
          )}
        </CommandCard>

        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="font-display font-bold text-white">System Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href, grad }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`bg-gradient-to-br ${grad} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/30 transition-all duration-200 ring-1 ring-white/10`}
              >
                <div className="w-9 h-9 bg-black/20 rounded-xl flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold text-center">{label}</span>
              </button>
            ))}
          </div>
        </CommandCard>
      </div>
    </div>
  )
}
