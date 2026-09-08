'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

const TOOLTIP_STYLE = { background: '#1e1b4b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }
const SKELETON = <div className="h-[220px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />

export function AttendanceDailyTrendChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return SKELETON

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 10 }}>
        <defs>
          <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ffd668" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ffd668" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="present" name="Present" stroke="#6d28d9" fill="url(#colorPresent)" strokeWidth={2} />
        <Area type="monotone" dataKey="absent"  name="Absent"  stroke="#ffd668" fill="url(#colorAbsent)"  strokeWidth={2} />
        <Area type="monotone" dataKey="late"    name="Late"    stroke="#93c5fd" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function WeeklyAttendanceRateChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return SKELETON

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -10, right: 10 }}>
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Attendance']} />
        <ReferenceLine y={75} stroke="#ffd668" strokeDasharray="4 2" label={{ value: '75% min', fill: '#ffd668', fontSize: 10 }} />
        <Line type="monotone" dataKey="pct" name="Rate" stroke="#6d28d9" strokeWidth={2.5} dot={{ fill: '#6d28d9', r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MonthlyAttendanceBreakdownChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return SKELETON

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={16} margin={{ left: -10, right: 10 }}>
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="present" name="Present" fill="#6d28d9" radius={[4, 4, 0, 0]} />
        <Bar dataKey="absent"  name="Absent"  fill="#ffd668" radius={[4, 4, 0, 0]} />
        <Bar dataKey="late"    name="Late"    fill="#93c5fd" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
