'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function MockInterviewTrendChart({ trend }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={trend}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v) => [`${v}/5`, 'Rating']} />
        <Line type="monotone" dataKey="rating" stroke="#6d28d9" strokeWidth={2.5} dot={{ r: 4, fill: '#6d28d9' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
