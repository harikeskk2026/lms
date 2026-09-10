'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  GraduationCap, UserCheck, Users, BookOpen, Layers, Briefcase,
  UserPlus, FileText, Globe, Activity, Zap, Crown, RefreshCw, ShieldCheck
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { adminApi } from '@/lib/api'
import { SkeletonStat, ErrorCard } from '@/components/student/SkeletonCard'

import toast from 'react-hot-toast'

import { PerformanceTrendChart, AttendanceBreakdownChart } from '@/components/admin/dashboard/PerformanceCharts'

const ATTENDANCE_COLORS = { healthy: '#22c55e', atRisk: '#f59e0b', critical: '#ef4444' }

const QUICK_ACTIONS = [
  { label: 'Add Student',      icon: UserPlus,  href: '/admin/students',       grad: 'from-purple-600 to-violet-600' },
  { label: 'Add Trainer',      icon: Users,     href: '/admin/trainers?action=add',        grad: 'from-violet-600 to-indigo-600' },
  { label: 'Manage Admins',    icon: ShieldCheck, href: '/admin/admins',       grad: 'from-red-500 to-orange-500' },
  { label: 'Create Batch',     icon: Layers,    href: '/admin/batches',        grad: 'from-indigo-600 to-purple-600' },
  { label: 'Courses',          icon: BookOpen,  href: '/admin/course-catalog', grad: 'from-purple-700 to-fuchsia-600' },
  { label: 'Placement Drives', icon: Briefcase, href: '/admin/placement',      grad: 'from-purple-600 to-violet-700' },
  { label: 'System Reports',   icon: FileText,  href: '/admin/reports',        grad: 'from-violet-700 to-purple-800' },
]

const REFRESH_INTERVAL_MS = 60_000

function StatCard({ title, value, subtitle, icon: Icon, accent = 'purple' }) {
  const accents = {
    purple: { bg: 'bg-purple-100/70 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200/80 dark:border-purple-800/40' },
    amber:  { bg: 'bg-amber-100/70 dark:bg-amber-900/30',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200/80 dark:border-amber-800/40' },
    gold:   { bg: 'bg-yellow-100/70 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200/80 dark:border-yellow-800/40' },
    slate:  { bg: 'bg-indigo-100/70 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200/80 dark:border-indigo-800/40' },
    green:  { bg: 'bg-green-100/70 dark:bg-green-900/30',   text: 'text-green-600 dark:text-green-400',   border: 'border-green-200/80 dark:border-green-800/40' },
    blue:   { bg: 'bg-blue-100/70 dark:bg-blue-900/30',     text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-200/80 dark:border-blue-800/40' },
  }
  const c = accents[accent] || accents.purple
  return (
    <div className={`bg-white dark:bg-gray-800/90 rounded-2xl p-4 space-y-2 border ${c.border} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200`}>
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
        {Icon && <Icon size={18} className={c.text} />}
      </div>
      <p className="text-2xl font-extrabold font-display text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</p>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function CommandCard({ children, className = '' }) {
  return (
    <div className={`glass-card ${className}`}>
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

  const load = useCallback((silent = false, isManual = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    adminApi.getSuperAdminDashboard()
      .then(r => {
        const data = r.data?.data || r.data
        if (data) setStats({ ...data })
        setLastUpdated(new Date())
        if (isManual) toast.success('Dashboard refreshed')
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
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #1e1b4b 100%)', minHeight: 148 }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-amber-400/20" />
        <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full border border-amber-400/20" />
        <div className="absolute right-24 bottom-0 w-32 h-32 rounded-full border border-white/10" />

        <div className="relative z-10 p-5 sm:p-7 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center ring-1 ring-amber-400/40">
                <Crown size={14} className="text-amber-300" />
              </div>
              <p className="text-amber-300/90 text-xs font-bold tracking-widest uppercase">Super Admin</p>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white mb-1">System-Wide Overview</h1>
            <p className="text-purple-200 text-sm">
              {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              <span className="font-mono font-bold text-amber-300">{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Platform Overview */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">Platform Overview</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {loading ? [...Array(7)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Total Students"  value={stats?.overview?.totalStudents  ?? 0} icon={GraduationCap} accent="purple" />
              <StatCard title="Active Students" value={stats?.overview?.activeStudents  ?? 0} icon={UserCheck}    accent="green"  />
              <StatCard title="Total Trainers"  value={stats?.overview?.totalTrainers  ?? 0} icon={Users}        accent="blue"   />
              <StatCard title="Active Trainers" value={stats?.overview?.activeTrainers  ?? 0} icon={UserCheck}   accent="green"  />
              <StatCard title="Total Batches"   value={stats?.overview?.totalBatches   ?? 0} icon={Layers}       accent="slate"  />
              <StatCard title="Active Batches"  value={stats?.overview?.activeBatches  ?? 0} icon={Layers}       accent="amber"  />
              <StatCard title="Total Courses"   value={stats?.overview?.totalCourses   ?? 0} icon={BookOpen}     accent="gold"   />
            </>
          )}
        </div>
      </div>

      {/* Performance & Analytics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-purple-600" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">System Performance Trend</h3>
          </div>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : (stats?.performance?.trend || []).length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Activity size={28} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No performance data yet</p>
            </div>
          ) : (
            <PerformanceTrendChart trend={stats.performance.trend} />
          )}
        </CommandCard>

        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-purple-600" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Student Attendance Health</h3>
          </div>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : attendancePieData.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Globe size={28} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No attendance data yet</p>
            </div>
          ) : (
            <AttendanceBreakdownChart data={attendancePieData} />
          )}
        </CommandCard>
      </div>

      {/* Placement Overview */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">Placement Drives Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? [...Array(3)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <StatCard title="Active Placement Drives"  value={stats?.placement?.activeDrives       ?? 0} icon={Briefcase} accent="purple" />
              <StatCard title="Interested Students"       value={stats?.placement?.interestedStudents ?? 0} icon={UserCheck} accent="green"  />
              <StatCard title="Total Available Drives"    value={stats?.placement?.availableDrives    ?? 0} icon={Briefcase} accent="amber"  />
            </>
          )}
        </div>
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-purple-600" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Recent System Activity</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {(stats?.recentActivity || []).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <Zap size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ''}</p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity?.length) && (
                <p className="text-sm text-gray-400 text-center py-6">No recent system activity</p>
              )}
            </div>
          )}
        </CommandCard>

        <CommandCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-purple-600" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">System Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href, grad }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`bg-gradient-to-br ${grad} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.02] hover:shadow-lg transition-all duration-200`}
              >
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
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
