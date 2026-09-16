'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layers, Users, Calendar, ClipboardList, CheckCircle2, BookOpen,
  Clock, ExternalLink, ArrowRight, UserCheck, Award, GraduationCap,
  PenLine, Target, RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { adminApi } from '@/lib/api'
import { SkeletonStat, ErrorCard } from '@/components/student/SkeletonCard'
import toast from 'react-hot-toast'

const QUICK_ACTIONS = [
  { label: 'Mark Attendance',   icon: Calendar,      href: '/admin/attendance',     grad: 'from-purple-600 to-violet-600'  },
  { label: 'Create Assignment', icon: ClipboardList, href: '/admin/assignments',    grad: 'from-violet-600 to-purple-700'  },
  { label: 'Grade Submissions', icon: CheckCircle2,  href: '/admin/assignments',    grad: 'from-purple-700 to-fuchsia-600' },
  { label: 'Manage Syllabus',   icon: BookOpen,      href: '/admin/course-catalog', grad: 'from-fuchsia-600 to-purple-600' },
  { label: 'View Students',     icon: Users,         href: '/admin/students',       grad: 'from-purple-600 to-violet-700'  },
  { label: 'View Batches',      icon: Layers,        href: '/admin/batches',        grad: 'from-violet-700 to-purple-800'  },
]

const REFRESH_INTERVAL_MS = 60_000

function TrainerStatCard({ title, value, subtitle, icon: Icon, accent = 'purple' }) {
  const accents = {
    purple:  { ring: 'ring-purple-200 dark:ring-purple-800/60',  bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-300',  val: 'text-gray-900 dark:text-white' },
    violet:  { ring: 'ring-violet-200 dark:ring-violet-800/60',  bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-600 dark:text-violet-300',  val: 'text-gray-900 dark:text-white' },
    fuchsia: { ring: 'ring-fuchsia-200 dark:ring-fuchsia-800/60',bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',text: 'text-fuchsia-600 dark:text-fuchsia-300', val: 'text-gray-900 dark:text-white' },
    amber:   { ring: 'ring-amber-200 dark:ring-amber-800/60',    bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-300',    val: 'text-gray-900 dark:text-white' },
    green:   { ring: 'ring-green-200 dark:ring-green-800/60',    bg: 'bg-green-100 dark:bg-green-900/30',    text: 'text-green-600 dark:text-green-300',    val: 'text-gray-900 dark:text-white' },
  }
  const c = accents[accent] || accents.purple
  return (
    <div className={`glass-card p-5 border ring-1 ${c.ring} hover:scale-[1.02] transition-transform duration-200`}>
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        {Icon && <Icon size={20} className={c.text} />}
      </div>
      <p className={`text-2xl font-extrabold font-display ${c.val}`}>{value}</p>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-0.5">{title}</p>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function SectionHeader({ label, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
      <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon size={15} className="text-purple-500" />} {label}
      </h3>
    </div>
  )
}

export default function TrainerDashboardView() {
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
    adminApi.getTrainerDashboard()
      .then(r => {
        const data = r.data?.data || r.data
        if (data) setStats({ ...data })
        setLastUpdated(new Date())
        if (isManual) toast.success('Dashboard refreshed')
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load Trainer dashboard'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

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
      <div className="rounded-2xl p-5 sm:p-7 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 40%, #7c3aed 75%, #8b5cf6 100%)' }}>
        <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full opacity-[0.07] bg-white" />
        <div className="absolute right-16 bottom-0 w-36 h-36 rounded-full opacity-[0.04] bg-white" />
        <div className="absolute right-0 top-0 w-96 h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(167,139,250,0.15) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 20px)' }} />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-300/20 flex items-center justify-center ring-1 ring-purple-300/30">
                <Award size={14} className="text-purple-200" />
              </div>
              <p className="text-purple-200 text-xs font-bold tracking-widest uppercase">Trainer</p>
            </div>
            <h1 className="font-display text-2xl font-extrabold mb-1">My Teaching Dashboard</h1>
            <p className="text-purple-200 text-sm">
              {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              <span className="font-mono font-bold">{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div>
        <SectionHeader label="My Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {loading ? [...Array(6)].map((_, i) => <SkeletonStat key={i} />) : (
            <>
              <TrainerStatCard title="My Batches"       value={stats?.overview?.myBatchesCount     ?? 0} icon={Layers}        accent="purple"  />
              <TrainerStatCard title="My Students"      value={stats?.overview?.myStudentsCount    ?? 0} icon={GraduationCap} accent="violet"  />
              <TrainerStatCard title="Today's Sessions" value={stats?.overview?.todaySessionsCount ?? 0} icon={Calendar}      accent="fuchsia" />
              <TrainerStatCard title="Pending Grading"  value={stats?.overview?.pendingGradingCount ?? 0} icon={ClipboardList} accent="amber"  />
              <TrainerStatCard title="Avg Attendance"   value={`${stats?.overview?.attendancePct ?? 0}%`} icon={UserCheck}   accent="green"   />
              <TrainerStatCard title="My Courses"       value={stats?.overview?.myCoursesCount     ?? 0} icon={BookOpen}      accent="purple"  />
            </>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-display font-bold text-gray-800 dark:text-white">Today&apos;s Live Schedule</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg font-mono">
              {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (stats?.todaySchedule || []).length === 0 ? (
          <div className="p-5 sm:p-8 text-center bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
            <Clock size={28} className="text-purple-300 dark:text-purple-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">No sessions scheduled for today</p>
            <p className="text-xs text-purple-500/80 dark:text-purple-400 mt-1">Check back later or review your batch schedule in Courses.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.todaySchedule.map(s => (
              <div key={s.sessionOrClassId} className="flex items-center justify-between p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 hover:border-purple-200 dark:hover:border-purple-800/60 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold font-mono shadow-sm">
                    {s.time}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{s.courseName}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{s.batchName} · Status: <span className="font-semibold text-purple-600 dark:text-purple-400">{s.status}</span></p>
                  </div>
                </div>
                {s.meetLink ? (
                  <a href={s.meetLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                    <ExternalLink size={14} /> Join Class
                  </a>
                ) : (
                  <button onClick={() => router.push('/admin/attendance')} className="text-xs font-semibold text-purple-600 hover:underline">
                    View Attendance
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Assigned Batches */}
      <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-display font-bold text-gray-800 dark:text-white">My Assigned Batches</h3>
            </div>
            <button onClick={() => router.push('/admin/batches')} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              View All <ArrowRight size={13} />
            </button>
          </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (stats?.myBatches || []).length === 0 ? (
          <div className="text-center py-6 bg-purple-50/40 dark:bg-purple-950/10 rounded-2xl border border-purple-100 dark:border-purple-900/20">
            <Layers size={26} className="text-purple-300 dark:text-purple-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No batches assigned yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.myBatches.map(b => (
              <div key={b.batchId}
                onClick={() => router.push('/admin/batches')}
                className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-gray-900"
              >
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider break-words">{b.courseName}</span>
                  <span className="text-xs text-gray-400 font-medium ml-2 flex-shrink-0">{b.studentCount} Students</span>
                </div>
                 <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 break-words">{b.batchName}</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Attendance</span>
                    <span className={`font-bold ${b.attendancePct >= 75 ? 'text-green-600 dark:text-green-400' : b.attendancePct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>{b.attendancePct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${b.attendancePct >= 75 ? 'bg-green-500' : b.attendancePct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${b.attendancePct}%` }}
                    />
                  </div>
                  {b.progressPct > 0 && (
                    <>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{b.progressPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${b.progressPct}%` }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Evaluations & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <PenLine size={17} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-display font-bold text-gray-800 dark:text-white">Pending Assignments to Grade</h3>
            </div>
            <button onClick={() => router.push('/admin/assignments')} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
              Manage
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : (stats?.pendingGrading || []).length === 0 ? (
            <div className="text-center py-5 sm:py-8 bg-green-50/60 dark:bg-green-950/10 rounded-2xl border border-green-100 dark:border-green-900/20">
              <CheckCircle2 size={26} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">All submissions evaluated!</p>
              <p className="text-xs text-green-600/60 dark:text-green-500/50 mt-0.5">No pending items.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.pendingGrading.map(item => (
                <div key={item.submissionId} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors">
                  <div className="min-w-0 mr-3">
                     <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">{item.assignmentTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.studentName} · {item.batchName}
                      {item.submittedAt && <span className="ml-1 text-gray-300 dark:text-gray-600">· {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}</span>}
                    </p>
                  </div>
                  <button onClick={() => router.push(item.assignmentId ? `/admin/assignments/${item.assignmentId}` : '/admin/assignments')}
                    className="flex-shrink-0 px-3 py-1 text-xs font-semibold text-purple-600 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors">
                    Grade
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={17} className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Trainer Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href, grad }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`bg-gradient-to-r ${grad} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200`}
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
