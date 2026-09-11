'use client'
import {
  BarChart, Bar, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CHART_TOOLTIP_STYLE = { borderRadius: '12px', fontSize: '12px' }
const CHART_TICK_STYLE = { fontSize: 11, fill: '#9ca3af' }
const CHART_GRID_COLOR = '#f3e8ff'

export function PlacementDistributionChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PlacementByBatchChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="batchName" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="placementRatePct" name="Placement %" fill="#22c55e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PlacementByCourseChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="courseTitle" tick={CHART_TICK_STYLE} />
          <YAxis tick={CHART_TICK_STYLE} unit="%" />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="placementRatePct" name="Placement %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PlacementFunnelChart({ data }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={240}>
        <FunnelChart>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" dataKey="name" fill="#374151" stroke="none" fontSize={11} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}
