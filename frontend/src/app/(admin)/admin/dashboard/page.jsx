'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, Layers, BarChart2, Briefcase,
  ClipboardList, Calendar, UserPlus, Plus, Brain,
  Megaphone, TrendingUp, Users, CheckCircle, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { adminApi } from '@/lib/api'
import StatCard from '@/components/admin/StatCard'

const PLACEMENT_COLORS = { SEEKING: '#3b82f6', INTERVIEWING: '#f59e0b', PLACED: '#22c55e', NOT_SEEKING: '#9ca3af' }

const ACTIVITY_ICONS = {
  NEW_STUDENT:   { icon: UserPlus,    color: 'bg-purple-100 text-purple-600' },
  SUBMISSION:    { icon: ClipboardList, color: 'bg-blue-100 text-blue-600' },
  QUIZ_ATTEMPT:  { icon: Brain,       color: 'bg-indigo-100 text-indigo-600' },
  MOCK_INTERVIEW:{ icon: Users,       color: 'bg-green-100 text-green-600' },
}

function SkeletonCard() {
  return <div className="glass-card p-5 animate-pulse"><div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" /></div>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboardStats().then(r => {
      setStats(r.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const pieData = stats ? [
    { name: 'Seeking', value: stats.placementBreakdown.SEEKING, color: PLACEMENT_COLORS.SEEKING },
    { name: 'Interviewing', value: stats.placementBreakdown.INTERVIEWING, color: PLACEMENT_COLORS.INTERVIEWING },
    { name: 'Placed', value: stats.placementBreakdown.PLACED, color: PLACEMENT_COLORS.PLACED },
    { name: 'Not Seeking', value: stats.placementBreakdown.NOT_SEEKING, color: PLACEMENT_COLORS.NOT_SEEKING },
  ].filter(d => d.value > 0) : []

  const placementRate = stats
    ? Math.round((stats.placedStudents / (stats.totalStudents || 1)) * 100)
    : 0

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

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Students" value={stats?.totalStudents ?? 0}
              subtitle={`+${stats?.newThisMonth ?? 0} this month`}
              icon={GraduationCap} color="purple"
              trend={`+${stats?.newThisMonth ?? 0}`} trendDir="up"
            />
            <StatCard
              title="Active Batches" value={stats?.activeBatches ?? 0}
              subtitle={`${stats?.totalBatches ?? 0} total batches`}
              icon={Layers} color="indigo"
            />
            <StatCard
              title="Avg Attendance" value={`${stats?.avgAttendance ?? 0}%`}
              subtitle="Across active batches"
              icon={BarChart2} color="blue"
              trend={stats?.avgAttendance >= 80 ? 'Good' : 'Needs attention'}
              trendDir={stats?.avgAttendance >= 80 ? 'up' : 'down'}
            />
            <StatCard
              title="Placed Students" value={stats?.placedStudents ?? 0}
              subtitle={`${placementRate}% placement rate`}
              icon={Briefcase} color="green"
              trend={`${placementRate}%`} trendDir="up"
            />
          </>
        )}
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="glass-card p-5 border border-yellow-200 dark:border-yellow-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Pending Grades</span>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{stats?.totalAssignmentsPending ?? 0}</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">{stats?.totalAssignmentsPending ?? 0}</p>
              <button
                onClick={() => router.push('/admin/assignments')}
                className="mt-2 text-xs text-purple-600 font-semibold hover:underline"
              >
                Grade Now →
              </button>
            </div>
            <div className="glass-card p-5 border border-purple-200 dark:border-purple-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Active Batches</span>
                <Clock size={14} className="text-purple-500" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">{stats?.activeBatches ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">Ongoing batches</p>
            </div>
            <div className="glass-card p-5 border border-green-200 dark:border-green-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">New Students</span>
                <TrendingUp size={14} className="text-green-500" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">{stats?.newThisMonth ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">This month</p>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Enrollments */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Monthly Enrollments</h3>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats?.monthlyEnrollments || []}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6d28d9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #ede9fe', fontSize: '12px' }}
                  formatter={(v) => [v, 'Enrollments']}
                />
                <Area type="monotone" dataKey="count" stroke="#6d28d9" strokeWidth={2} fill="url(#enrollGrad)" dot={{ r: 4, fill: '#6d28d9' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Placement Breakdown */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Placement Breakdown</h3>
          {loading ? (
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batch Performance Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/30">
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Batch Performance</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['Batch Name', 'Course', 'Students', 'Attendance', 'Avg Score'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.batchPerformance || []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No active batches</td></tr>
                ) : (
                  (stats?.batchPerformance || []).map(b => (
                    <tr
                      key={b.batchId}
                      onClick={() => router.push(`/admin/batches/${b.batchId}`)}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{b.name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{b.course}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{b.studentCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.avgAttendance}%`, background: b.avgAttendance >= 80 ? '#22c55e' : b.avgAttendance >= 60 ? '#f59e0b' : '#f97316' }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b.avgAttendance}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          b.avgQuizScore >= 70 ? 'bg-green-100 text-green-700' :
                          b.avgQuizScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                        }`}>{b.avgQuizScore}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity & Today's Classes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {(stats?.recentActivity || []).slice(0, 8).map((item, i) => {
                const cfg = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.NEW_STUDENT
                const Icon = cfg.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.timeAgo}</p>
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

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Student', icon: UserPlus, href: '/admin/students', color: 'from-purple-600 to-violet-600' },
              { label: 'Schedule Class', icon: Calendar, href: '/admin/attendance', color: 'from-blue-600 to-indigo-600' },
              { label: 'Create Quiz', icon: Brain, href: '/admin/quizzes', color: 'from-indigo-600 to-purple-600' },
              { label: 'Announcement', icon: Megaphone, href: '/admin/announcements', color: 'from-violet-600 to-purple-700' },
            ].map(({ label, icon: Icon, href, color }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`bg-gradient-to-r ${color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] hover:shadow-lg transition-all duration-200`}
              >
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>

          {/* Weekly attendance mini */}
          {!loading && stats?.weeklyAttendance && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Weekly Attendance</p>
              <div className="flex items-end gap-1 h-10">
                {stats.weeklyAttendance.map((d, i) => {
                  const total = d.present + d.absent + d.late || 1
                  const pct = Math.round((d.present / total) * 100)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.present} present`}>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden" style={{ height: '28px' }}>
                        <div className="bg-purple-500 rounded-sm w-full transition-all" style={{ height: `${pct}%` }} />
                      </div>
                      <span className="text-[8px] text-gray-400">{new Date(d.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
