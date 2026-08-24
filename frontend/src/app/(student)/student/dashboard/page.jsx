'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import {
  Calendar, ClipboardList, Brain, BookOpen, Play,
  FileText, Download, Star, ChevronRight, CheckCircle,
  Circle, Flame, ExternalLink, Bell
} from 'lucide-react'
import { useDashboard } from '@/hooks/useStudentDashboard'
import ProgressRing from '@/components/student/ProgressRing'
import ActivityFeed from '@/components/student/ActivityFeed'
import { SkeletonStat } from '@/components/student/SkeletonCard'
import { studentApi } from '@/lib/api'

// ─── Countdown timer component ────────────────────────────────────────────────
function Countdown({ targetDate }) {
  const [diff, setDiff] = useState(0)
  useEffect(() => {
    const update = () => setDiff(Math.max(0, new Date(targetDate) - new Date()))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [targetDate])

  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  if (diff === 0) return <span className="text-green-600 font-bold">Live Now!</span>
  return (
    <span className="font-mono text-2xl font-bold text-brand-600 dark:text-brand-400">
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  )
}

// ─── Tiny sparkline ───────────────────────────────────────────────────────────
function Sparkline({ scores }) {
  if (!scores.length) return null
  const max = Math.max(...scores, 1)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {scores.map((s, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-yellow-400 dark:bg-yellow-500"
          style={{ height: `${(s / max) * 100}%`, minHeight: 4 }}
        />
      ))}
    </div>
  )
}

// ─── Status chip helper ────────────────────────────────────────────────────────
function StatusChip({ status, small }) {
  const map = {
    GRADED:    'bg-green-100 text-green-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    PENDING:   'bg-yellow-100 text-yellow-800',
    LATE:      'bg-orange-100 text-orange-700',
    OVERDUE:   'bg-yellow-200 text-yellow-900',
    PASSED:    'bg-green-100 text-green-700',
    FAILED:    'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`chip ${map[status] || 'bg-gray-100 text-gray-600'} ${small ? 'text-[10px] px-2 py-0.5' : ''}`}>
      {status}
    </span>
  )
}

// ─── Material type icon ───────────────────────────────────────────────────────
function MaterialIcon({ type }) {
  const icons = { PDF: '📄', CHEATSHEET: '📋', SLIDE: '🖥️', EBOOK: '📚', OTHER: '📁' }
  return <span className="text-xl">{icons[type] || '📁'}</span>
}

// ─── Module accordion ─────────────────────────────────────────────────────────
function ModuleRow({ mod }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-purple-50 dark:border-purple-900/20 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 text-left">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{mod.title}</span>
          <span className="chip bg-brand-50 text-brand-600 text-[10px] px-1.5 py-0.5">
            {mod.completed}/{mod.total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${mod.pct}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{mod.pct}%</span>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="pb-2 pl-3 space-y-1.5">
          {mod.topics.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-sm">
              {t.isCompleted
                ? <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                : <Circle size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
              }
              <span className={t.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-300'}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main dashboard page ──────────────────────────────────────────────────────
export default function StudentDashboardPage() {
  const { data, loading, error } = useDashboard()
  const [materials, setMaterials] = useState([])
  const [sessions,  setSessions]  = useState([])

  useEffect(() => {
    if (data?.batch) {
      studentApi.getMaterials(data.batch.courseId || 1).then(r => setMaterials(r.data.data || [])).catch(() => {})
      studentApi.getSessions(data.batch.courseId || 1).then(r => setSessions(r.data.data || [])).catch(() => {})
    }
  }, [data?.batch])

  if (loading) return (
    <div className="page-wrapper">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <SkeletonStat key={i} />)}
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="page-wrapper">
      <div className="glass-card p-8 text-center">
        <p className="text-yellow-600 font-semibold">Unable to load dashboard. Please refresh.</p>
      </div>
    </div>
  )

  const { student, batch, attendance, assignments, quizzes, upcomingClasses,
          notifications, syllabusProgress, nextMock, placements, activityFeed } = data

  const todayClass = upcomingClasses.find(c => isToday(new Date(c.date)))

  // Weekly attendance chart (last 14 classes from syllabus modules context — simplified)
  const attendanceChartData = [
    { day: 'Mon', present: 1, absent: 0, late: 0 },
    { day: 'Tue', present: 1, absent: 0, late: 0 },
    { day: 'Wed', present: 1, absent: 0, late: 0 },
    { day: 'Thu', present: 0, absent: 1, late: 0 },
    { day: 'Fri', present: 1, absent: 0, late: 0 },
    { day: 'Mon', present: 1, absent: 0, late: 0 },
    { day: 'Tue', present: 0, absent: 0, late: 1 },
    { day: 'Wed', present: 1, absent: 0, late: 0 },
    { day: 'Thu', present: 1, absent: 0, late: 0 },
    { day: 'Fri', present: 1, absent: 0, late: 0 },
    { day: 'Mon', present: 1, absent: 0, late: 0 },
    { day: 'Tue', present: 0, absent: 1, late: 0 },
    { day: 'Wed', present: 1, absent: 0, late: 0 },
    { day: 'Thu', present: 0, absent: 0, late: 1 },
  ]

  const moduleChartData = (syllabusProgress.modules || []).map(m => ({
    name: m.title.replace('& ', '&\n').substring(0, 18),
    pct: m.pct
  }))

  const placementTypeIcon = { SHORTLIST: '⭐', INTERVIEW: '📅', ACTION: '📋', FEEDBACK: '💬', UPDATE: '📌' }

  return (
    <div className="page-wrapper">

      {/* ── ROW 1: Greeting + Stat Cards ─────────────────────────── */}
      <div className="animate-fadeInUp">
        <h1 className="font-display text-2xl font-extrabold text-gray-800 dark:text-white mb-0.5">
          Good morning, {student.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          {batch?.name} · Day {attendance.total} of 90
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeInUp delay-100">
        {/* Progress Ring */}
        <div className="stat-card flex flex-col items-center text-center">
          <ProgressRing pct={syllabusProgress.percentage} size={88} strokeWidth={9} />
          <p className="font-display font-bold text-sm text-gray-700 dark:text-gray-200 mt-2">Overall Progress</p>
          <p className="text-xs text-gray-400">Across all modules</p>
        </div>

        {/* Attendance */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Attendance</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-gray-800 dark:text-white">{attendance.percentage}%</p>
          <p className="text-xs text-gray-400 mt-0.5">↑ Good standing</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-600">6 day streak</span>
          </div>
        </div>

        {/* Assignments */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={16} className="text-brand-600" />
            <span className="text-xs text-gray-500 font-medium">Assignments</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-gray-800 dark:text-white">{assignments.pending}</p>
          <p className="text-xs text-gray-400">Pending</p>
          {assignments.overdue > 0 && (
            <span className="chip bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 mt-1.5">
              {assignments.overdue} Overdue
            </span>
          )}
        </div>

        {/* Quiz Score */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={16} className="text-brand-600" />
            <span className="text-xs text-gray-500 font-medium">Avg Quiz Score</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-gray-800 dark:text-white">{quizzes.avgScore}/100</p>
          <p className="text-xs text-gray-400">{quizzes.taken} quizzes taken</p>
          <Sparkline scores={quizzes.scores.map(q => q.pct)} />
        </div>
      </div>

      {/* ── ROW 2: Today's Class Banner ───────────────────────────── */}
      {todayClass ? (
        <div className="glass-card p-5 border-l-4 border-brand-600 animate-fadeInUp delay-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="chip bg-green-100 text-green-700 text-[10px]">● LIVE SOON</span>
                <span className="chip bg-brand-100 text-brand-700 text-[10px]">TODAY'S CLASS</span>
              </div>
              <h2 className="font-display text-lg font-bold text-gray-800 dark:text-white">{todayClass.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {batch?.name} · {batch?.timing} · Senthil Kumar
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <Countdown targetDate={new Date().setHours(18, 0, 0, 0)} />
              <a
                href={todayClass.meetLink || 'https://meet.google.com'}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
              >
                <ExternalLink size={15} />
                Join Google Meet →
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-5 border-l-4 border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 font-medium">No class scheduled today.</p>
          {upcomingClasses[0] && (
            <p className="text-sm text-gray-400 mt-1">
              Next class: <strong className="text-gray-600 dark:text-gray-300">{upcomingClasses[0].title}</strong> on {format(new Date(upcomingClasses[0].date), 'EEE, MMM d')}
            </p>
          )}
        </div>
      )}

      {/* ── ROW 3: Charts ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Attendance */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Calendar size={16} /> Weekly Attendance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceChartData} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 1]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff', fontSize: 12 }}
                formatter={(v, name) => [v ? 'Yes' : 'No', name]}
              />
              <Bar dataKey="present" fill="#6d28d9" radius={[4,4,0,0]} name="Present" />
              <Bar dataKey="absent"  fill="#ffd668" radius={[4,4,0,0]} name="Absent" />
              <Bar dataKey="late"    fill="#93c5fd" radius={[4,4,0,0]} name="Late" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Module Progress */}
        <div className="glass-card p-5">
          <h3 className="section-title"><BookOpen size={16} /> Course Progress by Module</h3>
          <div className="space-y-3">
            {(syllabusProgress.modules || []).map((mod, i) => {
              const colors = ['from-purple-600 to-violet-600','from-indigo-500 to-blue-600','from-violet-500 to-purple-600','from-fuchsia-500 to-violet-600','from-blue-500 to-indigo-600']
              return (
                <div key={mod.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{mod.title}</span>
                    <span className="text-brand-600 font-semibold ml-2">{mod.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-700`}
                      style={{ width: `${mod.pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 4: Syllabus + Upcoming Classes ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Syllabus Progress */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><BookOpen size={16} /> Syllabus Progress</h3>
            <span className="chip bg-brand-100 text-brand-700 text-xs">
              {syllabusProgress.completed}/{syllabusProgress.total}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {(syllabusProgress.modules || []).map(mod => (
              <ModuleRow key={mod.id} mod={mod} />
            ))}
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Calendar size={16} /> Upcoming Classes</h3>
          {upcomingClasses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No upcoming classes</p>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls, i) => {
                const classIsToday = isToday(new Date(cls.date))
                return (
                  <div key={cls.id} className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10 hover:bg-purple-100/60 dark:hover:bg-purple-900/20 transition-colors">
                    <div className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-center min-w-[52px] ${classIsToday ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800'}`}>
                      <p className="text-[10px] font-bold uppercase">{classIsToday ? 'TODAY' : format(new Date(cls.date), 'EEE')}</p>
                      {!classIsToday && <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{format(new Date(cls.date), 'dd')}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{cls.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{batch?.timing}</p>
                      {cls.topics?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {cls.topics.slice(0, 2).map(t => (
                            <span key={t.id} className="chip bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] border border-purple-100 dark:border-purple-800 px-2 py-0.5">
                              {t.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {classIsToday && (
                      <a href={cls.meetLink || '#'} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">
                        Join →
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <Link href="/student/attendance" className="text-xs text-brand-600 hover:underline mt-3 block text-right">
            View full schedule →
          </Link>
        </div>
      </div>

      {/* ── ROW 5: Assignments + Quizzes ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assignments */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><ClipboardList size={16} /> Assignments</h3>
            <Link href="/student/assignments" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <AssignmentsDashboard />
        </div>

        {/* Quizzes */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><Brain size={16} /> Quizzes & Scores</h3>
            <Link href="/student/quizzes" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <QuizzesDashboard />
        </div>
      </div>

      {/* ── ROW 6: Sessions + Materials ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recorded Sessions */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Play size={16} /> Recorded Sessions</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No sessions yet</p>
            ) : sessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center flex-shrink-0 relative overflow-hidden`}>
                  <Play size={20} className="text-white" fill="white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.duration} · {s.views} views</p>
                  {s.classDate && <p className="text-xs text-gray-400">{format(new Date(s.classDate), 'MMM d, yyyy')}</p>}
                </div>
                <a
                  href={s.videoUrl} target="_blank" rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity chip bg-brand-100 text-brand-700 text-xs px-2 py-1"
                >
                  Watch
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Course Materials */}
        <div className="glass-card p-5">
          <h3 className="section-title"><FileText size={16} /> Course Materials</h3>
          <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
            {materials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No materials yet</p>
            ) : materials.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50/70 dark:hover:bg-purple-900/10 transition-colors group">
                <MaterialIcon type={m.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="chip bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] px-2 py-0.5">{m.type}</span>
                    {m.fileSize && <span className="text-xs text-gray-400">{m.fileSize}</span>}
                  </div>
                </div>
                <a
                  href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 chip bg-brand-100 text-brand-700 text-xs px-2 py-1 hover:bg-brand-200 transition-colors"
                >
                  <Download size={12} /> Get
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 7: Placement + Activity ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Placement */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><Star size={16} /> Placement Updates</h3>
            <Link href="/student/placement" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50/70 dark:bg-purple-900/20 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Star size={14} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Status</p>
              <span className="chip bg-blue-100 text-blue-700 text-xs">SEEKING</span>
            </div>
          </div>
          <div className="space-y-2.5 mb-4">
            {placements.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base flex-shrink-0 mt-0.5">{placementTypeIcon[p.type] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{p.title}</p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                  </p>
                  {p.type === 'ACTION' && (
                    <span className="chip bg-yellow-100 text-yellow-800 text-[10px] mt-1">ACTION REQUIRED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {nextMock && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Next Mock Interview</p>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {nextMock.interviewerName} · {format(new Date(nextMock.scheduledAt), 'EEE, MMM d — h:mm a')}
              </p>
              {nextMock.meetLink && (
                <a href={nextMock.meetLink} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-brand-600 hover:underline mt-1 block">
                  Join Meeting →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Calendar size={16} /> Activity Feed</h3>
          <ActivityFeed items={activityFeed} />
        </div>
      </div>

      {/* ── ROW 8: Notifications ──────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">
            <Bell size={16} /> Recent Notifications
            {notifications.length > 0 && (
              <span className="ml-2 chip bg-brand-600 text-white text-[10px] px-2 py-0.5">
                {notifications.length}
              </span>
            )}
          </h3>
          <Link href="/student/notifications" className="text-xs text-brand-600 hover:underline">View All →</Link>
        </div>
        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">You're all caught up! 🎉</p>
          ) : notifications.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50/60 dark:hover:bg-purple-900/10 transition-colors cursor-pointer group">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-brand-600' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${n.isRead ? 'text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{n.title}</p>
                <p className="text-xs text-gray-400 truncate">{n.body}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Sub-components for assignments & quizzes in dashboard ────────────────────
function AssignmentsDashboard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    studentApi.getAssignments().then(r => setData(r.data.data)).catch(() => {})
  }, [])

  if (!data) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}</div>

  return (
    <div className="space-y-2.5">
      {data.slice(0, 4).map(a => {
        const s = a.submission
        const isOverdue = a.isOverdue
        const statusLabel = s ? s.status : isOverdue ? 'OVERDUE' : 'PENDING'
        const statusColors = {
          GRADED:    'bg-green-100 text-green-700',
          SUBMITTED: 'bg-blue-100 text-blue-700',
          PENDING:   'bg-yellow-100 text-yellow-800',
          OVERDUE:   'bg-yellow-200 text-yellow-900',
          LATE:      'bg-orange-100 text-orange-700',
        }
        return (
          <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
            <div className="flex-1 min-w-0 mr-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{a.title}</p>
              <p className="text-xs text-gray-400">Due {format(new Date(a.dueDate), 'MMM d')}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {s?.grade && <span className="chip bg-green-100 text-green-700 text-[10px]">{s.grade}/100</span>}
              <span className={`chip text-[10px] px-2 py-0.5 ${statusColors[statusLabel] || 'bg-gray-100 text-gray-600'}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        )
      })}
      <Link href="/student/assignments" className="text-xs text-brand-600 hover:underline block text-right mt-1">
        View all assignments →
      </Link>
    </div>
  )
}

function QuizzesDashboard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    studentApi.getQuizzes().then(r => setData(r.data.data)).catch(() => {})
  }, [])

  if (!data) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}</div>

  return (
    <div className="space-y-2.5">
      {data.slice(0, 4).map(q => {
        const a = q.attempt
        return (
          <div key={q.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
            <div className="flex-1 min-w-0 mr-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{q.title}</p>
              <p className="text-xs text-gray-400">{q.questionCount} questions · {q.duration}min</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {a ? (
                <>
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.pct >= 80 ? 'bg-green-500' : a.pct >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                      style={{ width: `${a.pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{a.score}/{a.totalMarks}</span>
                </>
              ) : (
                <Link href="/student/quizzes" className="chip bg-brand-100 text-brand-700 text-[10px] px-2 py-0.5 hover:bg-brand-200">
                  Start →
                </Link>
              )}
            </div>
          </div>
        )
      })}
      <Link href="/student/quizzes" className="text-xs text-brand-600 hover:underline block text-right mt-1">
        View all quizzes →
      </Link>
    </div>
  )
}
