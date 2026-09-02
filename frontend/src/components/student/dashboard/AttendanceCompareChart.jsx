'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function AttendanceCompareChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={40} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff', fontSize: 12 }}
          formatter={(v) => [`${v}%`, 'Attendance']}
        />
        <Bar dataKey="pct" fill="#6d28d9" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
