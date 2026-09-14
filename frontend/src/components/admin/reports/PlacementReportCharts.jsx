'use client'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const CHART_TOOLTIP_STYLE = { borderRadius: '12px', fontSize: '12px', backgroundColor: '#1e1b4b', color: '#ffffff', border: 'none' }
const CHART_TICK_STYLE = { fontSize: 11, fill: '#9ca3af' }
const CHART_GRID_COLOR = '#f3e8ff'

export function PlacementDistributionChart({ data = [], total = 0 }) {
  const chartData = data && data.length > 0 ? data : [
    { name: 'Seeking', count: 0, fill: '#3b82f6' },
    { name: 'Interviewing', count: 0, fill: '#f59e0b' },
    { name: 'Placed', count: 0, fill: '#10b981' },
    { name: 'Not Seeking', count: 0, fill: '#9ca3af' },
  ]

  const hasData = chartData.some(d => d.count > 0)

  return (
    <div className="relative min-w-0 flex items-center justify-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={hasData ? chartData : [{ name: 'No Data', count: 1, fill: '#e2e8f0' }]}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={hasData ? 3 : 0}
          >
            {hasData ? (
              chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)
            ) : (
              <Cell fill="#e2e8f0" />
            )}
          </Pie>
          {hasData && <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, n) => [`${v} students`, n]} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-extrabold text-gray-900 dark:text-white">{total}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Students</span>
      </div>
    </div>
  )
}

export function PlacementByBatchChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">
        No batch placement data available for selected filters.
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="batchName" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Placement Rate']} />
          <Bar dataKey="placementRatePct" name="Placement Ready %" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PlacementByCourseChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">
        No course placement data available for selected filters.
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="courseTitle" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Placement Rate']} />
          <Bar dataKey="placementRatePct" name="Placement Ready %" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PlacementFunnelChart({ data = [] }) {
  const stages = data && data.length > 0 ? data : [
    { name: 'Eligible', value: 0, pct: '0%', fill: '#6366f1' },
    { name: 'Interested', value: 0, pct: '0%', fill: '#3b82f6' },
    { name: 'Under Review', value: 0, pct: '0%', fill: '#f59e0b' },
    { name: 'Shortlisted', value: 0, pct: '0%', fill: '#06b6d4' },
    { name: 'Resume Shared', value: 0, pct: '0%', fill: '#f43f5e' },
    { name: 'Selected', value: 0, pct: '0%', fill: '#10b981' },
  ]

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 space-y-1.5">
      {stages.map((stg, i) => {
        const widthPercent = Math.max(38, 100 - i * 12)
        return (
          <div key={stg.name} className="flex items-center w-full gap-3 text-xs">
            <div className="w-24 text-right font-medium text-gray-500 truncate">{stg.name}</div>
            <div className="flex-1 flex justify-center">
              <div
                className="h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm transition-all hover:opacity-90"
                style={{ width: `${widthPercent}%`, backgroundColor: stg.fill }}
              >
                {stg.value}
              </div>
            </div>
            <div className="w-16 flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stg.fill }} />
              <span>{stg.pct || `${stg.value}`}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
