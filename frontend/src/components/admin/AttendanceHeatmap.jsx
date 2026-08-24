'use client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function cellColor(pct) {
  if (pct === null || pct === undefined) return 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
  if (pct >= 90) return 'bg-purple-700 text-white'
  if (pct >= 80) return 'bg-purple-400 text-white'
  if (pct >= 70) return 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200'
  if (pct >= 60) return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-300'
  return 'bg-amber-200 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300'
}

/**
 * Props:
 *   dailyTrend — array of { date: 'YYYY-MM-DD', pct: number }
 */
export default function AttendanceHeatmap({ dailyTrend = [] }) {
  // Group by day of week (0=Sun, 1=Mon, ...)
  const dayStats = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))

  for (const d of dailyTrend) {
    const dow = new Date(d.date).getDay()
    dayStats[dow].total += d.pct
    dayStats[dow].count++
  }

  const dayAvgs = dayStats.map(d => d.count > 0 ? Math.round(d.total / d.count) : null)

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Day-of-Week Attendance Pattern</h4>
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, i) => {
          const pct = dayAvgs[i]
          return (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <div className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center text-center transition-all ${cellColor(pct)}`}>
                <span className="text-xs font-bold leading-none">{pct !== null ? `${pct}%` : '—'}</span>
              </div>
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{day}</span>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="text-[10px] text-gray-400">Legend:</span>
        {[
          { label: '≥90%', cls: 'bg-purple-700' },
          { label: '≥80%', cls: 'bg-purple-400' },
          { label: '≥70%', cls: 'bg-purple-200 dark:bg-purple-800/50' },
          { label: '≥60%', cls: 'bg-yellow-200 dark:bg-yellow-800/40' },
          { label: '<60%', cls: 'bg-amber-200 dark:bg-amber-800/40' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${l.cls}`} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
