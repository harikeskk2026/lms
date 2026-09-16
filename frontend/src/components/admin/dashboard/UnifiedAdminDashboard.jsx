'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, Users, BookOpen, Layers, Briefcase,
  UserPlus, FileText, Calendar, ExternalLink, ChevronRight,
  AlertTriangle, ClipboardList, CheckCircle2, Zap,
  ArrowRight, RefreshCw, Activity, TrendingUp, LayoutDashboard,
  FileEdit, HelpCircle, Video, Bell
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { ErrorCard } from '@/components/student/SkeletonCard'
import toast from 'react-hot-toast'
import { AttendanceBreakdownChart } from '@/components/admin/dashboard/PerformanceCharts'

const AC = { healthy: '#22c55e', atRisk: '#f59e0b', critical: '#ef4444' }
const REFRESH = 60000

const ACT_ICONS = {
  NEW_STUDENT:  { icon: UserPlus,      color: 'bg-purple-100 text-purple-600' },
  SUBMISSION:   { icon: ClipboardList, color: 'bg-violet-100 text-violet-600' },
  QUIZ_ATTEMPT: { icon: CheckCircle2,  color: 'bg-fuchsia-100 text-fuchsia-600' },
}

const QA = [
  { label: 'Add Student',    icon: UserPlus,  href: '/admin/students',            g: 'from-purple-600 to-violet-600' },
  { label: 'Add Trainer',    icon: Users,     href: '/admin/trainers?action=add', g: 'from-violet-600 to-indigo-600' },
  { label: 'Create Course',  icon: BookOpen,  href: '/admin/course-catalog',      g: 'from-indigo-600 to-purple-600' },
  { label: 'Create Batch',   icon: Layers,    href: '/admin/batches',             g: 'from-purple-700 to-fuchsia-600' },
  { label: 'Schedule Class', icon: Calendar,  href: '/admin/meeting-links',       g: 'from-fuchsia-600 to-purple-700' },
  { label: 'View Reports',   icon: FileText,  href: '/admin/reports',             g: 'from-violet-700 to-purple-800' },
]

function SecTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
        <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wider">{children}</h3>
      </div>
      {action}
    </div>
  )
}

function KCard({ title, value, subtitle, icon: Icon, accent, loading }) {
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
    purple: 'border-purple-100 dark:border-purple-900/40',
    green:  'border-green-100 dark:border-emerald-900/40',
    blue:   'border-blue-100 dark:border-blue-900/40',
    amber:  'border-amber-100 dark:border-amber-900/40'
  }
  const vs  = {
    purple: 'text-purple-700 dark:text-purple-300',
    green:  'text-green-700 dark:text-emerald-300',
    blue:   'text-blue-700 dark:text-blue-300',
    amber:  'text-amber-700 dark:text-amber-300'
  }
  const a = accent || 'purple'
  if (loading) return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm animate-pulse">
      <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl mb-3" />
      <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
    </div>
  )
  return (
    <div className={['bg-white dark:bg-gray-800/90 rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200', bds[a]].join(' ')}>
      <div className={['w-10 h-10 rounded-xl flex items-center justify-center mb-3', bgs[a]].join(' ')}>
        {Icon && <Icon size={20} className={ics[a]} />}
      </div>
      <p className={['text-2xl font-extrabold leading-none mb-1', vs[a]].join(' ')}>{value}</p>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function Card({ children, className }) {
  return <div className={['bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm', className || ''].join(' ')}>{children}</div>
}

function PRow({ icon: Icon, iconCls, bgCls, label, count, href, router }) {
  if (!count) return null
  return (
    <button onClick={() => router.push(href)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors text-left group">
      <div className={['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bgCls].join(' ')}>
        <Icon size={15} className={iconCls} />
      </div>
      <div className="flex-1 min-w-0"><p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{label}</p></div>
      <span className={['text-xs font-bold px-2 py-0.5 rounded-full', bgCls, iconCls].join(' ')}>{count}</span>
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-purple-400 flex-shrink-0" />
    </button>
  )
}

function LiveClock() {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <>
      <p className="text-xs text-purple-100 opacity-70">{clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <p className="font-mono text-amber-300 font-bold text-lg">{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
    </>
  )
}

let dashCache = null

export default function UnifiedAdminDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const isSA = user?.role === 'SUPERADMIN'
  const [stats, setStats]           = useState(dashCache)
  const [loading, setLoading]       = useState(!dashCache)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState(null)

  const load = useCallback((silent, manual) => {
    if (!silent && !dashCache) setLoading(true); else setRefreshing(true)
    setError(null)
    ;(isSA ? adminApi.getSuperAdminDashboard() : adminApi.getDashboard())
      .then(r => {
        const d = r.data?.data ?? r.data
        if (d) {
          dashCache = d
          setStats({ ...d })
        }
        if (manual) toast.success('Refreshed')
      })
      .catch(e => {
        if (!dashCache) setError(e?.response?.data?.message || 'Failed to load dashboard')
      })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [isSA])

  useEffect(() => {
    load(!!dashCache, false)
    const id = setInterval(() => load(true, false), REFRESH)
    return () => clearInterval(id)
  }, [load])

  const ov = stats?.overview    || {}
  const at = stats?.attendance  || {}
  const as = stats?.assignments || {}
  const pl = stats?.placement   || {}
  const dr = stats?.drafts      || {}

  const TS = ov.totalStudents  ?? 0
  const actS = ov.activeStudents ?? 0
  const TT = ov.totalTrainers  ?? 0
  const actT = ov.activeTrainers ?? 0
  const TC = ov.totalCourses   ?? 0
  const TB = ov.totalBatches   ?? ov.activeBatches ?? 0
  const AB = ov.activeBatches  ?? 0

  const pie = stats ? [
    { name: 'Healthy',  value: at.healthy  || 0, color: AC.healthy },
    { name: 'At Risk',  value: at.atRisk   || 0, color: AC.atRisk },
    { name: 'Critical', value: at.critical || 0, color: AC.critical },
  ].filter(d => d.value > 0) : []

  const totAtt = (at.healthy || 0) + (at.atRisk || 0) + (at.critical || 0)
  const pct = at.overallPct ?? 0
  const hasPend = (as.pendingSubmissions > 0) ||
                  (as.lateSubmissions > 0) ||
                  (dr.assignments > 0) ||
                  (dr.courses > 0) ||
                  (dr.quizzes > 0) ||
                  (dr.recordedSessions > 0) ||
                  (dr.announcements > 0) ||
                  (at.atRisk > 0) ||
                  (at.critical > 0)
  const greet = isSA ? 'Super Admin' : 'Admin'

  if (error) return <div className="max-w-7xl mx-auto space-y-6"><ErrorCard message={error} onRetry={() => load(false, false)} /></div>

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Welcome Banner */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#3b0764 0%,#5b21b6 45%,#7c3aed 80%,#8b5cf6 100%)', minHeight: '130px' }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.9) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-xs font-bold tracking-widest uppercase mb-2">{greet} Console</p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1">Welcome back, {greet} 👋</h1>
            <p className="text-sm text-purple-200 opacity-80">Here is what is happening in your LMS today.</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <LiveClock />
            <button onClick={() => load(false, true)} disabled={refreshing} className="flex items-center gap-1 mt-1 text-xs text-purple-200 opacity-60 hover:opacity-100">
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KCard loading={loading} title="Students" value={TS.toLocaleString()} subtitle={actS.toLocaleString() + ' active'} icon={GraduationCap} accent="purple" />
        <KCard loading={loading} title="Trainers" value={TT.toLocaleString()} subtitle={actT.toLocaleString() + ' active'} icon={Users}         accent="blue" />
        <KCard loading={loading} title="Courses"  value={TC.toLocaleString()} icon={BookOpen} accent="green" />
        <KCard loading={loading} title="Batches"  value={TB.toLocaleString()} subtitle={AB.toLocaleString() + ' active'} icon={Layers}   accent="amber" />
      </div>

      {/* Pending Actions + Attendance Health */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SecTitle>Pending Actions</SecTitle>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : !hasPend ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 size={32} className="text-green-400" />
              <p className="text-sm text-gray-400 font-medium">All caught up! No pending actions.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <PRow icon={ClipboardList} iconCls="text-red-600"    bgCls="bg-red-50"    label="Assignments awaiting approval"       count={as.pendingSubmissions} href="/admin/assignments" router={router} />
              <PRow icon={AlertTriangle} iconCls="text-amber-600"  bgCls="bg-amber-50"  label="Late submissions awaiting approval"  count={as.lateSubmissions}    href="/admin/assignments" router={router} />
              <PRow icon={FileEdit}      iconCls="text-purple-600" bgCls="bg-purple-50" label="Draft assignments"                   count={dr.assignments}        href="/admin/assignments" router={router} />
              <PRow icon={BookOpen}      iconCls="text-blue-600"   bgCls="bg-blue-50"   label="Draft courses"                       count={dr.courses}            href="/admin/course-catalog" router={router} />
              <PRow icon={HelpCircle}    iconCls="text-indigo-600" bgCls="bg-indigo-50" label="Draft quizzes"                       count={dr.quizzes}            href="/admin/quizzes" router={router} />
              <PRow icon={Video}         iconCls="text-teal-600"   bgCls="bg-teal-50"   label="Draft recorded sessions"             count={dr.recordedSessions}   href="/admin/recorded-sessions" router={router} />
              <PRow icon={Bell}          iconCls="text-amber-600"  bgCls="bg-amber-50"  label="Draft announcements"                 count={dr.announcements}      href="/admin/announcements" router={router} />
              <PRow icon={TrendingUp}    iconCls="text-orange-600" bgCls="bg-orange-50" label="Students below attendance threshold" count={at.critical}           href="/admin/attendance"  router={router} />
              <PRow icon={AlertTriangle} iconCls="text-yellow-600" bgCls="bg-yellow-50" label="Students at attendance risk"         count={at.atRisk}             href="/admin/attendance"  router={router} />
            </div>
          )}
        </Card>

        <Card className="p-5 overflow-hidden">
          <SecTitle>Attendance Health</SecTitle>
          {loading ? (<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />)
           : pie.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Activity size={32} className="text-gray-200" />
              <p className="text-sm text-gray-400">No attendance data yet</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 dark:bg-emerald-950/40 rounded-xl border border-green-100 dark:border-emerald-900/40">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0"><TrendingUp size={18} className="text-white" /></div>
                <div>
                  <p className="text-2xl font-extrabold text-green-700 dark:text-emerald-300 leading-none">{pct}%</p>
                  <p className="text-xs text-green-600 dark:text-emerald-400 font-medium mt-0.5">Overall - {totAtt} students tracked</p>
                </div>
              </div>
              <AttendanceBreakdownChart data={pie} />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Healthy',  val: at.healthy  || 0, c: 'text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-950/40 border-green-100 dark:border-emerald-900/40' },
                  { label: 'At Risk',  val: at.atRisk   || 0, c: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40' },
                  { label: 'Critical', val: at.critical || 0, c: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/40' },
                ].map(s => (
                  <div key={s.label} className={['rounded-xl p-2.5 border text-center', s.c].join(' ')}>
                    <p className="text-base font-extrabold leading-none">{s.val}</p>
                    <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Today's Sessions + Placement Overview */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SecTitle action={<button onClick={() => router.push('/admin/meeting-links')} className="flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">View All <ArrowRight size={13} /></button>}>Today&apos;s Sessions</SecTitle>
          {loading ? (
            <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-14 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : !(stats?.upcomingSessions?.length) ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Calendar size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No classes scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.upcomingSessions.map(s => {
                const d = s.date ? new Date(s.date) : null
                const st = s.status || 'UPCOMING'
                const statusCfg = {
                  LIVE:      { label: 'Live',      cls: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50',   dot: 'bg-green-500 animate-pulse', rowCls: 'bg-green-50 dark:bg-emerald-950/30 border-green-100 dark:border-emerald-900/40' },
                  COMPLETED: { label: 'Done',       cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',     dot: 'bg-gray-400',                rowCls: 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50' },
                  UPCOMING:  { label: 'Upcoming',   cls: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50', dot: 'bg-purple-500',             rowCls: 'bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40' },
                }[st] || { label: st, cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700', dot: 'bg-gray-400', rowCls: 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50' }
                return (
                  <div key={s.classId} className={['flex items-center gap-3 p-3 rounded-xl border hover:opacity-90 transition-all', statusCfg.rowCls].join(' ')}>
                    <div className="flex-shrink-0 text-center px-2 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm" style={{ minWidth: '46px' }}>
                      <p className="text-[10px] font-bold uppercase text-gray-400 leading-none mb-0.5">{d ? format(d, 'h:mm') : '--'}</p>
                      <p className="text-xs font-extrabold text-gray-700 dark:text-gray-200 leading-none">{d ? format(d, 'a') : ''}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{s.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 truncate">{s.batchName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={['flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', statusCfg.cls].join(' ')}>
                        <span className={['w-1.5 h-1.5 rounded-full', statusCfg.dot].join(' ')} />
                        {statusCfg.label}
                      </span>
                      {s.meetLink && st !== 'COMPLETED' && (
                        <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-emerald-600 whitespace-nowrap">
                          <ExternalLink size={12} /> Join
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SecTitle action={<button onClick={() => router.push('/admin/placement')} className="flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">View Placement <ArrowRight size={13} /></button>}>Placement Overview</SecTitle>
          {loading ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-12 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : !pl.activeDrives ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Briefcase size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No active placement drives</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'Active Drives',       val: pl.activeDrives,       c: 'bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
                { label: 'Available Drives',    val: pl.availableDrives,    c: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300',       dot: 'bg-blue-500' },
                { label: 'Interested Students', val: pl.interestedStudents, c: 'bg-green-50 dark:bg-emerald-950/30 border-green-100 dark:border-emerald-900/40 text-green-700 dark:text-emerald-300',    dot: 'bg-green-500' },
              ].map(row => (
                <div key={row.label} className={['flex items-center justify-between p-3.5 rounded-xl border', row.c].join(' ')}>
                  <div className="flex items-center gap-2.5">
                    <div className={['w-2 h-2 rounded-full', row.dot].join(' ')} />
                    <span className="text-sm font-medium">{row.label}</span>
                  </div>
                  <span className="text-lg font-extrabold leading-none">{(row.val || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SecTitle>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse inline-block" />
              Recent Activity
            </span>
          </SecTitle>
          {loading ? (
            <div className="space-y-3">{[0,1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : !(stats?.recentActivity?.length) ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Zap size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.recentActivity.slice(0, 5).map((item, i) => {
                const cfg = ACT_ICONS[item.type] || ACT_ICONS.NEW_STUDENT
                const Ic = cfg.icon
                return (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors">
                    <div className={['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.color].join(' ')}><Ic size={14} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200 break-words leading-snug">{item.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SecTitle>Quick Actions</SecTitle>
          <div className="grid grid-cols-2 gap-3">
            {QA.map(a => {
              const Ic = a.icon
              return (
                <button key={a.label} id={'quick-action-' + a.label.toLowerCase().replace(/s+/g, '-')} onClick={() => router.push(a.href)} className={['bg-gradient-to-br', a.g, 'text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-105 hover:shadow-lg transition-all duration-200'].join(' ')}>
                  <div style={{ background: 'rgba(255,255,255,0.2)' }} className="w-9 h-9 rounded-xl flex items-center justify-center"><Ic size={18} /></div>
                  <span className="text-xs font-semibold text-center leading-tight">{a.label}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
