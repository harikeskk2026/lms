'use client'
import React, { useMemo } from 'react'
import { Calendar, Clock, X } from 'lucide-react'

function parseIso(val) {
  if (!val) {
    return { hasValue: false, date: '', time: '' }
  }
  const clean = String(val).replace(' ', 'T')
  const [d, t] = clean.split('T')
  const date = d || ''
  if (!t) {
    return { hasValue: Boolean(date), date, time: '' }
  }
  const time = t.slice(0, 5)
  return { hasValue: true, date, time }
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getNowTimeString() {
  const d = new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export default function DateTimePicker12h({
  value,
  onChange,
  required = false,
  minDate,
  disablePast = false,
  disabled = false,
  className = '',
}) {
  const { hasValue, date, time } = useMemo(() => parseIso(value), [value])

  const todayStr = useMemo(() => getTodayString(), [])
  const effectiveMinDate = minDate || (disablePast ? todayStr : undefined)

  // If the selected date is today, constrain min time to current time
  const minTime = useMemo(() => {
    if (disablePast || (minDate && minDate >= todayStr)) {
      if (date === todayStr) {
        return getNowTimeString()
      }
    }
    return undefined
  }, [disablePast, minDate, date, todayStr])

  const handleDateChange = (e) => {
    const newDate = e.target.value
    if (!newDate) {
      onChange?.('')
      return
    }
    // If time already chosen, keep it, otherwise default to a sensible upcoming time
    let effectiveTime = time
    if (!effectiveTime) {
      if ((disablePast || minDate) && newDate === todayStr) {
        const now = new Date(Date.now() + 30 * 60 * 1000)
        const h = String(now.getHours()).padStart(2, '0')
        const m = String(Math.ceil(now.getMinutes() / 15) * 15 % 60).padStart(2, '0')
        effectiveTime = `${h}:${m}`
      } else {
        effectiveTime = '10:00'
      }
    }
    onChange?.(`${newDate}T${effectiveTime}`)
  }

  const handleTimeChange = (e) => {
    const newTime = e.target.value
    const curDate = date || (effectiveMinDate || todayStr)
    if (!newTime) {
      onChange?.(curDate ? `${curDate}T00:00` : '')
      return
    }
    onChange?.(`${curDate}T${newTime}`)
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
        {/* Date Section */}
        <div className="relative flex items-center min-w-0">
          <div className="absolute left-3 text-slate-400 pointer-events-none z-10">
            <Calendar size={15} />
          </div>
          <input
            type="date"
            required={required}
            disabled={disabled}
            min={effectiveMinDate}
            value={date}
            onChange={handleDateChange}
            onClick={(e) => { try { e.target.showPicker?.() } catch {} }}
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600 transition-all cursor-pointer min-w-0"
          />
        </div>

        {/* Time Section - Unified Single Time Input */}
        <div className="relative flex items-center min-w-0">
          <div className="absolute left-3 text-slate-400 pointer-events-none z-10">
            <Clock size={15} />
          </div>
          <input
            type="time"
            required={required}
            disabled={disabled}
            min={minTime}
            value={time}
            onChange={handleTimeChange}
            onClick={(e) => { try { e.target.showPicker?.() } catch {} }}
            className={`w-full h-11 pl-9 ${!required && hasValue && !disabled ? 'pr-9' : 'pr-3'} rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600 transition-all cursor-pointer min-w-0`}
          />
          {!required && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date and time"
              className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors z-10"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
