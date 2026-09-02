'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'

const TOOLTIP_STYLE = { background: '#1e1b4b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }

export default function AttendanceTrendChart({ trend }) {
  return (
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
  )
}
