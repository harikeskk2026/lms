'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

export function PerformanceTrendChart({ trend }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={trend}>
        <defs>
          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #ede9fe', fontSize: '12px' }} formatter={(v) => [`${Math.round(v)}%`, 'Avg Score']} />
        <Area type="monotone" dataKey="averageScorePct" stroke="#6d28d9" strokeWidth={2} fill="url(#perfGrad)" dot={{ r: 4, fill: '#6d28d9' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AttendanceBreakdownChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
            {data?.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data?.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">{d.name}</span>
            <span className="text-xs font-bold text-gray-800 dark:text-white">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
