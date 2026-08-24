'use client'
import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { ChevronLeft, ChevronRight, Flame, AlertTriangle, TrendingUp } from 'lucide-react'
import { useAttendance } from '@/hooks/useStudentDashboard'
import AttendanceCalendar from '@/components/student/AttendanceCalendar'
import SkeletonCard from '@/components/student/SkeletonCard'
import { studentApi } from '@/lib/api'

const TOOLTIP_STYLE = { background: '#1e1b4b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }

function StatusChip({ status }) {
  const cls =
    status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
    status === 'LATE'    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
    status === 'EXCUSED' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' :
                           'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${cls}`}>
      {status}
    </span>
  )
}

export default function AttendancePage() {
  const [activeMonth, setActiveMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [view, setView]               = useState('calendar')
  const [trend, setTrend]             = useState([])
  const [trendLoading, setTrendLoading] = useState(true)
  const { data, loading } = useAttendance(activeMonth)

  const prev = () => setActiveMonth(m => format(subMonths(new Date(m + '-01'), 1), 'yyyy-MM'))
  const next = () => setActiveMonth(m => format(addMonths(new Date(m + '-01'), 1), 'yyyy-MM'))

  const summary  = data?.summary  || {}
  const calendar = data?.calendar || []

  useEffect(() => {
    studentApi.getAttendanceTrend()
      .then(r => setTrend(r.data.data || []))
      .catch(() => {})
      .finally(() => setTrendLoading(false))
  }, [])

  // Compute deficit for 75%
  const pct     = summary.percentage || 0
  const total   = (summary.present || 0) + (summary.absent || 0) + (summary.late || 0) + (summary.excused || 0)
  const needed  = Math.max(0, Math.ceil(0.75 * total - (summary.present || 0)))
  const isLow   = pct < 75 && total > 0

  return (
    <div className="page-wrapper space-y-5">
      {/* Low attendance alert banner */}
      {isLow && (
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-4 border-l-4 border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">Low Attendance Warning</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Your attendance is {pct}%. You need to attend {needed} more classes to reach 75%.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Attendance</h1>
          <p className="text-sm text-gray-500">Track your class attendance history</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-[130px] text-center">
            {format(new Date(activeMonth + '-01'), 'MMMM yyyy')}
          </span>
          <button onClick={next} className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setActiveMonth(format(new Date(), 'yyyy-MM'))}
            className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors">
            Today
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <span className="text-green-500 font-bold text-lg">✓</span>
            <div>
              <p className="text-xs text-gray-500">Present</p>
              <p className="font-bold text-green-700 dark:text-green-400">{summary.present ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <span className="text-yellow-500 font-bold text-lg">✗</span>
            <div>
              <p className="text-xs text-gray-500">Absent</p>
              <p className="font-bold text-yellow-700 dark:text-yellow-400">{summary.absent ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <span className="text-blue-500 font-bold text-sm">L</span>
            <div>
              <p className="text-xs text-gray-500">Late</p>
              <p className="font-bold text-blue-700 dark:text-blue-400">{summary.late ?? 0}</p>
            </div>
          </div>
          {(summary.excused ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <span className="text-purple-500 font-bold text-sm">E</span>
              <div>
                <p className="text-xs text-gray-500">Excused</p>
                <p className="font-bold text-purple-700 dark:text-purple-400">{summary.excused}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <TrendingUp size={14} className="text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Percentage</p>
              <p className={`font-bold ${pct >= 75 ? 'text-purple-700 dark:text-purple-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{pct}%</p>
            </div>
          </div>
          {isLow && needed > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <AlertTriangle size={14} className="text-yellow-500" />
              <div>
                <p className="text-xs text-gray-500">Need {needed} more</p>
                <p className="font-bold text-yellow-700 dark:text-yellow-400">to reach 75%</p>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <Flame size={16} className="text-orange-500" />
            <div>
              <p className="text-xs text-gray-500">Streak</p>
              <p className="font-bold text-orange-600">{summary.streak ?? 0} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {['calendar', 'list'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all capitalize ${
              view === v ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {v}
          </button>
        ))}
      </div>

      {/* Calendar / List */}
      {loading ? (
        <SkeletonCard lines={5} />
      ) : (
        <div className="glass-card p-5">
          {view === 'calendar' ? (
            <AttendanceCalendar calendarData={calendar} activeMonth={activeMonth} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-100 dark:border-purple-900/30">
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Date</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Day</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Class</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calendar.map((c, i) => (
                    <tr key={i} className="border-b border-purple-50 dark:border-purple-900/20 hover:bg-purple-50/40 dark:hover:bg-purple-900/10">
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">{format(new Date(c.date), 'MMM d, yyyy')}</td>
                      <td className="py-2.5 px-3 text-gray-500">{format(new Date(c.date), 'EEEE')}</td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{c.classTitle}</td>
                      <td className="py-2.5 px-3">
                        {c.status ? <StatusChip status={c.status} /> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Attendance Trend Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Attendance Trend (Last 8 Weeks)</h3>
        {trendLoading ? (
          <div className="h-[220px] rounded-xl bg-purple-50 dark:bg-purple-900/20 animate-pulse" />
        ) : trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trend} margin={{ left: -10, right: 20 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <Bar yAxisId="left" dataKey="present" name="Present" fill="#6d28d9" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar yAxisId="left" dataKey="absent"  name="Absent"  fill="#ffd668" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar yAxisId="left" dataKey="late"    name="Late"    fill="#93c5fd" radius={[4, 4, 0, 0]} stackId="a" />
              <Line yAxisId="right" type="monotone" dataKey="pct" name="Rate %" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No attendance data available yet.</p>
        )}
      </div>

      {/* Recent Records */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Recent Attendance Records</h3>
        {loading ? (
          <SkeletonCard lines={4} />
        ) : calendar.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-100 dark:border-purple-900/30">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Class</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Marked At</th>
                </tr>
              </thead>
              <tbody>
                {[...calendar]
                  .filter(c => c.status)
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map((c, i) => (
                    <tr key={i} className="border-b border-purple-50 dark:border-purple-900/20 hover:bg-purple-50/30 dark:hover:bg-purple-900/10">
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 text-xs">{format(new Date(c.date), 'MMM d, yyyy')}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 text-xs max-w-xs truncate">{c.classTitle}</td>
                      <td className="py-2.5 px-3"><StatusChip status={c.status} /></td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs">
                        {c.markedAt ? format(new Date(c.markedAt), 'h:mm a') : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No records for this month.</p>
        )}
      </div>
    </div>
  )
}
