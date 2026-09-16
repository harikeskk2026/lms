'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import { useAttendance } from '@/hooks/useStudentDashboard'
import AttendanceCalendar from '@/components/student/AttendanceCalendar'
import AttendanceHealthCard from '@/components/student/AttendanceHealthCard'
import AttendanceGoalTracker from '@/components/student/AttendanceGoalTracker'
import AttendanceDayModal from '@/components/student/AttendanceDayModal'
import CorrectionRequestModal from '@/components/student/CorrectionRequestModal'
import AttendanceCorrectionsList from '@/components/student/AttendanceCorrectionsList'
import SkeletonCard from '@/components/student/SkeletonCard'
import { studentApi } from '@/lib/api'

// recharts is a heavy dependency - load it only for the trend chart below,
// and only on the client (SSR doesn't need it).
const AttendanceTrendChart = dynamic(
  () => import('@/components/student/attendance/AttendanceTrendChart'),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-purple-50 dark:bg-purple-900/20 animate-pulse" /> }
)

function StatusChip({ status, correctionPending, requestedStatus }) {
  if (correctionPending) {
    return (
      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        ⏳ {requestedStatus || 'PRESENT'} PENDING
      </span>
    )
  }
  const cls =
    status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
    status === 'ABSENT'  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                           'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${cls}`}>
      {status}
    </span>
  )
}

const formatJoiningDate = (d) => {
  if (!d) return null
  try {
    const dateObj = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d)
    return format(dateObj, 'dd MMM yyyy')
  } catch {
    return d
  }
}

export default function AttendancePage() {
  const [activeMonth, setActiveMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [view, setView]               = useState('calendar')
  const [trend, setTrend]             = useState([])
  const [trendLoading, setTrendLoading] = useState(true)
  const { data, loading, refetch }    = useAttendance(activeMonth)

  const [selectedDate, setSelectedDate]   = useState(null)
  const [dayRecords, setDayRecords]       = useState([])
  const [dayLoading, setDayLoading]       = useState(false)
  const [correctionRecord, setCorrectionRecord] = useState(null)
  const correctionsRef = useRef(null)

  const openDay = (dateStr) => {
    setSelectedDate(dateStr)
    setDayLoading(true)
    studentApi.getCalendarDay(dateStr)
      .then(r => setDayRecords(r.data.data || []))
      .catch(() => setDayRecords([]))
      .finally(() => setDayLoading(false))
  }

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

  // Compute metrics
  const pct     = summary.percentage !== undefined ? summary.percentage : 0
  const total   = (summary.present || 0) + (summary.absent || 0) + (summary.late || 0) + (summary.excused || 0)
  const overallPct = summary.overallPercentage !== undefined ? summary.overallPercentage : pct
  const overallTotal = summary.overallTotal !== undefined ? summary.overallTotal : total
  const presentCount = (summary.present || 0) + (summary.late || 0)
  const needed  = summary.neededFor75 !== undefined
    ? summary.neededFor75
    : (overallPct < 75 && (overallTotal || total) > 0
        ? Math.max(0, Math.ceil((0.75 * (overallTotal || total) - presentCount) / (1 - 0.75)))
        : 0)
  const isLow   = overallPct < 75 && overallTotal > 0

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
                Your overall attendance is {overallPct}%. You need to attend {needed} more classes to reach 75%.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Attendance</h1>
            {summary.joiningDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm">
                <Calendar size={13} className="text-purple-500" />
                Joined on {formatJoiningDate(summary.joiningDate)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Track your class attendance history</p>
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

      {/* Health Score + Goal Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AttendanceHealthCard summary={summary} />
        <AttendanceGoalTracker summary={summary} />
      </div>

      {/* Summary Strip */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <span className="text-green-500 font-bold text-lg">✓</span>
            <div>
              <p className="text-xs text-gray-500">Present</p>
              <p className="font-bold text-green-700 dark:text-green-400">{summary.present ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <span className="text-red-500 font-bold text-lg">✗</span>
            <div>
              <p className="text-xs text-gray-500">Absent</p>
              <p className="font-bold text-red-700 dark:text-red-400">{summary.absent ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <TrendingUp size={14} className="text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Month Rate</p>
              <p className={`font-bold ${total > 0 ? (pct >= 75 ? 'text-purple-700 dark:text-purple-400' : 'text-yellow-600 dark:text-yellow-400') : 'text-gray-400'}`}>
                {total > 0 ? `${pct}%` : '—'}
              </p>
            </div>
          </div>
          {summary.overallPercentage !== undefined && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <div>
                <p className="text-xs text-gray-500">Overall Rate</p>
                <p className={`font-bold ${overallTotal > 0 ? (overallPct >= 75 ? 'text-violet-700 dark:text-violet-400' : 'text-yellow-600 dark:text-yellow-400') : 'text-gray-400'}`}>
                  {overallTotal > 0 ? `${overallPct}%` : '—'}
                </p>
              </div>
            </div>
          )}
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
        <div className="glass-card p-3 sm:p-5">
          {view === 'calendar' ? (
            <AttendanceCalendar calendarData={calendar} activeMonth={activeMonth} onDayClick={openDay} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-purple-100 dark:border-purple-900/30">
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Date</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Day</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Class</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Status</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-semibold text-xs">Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {[...calendar]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((c, i) => (
                    <tr key={i} className="border-b border-purple-50 dark:border-purple-900/20 hover:bg-purple-50/40 dark:hover:bg-purple-900/10">
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 font-medium">{format(new Date(c.date), 'MMM d, yyyy')}</td>
                      <td className="py-2.5 px-3 text-gray-500">{format(new Date(c.date), 'EEEE')}</td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 break-words font-medium">{c.classTitle}</td>
                      <td className="py-2.5 px-3">
                        {c.status ? (
                          <StatusChip status={c.status} correctionPending={c.correctionPending} requestedStatus={c.correctionRequestedStatus} />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs">
                        {c.markedAt ? format(new Date(c.markedAt), 'h:mm a') : '—'}
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
      <div className="glass-card p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Attendance Performance & Analytics</h3>
            <p className="text-xs text-gray-500">Session progression & cumulative attendance rate tracking</p>
          </div>
          {summary.joiningDate && (
            <span className="self-start sm:self-auto text-[11px] px-2.5 py-1 rounded-full font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Active since {formatJoiningDate(summary.joiningDate)}
            </span>
          )}
        </div>
        {trendLoading ? (
          <div className="h-[220px] rounded-xl bg-purple-50 dark:bg-purple-900/20 animate-pulse" />
        ) : (
          <AttendanceTrendChart trend={trend} calendar={calendar} summary={summary} />
        )}
      </div>

      {/* Correction Requests */}
      <AttendanceCorrectionsList ref={correctionsRef} />

      {/* Day detail modal */}
      {selectedDate && (
        <AttendanceDayModal
          date={selectedDate}
          records={dayRecords}
          loading={dayLoading}
          onClose={() => setSelectedDate(null)}
          onRequestCorrection={(record) => setCorrectionRecord(record)}
        />
      )}

      {/* Correction request modal */}
      {correctionRecord && (
        <CorrectionRequestModal
          record={correctionRecord}
          onClose={() => setCorrectionRecord(null)}
          onSubmitted={() => {
            setCorrectionRecord(null)
            setSelectedDate(null)
            correctionsRef.current?.reload()
            refetch()
          }}
        />
      )}
    </div>
  )
}
