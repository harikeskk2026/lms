'use client'
import { Calendar, Award, Sparkles } from 'lucide-react'

const WORKING_DAYS = [
  { label: 'Mon', dow: 1 },
  { label: 'Tue', dow: 2 },
  { label: 'Wed', dow: 3 },
  { label: 'Thu', dow: 4 },
  { label: 'Fri', dow: 5 }
]

function getStatusConfig(pct) {
  if (pct === null || pct === undefined) {
    return {
      label: 'No Data',
      badgeCls: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
      textCls: 'text-gray-400 dark:text-gray-500',
      barCls: 'bg-gray-200 dark:bg-gray-700',
      cardBg: 'border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/40'
    }
  }
  if (pct >= 90) {
    return {
      label: 'Optimal',
      badgeCls: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40',
      textCls: 'text-purple-600 dark:text-purple-400',
      barCls: 'bg-gradient-to-r from-purple-600 to-indigo-600',
      cardBg: 'border-purple-200/70 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/60 to-white dark:from-purple-950/20 dark:to-gray-900/60'
    }
  }
  if (pct >= 80) {
    return {
      label: 'Good',
      badgeCls: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40',
      textCls: 'text-indigo-600 dark:text-indigo-400',
      barCls: 'bg-gradient-to-r from-indigo-500 to-blue-500',
      cardBg: 'border-indigo-200/70 dark:border-indigo-900/40 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900/60'
    }
  }
  if (pct >= 70) {
    return {
      label: 'Moderate',
      badgeCls: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/40',
      textCls: 'text-violet-600 dark:text-violet-400',
      barCls: 'bg-gradient-to-r from-violet-500 to-purple-500',
      cardBg: 'border-violet-200/70 dark:border-violet-900/40 bg-gradient-to-b from-violet-50/50 to-white dark:from-violet-950/20 dark:to-gray-900/60'
    }
  }
  return {
    label: 'Needs Focus',
    badgeCls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40',
    textCls: 'text-amber-600 dark:text-amber-400',
    barCls: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    cardBg: 'border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-gray-900/60'
  }
}

/**
 * Props:
 *   dailyTrend — array of { date: 'YYYY-MM-DD', pct: number }
 */
export default function AttendanceHeatmap({ dailyTrend = [] }) {
  // Group by day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const dayStats = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))

  for (const d of dailyTrend) {
    if (!d.date) continue
    const dow = new Date(d.date).getDay()
    dayStats[dow].total += (d.pct !== undefined ? d.pct : (d.present ? 100 : 0))
    dayStats[dow].count++
  }

  const dayAvgs = dayStats.map(d => d.count > 0 ? Math.round(d.total / d.count) : null)

  // Find Peak Day strictly among Working Days (Mon-Fri)
  let peakDow = -1
  let maxPct = -1
  WORKING_DAYS.forEach(({ dow }) => {
    const pct = dayAvgs[dow]
    if (pct !== null && pct > maxPct) {
      maxPct = pct
      peakDow = dow
    }
  })

  const peakDayObj = WORKING_DAYS.find(w => w.dow === peakDow)

  return (
    <div className="space-y-4">
      {/* Header with insights badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="text-purple-600 dark:text-purple-400" size={18} />
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-100">
              Working Day Attendance Pattern (Mon – Fri)
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Average attendance rate and student participation across official working days
          </p>
        </div>

        {peakDayObj && maxPct >= 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Sparkles size={13} className="text-amber-500 animate-pulse" />
            <span>Peak Day: <strong className="font-extrabold">{peakDayObj.label} ({maxPct}%)</strong></span>
          </div>
        )}
      </div>

      {/* Working Days Grid (5 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {WORKING_DAYS.map(({ label, dow }) => {
          const pct = dayAvgs[dow]
          const sessions = dayStats[dow].count
          const cfg = getStatusConfig(pct)
          const isPeak = dow === peakDow && pct !== null

          return (
            <div
              key={label}
              className={`relative overflow-hidden rounded-2xl border ${cfg.cardBg} p-3.5 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
            >
              {/* Peak indicator crown */}
              {isPeak && (
                <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/20 text-amber-500">
                  <Award size={12} className="fill-amber-400" />
                </div>
              )}

              {/* Day Name */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold tracking-wider uppercase text-gray-600 dark:text-gray-300 font-display">
                  {label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.badgeCls}`}>
                  {cfg.label}
                </span>
              </div>

              {/* Percentage & Sessions */}
              <div className="my-1 text-center">
                <p className={`text-2xl font-black tracking-tight ${cfg.textCls}`}>
                  {pct !== null ? `${pct}%` : '—'}
                </p>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                  {sessions > 0 ? `${sessions} ${sessions === 1 ? 'session' : 'sessions'}` : 'No classes'}
                </p>
              </div>

              {/* Mini Fill Progress Bar */}
              <div className="mt-2 w-full">
                <div className="w-full h-1.5 rounded-full bg-gray-200/70 dark:bg-gray-700/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.barCls}`}
                    style={{ width: `${pct !== null ? Math.min(pct, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend & Threshold Info */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs border-t border-gray-100 dark:border-gray-800/60">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
          Performance Bands
        </span>
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 inline-block" />
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Optimal (≥90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Good (80-89%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Moderate (70-79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Needs Focus (&lt;70%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
