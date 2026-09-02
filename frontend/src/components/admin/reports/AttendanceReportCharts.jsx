'use client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CHART_TOOLTIP_STYLE = { borderRadius: '12px', fontSize: '12px' }
const CHART_TICK_STYLE = { fontSize: 11, fill: '#9ca3af' }
const CHART_GRID_COLOR = '#f3e8ff'

export function AttendanceTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
        <XAxis dataKey="period" tick={CHART_TICK_STYLE} />
        <YAxis tick={CHART_TICK_STYLE} unit="%" />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="percentage" name="Attendance %" stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AttendanceByBatchChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
        <XAxis dataKey="batchName" tick={CHART_TICK_STYLE} />
        <YAxis tick={CHART_TICK_STYLE} unit="%" />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="percentage" name="Attendance %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AttendanceDistributionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
