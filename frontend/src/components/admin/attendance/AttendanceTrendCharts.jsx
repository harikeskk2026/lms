'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, CartesianGrid
} from 'recharts'
import CustomSelect from '@/components/ui/CustomSelect'

const TOOLTIP_STYLE = { background: '#1e1b4b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }
const SKELETON = <div className="h-[260px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />

export function AttendanceDailyTrendChart({ data, days = 30 }) {
  const [mounted, setMounted] = useState(false)
  const [metric, setMetric] = useState('percentage')
  useEffect(() => { setMounted(true) }, [])

  const chartData = useMemo(() => {
    const numDays = Number(days) && Number(days) > 0 ? Number(days) : 30
    const dataByDate = {}
    if (Array.isArray(data)) {
      for (const item of data) {
        if (!item.date) continue
        const key = item.date.slice(0, 10)
        if (!dataByDate[key]) {
          dataByDate[key] = {
            ...item,
            present: item.present || 0,
            absent: item.absent || 0,
            late: item.late || 0,
            total: item.total || 0,
            pct: item.pct !== undefined ? item.pct : 0,
          }
        } else {
          dataByDate[key].present += item.present || 0
          dataByDate[key].absent += item.absent || 0
          dataByDate[key].late += item.late || 0
          dataByDate[key].total += item.total || 0
          dataByDate[key].pct = dataByDate[key].total > 0
            ? Math.round((dataByDate[key].present * 100) / dataByDate[key].total)
            : 0
        }
      }
    }

    const fullList = []
    const now = new Date()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const key = `${year}-${month}-${day}`
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`
      const fullDateLabel = `${monthNames[d.getMonth()]} ${d.getDate()}, ${year}`

      if (dataByDate[key]) {
        const itemPct = dataByDate[key].pct !== undefined
          ? dataByDate[key].pct
          : (dataByDate[key].total > 0 ? Math.round((dataByDate[key].present * 100) / dataByDate[key].total) : 0)

        fullList.push({
          ...dataByDate[key],
          date: key,
          label: dataByDate[key].label || label,
          fullDateLabel,
          pct: itemPct
        })
      } else {
        fullList.push({
          date: key,
          label,
          fullDateLabel,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          pct: 0
        })
      }
    }
    return fullList
  }, [data, days])

  if (!mounted) return SKELETON

  const numDays = Number(days) || 30
  const tickInterval = numDays <= 7 ? 0 : numDays <= 30 ? 2 : 6

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2 shadow-xl shadow-purple-950/10 text-xs">
          <p className="font-medium text-gray-500 dark:text-gray-400 text-[11px]">{d.fullDateLabel}</p>
          <p className="font-bold text-gray-900 dark:text-white mt-0.5">
            Attendance: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{metric === 'percentage' ? `${d.pct}%` : `${d.present} Students`}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full min-w-0">
      {/* Header section with Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Attendance Trend</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Overall attendance percentage across the selected period
          </p>
        </div>
        <div className="relative shrink-0">
          <CustomSelect
            value={metric}
            onChange={setMetric}
            options={[{ value: 'percentage', label: 'Percentage' }, { value: 'headcount', label: 'Headcount' }]}
            compact
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 10, left: -10, right: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="purpleAttendanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-800/80" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
            interval={tickInterval}
          />
          <YAxis
            domain={metric === 'percentage' ? [0, 100] : ['auto', 'auto']}
            ticks={metric === 'percentage' ? [0, 25, 50, 75, 100] : undefined}
            tickFormatter={metric === 'percentage' ? (v) => `${v}%` : undefined}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={metric === 'percentage' ? 'pct' : 'present'}
            name="Attendance"
            stroke="#7c3aed"
            strokeWidth={2.5}
            fill="url(#purpleAttendanceGrad)"
            dot={{ r: 3, fill: '#7c3aed', stroke: '#7c3aed', strokeWidth: 1 }}
            activeDot={{ r: 6.5, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 2.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


export function WeeklyAttendanceRateChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return SKELETON

  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-xs">
        <p>No weekly attendance records found</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: -10, right: 10 }}>
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Attendance']} />
          <ReferenceLine y={75} stroke="#ffd668" strokeDasharray="4 2" label={{ value: '75% min', fill: '#ffd668', fontSize: 10 }} />
          <Line type="monotone" dataKey="pct" name="Rate" stroke="#6d28d9" strokeWidth={2.5} dot={{ fill: '#6d28d9', r: 5, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyAttendanceBreakdownChart({ data }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return SKELETON

  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-xs">
        <p>No monthly attendance records found</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
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
    </div>
  )
}
