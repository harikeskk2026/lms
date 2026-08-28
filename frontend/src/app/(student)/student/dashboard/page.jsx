'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import {
  Calendar, ClipboardList, Brain, BookOpen, Play,
  FileText, Download, Star, ChevronRight, Flame,
  ExternalLink, Bell, Trophy, Award, Zap
} from 'lucide-react'
import { useDashboard, useNotifications } from '@/hooks/useStudentDashboard'
import { resolveFileUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import ProgressRing from '@/components/student/ProgressRing'
import { SkeletonStat, ErrorCard } from '@/components/student/SkeletonCard'
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

// ─── Material type icon ───────────────────────────────────────────────────────
function MaterialIcon({ type }) {
  const icons = { PDF: '📄', DOCUMENT: '📋', PRESENTATION: '🖥️', VIDEO: '🎬', LINK: '🔗', OTHER: '📁' }
  return <span className="text-xl">{icons[type] || '📁'}</span>
}

// ─── Main dashboard page ──────────────────────────────────────────────────────
export default function StudentDashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useDashboard()
  const { data: notifications } = useNotifications()
  const [materials, setMaterials] = useState([])
  const [sessions,  setSessions]  = useState([])

  const primaryCourseId = data?.continueLearning?.[0]?.courseId

  useEffect(() => {
    if (primaryCourseId) {
      studentApi.getMaterials(primaryCourseId).then(r => setMaterials(r.data.data || [])).catch(() => {})
      studentApi.getSessions(primaryCourseId).then(r => setSessions(r.data.data || [])).catch(() => {})
    }
  }, [primaryCourseId])

  if (loading) return (
    <div className="page-wrapper">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <SkeletonStat key={i} />)}
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="page-wrapper">
      <ErrorCard message={error} onRetry={refetch} />
    </div>
  )

  const { overview, continueLearning, todaysTasks, performance, attendance, gamification, placement, upcomingClasses } = data

  const todayClass = upcomingClasses.find(c => isToday(new Date(c.date)))
  const overdueCount = (todaysTasks.pendingAssignments || []).filter(a => a.isOverdue).length

  const attendanceCompareData = [
    { label: 'Previous', pct: attendance.previousPercentage },
    { label: 'Current', pct: attendance.currentPercentage },
  ]

  const topicPerformanceData = (performance.quiz?.topicPerformance || []).slice(0, 6).map(t => ({
    name: t.topicName?.length > 18 ? t.topicName.slice(0, 18) + '…' : t.topicName,
    pct: Math.round(t.accuracy),
  }))

  const quizSparkline = (performance.quiz?.recentAttempts || [])
    .filter(a => a.totalScore)
    .map(a => Math.round((a.score / a.totalScore) * 100))

  const unlockedAchievements = (gamification.achievements || []).filter(a => a.unlocked).length

  return (
    <div className="page-wrapper">

      {/* ── ROW 1: Greeting + Stat Cards ─────────────────────────── */}
      <div className="animate-fadeInUp">
        <h1 className="font-display text-2xl font-extrabold text-gray-800 dark:text-white mb-0.5">
          Good morning, {user?.name ? user.name.split(' ')[0] : 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          Enrolled in {overview.myCourses} course{overview.myCourses === 1 ? '' : 's'} · {overview.pendingAssignments} pending assignment{overview.pendingAssignments === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeInUp delay-100">
        {/* Progress Ring */}
        <div className="stat-card flex flex-col items-center text-center">
          <ProgressRing pct={Math.round(overview.assignmentCompletionPct ?? 0)} size={88} strokeWidth={9} />
          <p className="font-display font-bold text-sm text-gray-700 dark:text-gray-200 mt-2">Assignment Completion</p>
          <p className="text-xs text-gray-400">Share of assignments submitted</p>
        </div>

        {/* Attendance */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Attendance</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-gray-800 dark:text-white">{overview.attendancePct}%</p>
          <p className="text-xs text-gray-400 mt-0.5">{attendance.riskLevel}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-600">{overview.streak} day streak</span>
          </div>
        </div>

        {/* Assignments */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={16} className="text-brand-600" />
            <span className="text-xs text-gray-500 font-medium">Assignments</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-gray-800 dark:text-white">{overview.pendingAssignments}</p>
          <p className="text-xs text-gray-400">Pending</p>
          {overdueCount > 0 && (
            <span className="chip bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 mt-1.5">
              {overdueCount} Overdue
            </span>
          )}
        </div>

        {/* Quiz Score */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={16} className="text-brand-600" />
            <span className="text-xs text-gray-500 font-medium">Quiz Skill</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-gray-800 dark:text-white">{Math.round(overview.quizScorePct ?? 0)}%</p>
          <p className="text-xs text-gray-400">{performance.quiz?.quizzesCompleted ?? 0} quizzes taken</p>
          <Sparkline scores={quizSparkline} />
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
              <p className="text-sm text-gray-500 mt-0.5">{todayClass.batchName}</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <Countdown targetDate={new Date(todayClass.date).getTime()} />
              {todayClass.meetLink && (
                <a
                  href={todayClass.meetLink}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
                >
                  <ExternalLink size={15} />
                  Join Meeting →
                </a>
              )}
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
        {/* Attendance: current vs previous */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Calendar size={16} /> Attendance: Current vs Previous</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceCompareData} barSize={40} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff', fontSize: 12 }}
                formatter={(v) => [`${v}%`, 'Attendance']}
              />
              <Bar dataKey="pct" fill="#6d28d9" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quiz Topic Performance */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Brain size={16} /> Topic Performance</h3>
          {topicPerformanceData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Take a few quizzes to see topic-level performance</p>
          ) : (
            <div className="space-y-3">
              {topicPerformanceData.map((t, i) => {
                const colors = ['from-purple-600 to-violet-600','from-indigo-500 to-blue-600','from-violet-500 to-purple-600','from-fuchsia-500 to-violet-600','from-blue-500 to-indigo-600']
                return (
                  <div key={t.name + i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{t.name}</span>
                      <span className="text-brand-600 font-semibold ml-2">{t.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-700`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 4: Continue Learning + Upcoming Classes ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Continue Learning */}
        <div className="glass-card p-5">
          <h3 className="section-title"><BookOpen size={16} /> Continue Learning</h3>
          {continueLearning.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Enroll in a course to get started</p>
          ) : (
            <div className="space-y-3">
              {continueLearning.map(c => (
                <div key={c.courseId} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{c.courseTitle}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[c.moduleTitle, c.topicTitle, c.sessionTitle].filter(Boolean).join(' · ') || 'No content yet'}
                    </p>
                  </div>
                  <Link
                    href={`/student/my-courses/${c.courseId}`}
                    className="flex-shrink-0 flex items-center gap-1 chip bg-brand-100 text-brand-700 text-xs px-3 py-1.5 hover:bg-brand-200 transition-colors"
                  >
                    Continue <ChevronRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Classes */}
        <div className="glass-card p-5">
          <h3 className="section-title"><Calendar size={16} /> Upcoming Classes</h3>
          {upcomingClasses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No upcoming classes</p>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => {
                const classIsToday = isToday(new Date(cls.date))
                return (
                  <div key={cls.classId} className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10 hover:bg-purple-100/60 dark:hover:bg-purple-900/20 transition-colors">
                    <div className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-center min-w-[52px] ${classIsToday ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800'}`}>
                      <p className="text-[10px] font-bold uppercase">{classIsToday ? 'TODAY' : format(new Date(cls.date), 'EEE')}</p>
                      {!classIsToday && <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{format(new Date(cls.date), 'dd')}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{cls.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cls.batchName}</p>
                    </div>
                    {classIsToday && cls.meetLink && (
                      <a href={cls.meetLink} target="_blank" rel="noopener noreferrer"
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
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  <Play size={20} className="text-white" fill="white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{s.title}</p>
                  {s.sessionDate && <p className="text-xs text-gray-400">{format(new Date(s.sessionDate), 'MMM d, yyyy')}</p>}
                </div>
                {s.recordingUrl && (
                  <a
                    href={resolveFileUrl(s.recordingUrl)} target="_blank" rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity chip bg-brand-100 text-brand-700 text-xs px-2 py-1"
                  >
                    Watch
                  </a>
                )}
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
                  <span className="chip bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] px-2 py-0.5">{m.type}</span>
                </div>
                <a
                  href={resolveFileUrl(m.url)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 chip bg-brand-100 text-brand-700 text-xs px-2 py-1 hover:bg-brand-200 transition-colors"
                >
                  <Download size={12} /> Get
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 7: Gamification + Placement ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gamification */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><Trophy size={16} /> Gamification</h3>
            <Link href="/student/quizzes/leaderboard" className="text-xs text-brand-600 hover:underline">View Leaderboard →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-purple-50/70 dark:bg-purple-900/20 rounded-xl">
              <Zap size={18} className="mx-auto text-brand-600 mb-1" />
              <p className="font-display font-bold text-lg text-gray-800 dark:text-white">{gamification.xp}</p>
              <p className="text-[11px] text-gray-400">XP</p>
            </div>
            <div className="text-center p-3 bg-orange-50/70 dark:bg-orange-900/10 rounded-xl">
              <Flame size={18} className="mx-auto text-orange-500 mb-1" />
              <p className="font-display font-bold text-lg text-gray-800 dark:text-white">{gamification.currentStreak}</p>
              <p className="text-[11px] text-gray-400">Day Streak</p>
            </div>
            <div className="text-center p-3 bg-green-50/70 dark:bg-green-900/10 rounded-xl">
              <Award size={18} className="mx-auto text-green-600 mb-1" />
              <p className="font-display font-bold text-lg text-gray-800 dark:text-white">{unlockedAchievements}/{gamification.achievements.length}</p>
              <p className="text-[11px] text-gray-400">Achievements</p>
            </div>
          </div>
          {gamification.dailyChallenge && (
            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Daily Challenge</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">{gamification.dailyChallenge.title}</p>
              </div>
              {!gamification.dailyChallenge.attempted && (
                <Link href="/student/quizzes" className="chip bg-brand-600 text-white text-xs px-3 py-1.5">Start</Link>
              )}
            </div>
          )}
        </div>

        {/* Placement */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><Star size={16} /> Placement</h3>
            <Link href="/student/placement" className="text-xs text-brand-600 hover:underline">View Drives →</Link>
          </div>
          <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50/70 dark:bg-purple-900/20 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Star size={14} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Status</p>
              <span className="chip bg-blue-100 text-blue-700 text-xs">{placement.status}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="font-display font-bold text-lg text-gray-800 dark:text-white">{placement.availableDrives}</p>
              <p className="text-[11px] text-gray-400">Available Drives</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="font-display font-bold text-lg text-gray-800 dark:text-white">{placement.interestExpressed}</p>
              <p className="text-[11px] text-gray-400">Interest Expressed</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 8: Notifications ──────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">
            <Bell size={16} /> Recent Notifications
            {notifications?.length > 0 && (
              <span className="ml-2 chip bg-brand-600 text-white text-[10px] px-2 py-0.5">
                {notifications.length}
              </span>
            )}
          </h3>
          <Link href="/student/notifications" className="text-xs text-brand-600 hover:underline">View All →</Link>
        </div>
        <div className="space-y-2.5">
          {!notifications?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">You're all caught up! 🎉</p>
          ) : notifications.slice(0, 6).map(n => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50/60 dark:hover:bg-purple-900/10 transition-colors">
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
              {s?.grade != null && <span className="chip bg-green-100 text-green-700 text-[10px]">{s.grade}/{a.maxMarks}</span>}
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
      {data.slice(0, 4).map(q => (
        <div key={q.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{q.title}</p>
            <p className="text-xs text-gray-400">{q.totalQuestions} questions · {q.duration}min</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {q.attemptsUsed > 0 ? (
              <span className="chip bg-brand-100 text-brand-700 text-[10px] px-2 py-0.5">
                {q.attemptsUsed}/{q.maxAttempts ?? '∞'} attempts
              </span>
            ) : (
              <Link href="/student/quizzes" className="chip bg-brand-100 text-brand-700 text-[10px] px-2 py-0.5 hover:bg-brand-200">
                Start →
              </Link>
            )}
          </div>
        </div>
      ))}
      <Link href="/student/quizzes" className="text-xs text-brand-600 hover:underline block text-right mt-1">
        View all quizzes →
      </Link>
    </div>
  )
}
