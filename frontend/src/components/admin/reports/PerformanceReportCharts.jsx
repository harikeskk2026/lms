'use client'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CHART_TOOLTIP_STYLE = { borderRadius: '12px', fontSize: '12px', backgroundColor: '#1e1b4b', color: '#ffffff', border: 'none' }
const CHART_TICK_STYLE = { fontSize: 11, fill: '#9ca3af' }
const CHART_GRID_COLOR = '#f3e8ff'

export function OverallPerformanceDonut({ data = [], avgScore = 0 }) {
  const hasData = data && data.some(d => d.value > 0)
  const displayData = hasData ? data : [{ name: 'No Data', value: 1, fill: '#e2e8f0' }]

  return (
    <div className="relative min-w-0 flex items-center justify-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={displayData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={hasData ? 3 : 0}
          >
            {hasData ? (
              data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))
            ) : (
              <Cell fill="#e2e8f0" />
            )}
          </Pie>
          {hasData && <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{avgScore}%</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Average Score</span>
      </div>
    </div>
  )
}

export function CoursePerformanceChart({ data }) {
  if (!data || !data.length) {
    return <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">No course data available</div>
  }
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="courseTitle" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="averageScorePct" name="Avg Score %" fill="#9333ea" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BatchPerformanceChart({ data }) {
  if (!data || !data.length) {
    return <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">No batch data available</div>
  }
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="batchName" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="averageScorePct" name="Avg Score %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PerformanceTrendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">
        Not enough submission data yet to show performance trend.
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="period" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value) => [`${value}%`, 'Average Score']}
          />
          <Area
            type="monotone"
            dataKey="averageScorePct"
            stroke="#7c3aed"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#perfGradient)"
            dot={{ r: 3.5, fill: '#7c3aed', strokeWidth: 1, stroke: '#ffffff' }}
            activeDot={{ r: 6, fill: '#6d28d9', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AtRiskBreakdownChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
          <XAxis type="number" allowDecimals={false} tick={CHART_TICK_STYLE} />
          <YAxis type="category" dataKey="reason" width={150} tick={CHART_TICK_STYLE} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="count" fill="#f87171" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StudentCourseBreakdownChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="courseTitle" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="averageScorePct" name="Avg Score %" fill="#22c55e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StudentProgressTrendChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="period" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="value" name="Score %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BatchHealthChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="batchName" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="healthScore" name="Health Score %" radius={[6, 6, 0, 0]}>
            {data.map((b, i) => (
              <Cell key={i} fill={b.status === 'GOOD' ? '#22c55e' : b.status === 'AVERAGE' ? '#f59e0b' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function QuizBreakdownChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="title" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="averageScorePct" name="Avg Score %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EngagementDistributionChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AssignmentCompletionByBatchChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="batchName" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="completionPct" name="Completion %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ActivityTrendChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="period" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey="newStudents" name="New Students" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="assignmentsCreated" name="Assignments" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="quizAttempts" name="Quiz Attempts" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CorrelationScatterChart({ points, xLabel, yLabel }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis type="number" dataKey="x" name={xLabel} unit="%" tick={CHART_TICK_STYLE} />
          <YAxis type="number" dataKey="y" name={yLabel} unit="%" tick={CHART_TICK_STYLE} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value, name) => [`${value}%`, name]} />
          <Scatter data={points} fill="#9333ea" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
