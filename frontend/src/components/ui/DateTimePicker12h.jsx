'use client'
import React, { useMemo } from 'react'
import { Calendar, Clock, X } from 'lucide-react'

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const DEFAULT_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function parseIso(val) {
  if (!val) {
    return { hasValue: false, date: '', hour12: '', minute: '', period: 'AM' }
  }
  const clean = String(val).replace(' ', 'T')
  const [d, t] = clean.split('T')
  const date = d || ''
  if (!t) {
    return { hasValue: Boolean(date), date, hour12: '10', minute: '00', period: 'AM' }
  }
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr || '0', 10)
  const minute = (mStr || '00').slice(0, 2).padStart(2, '0')

  let period = 'AM'
  let hourNum = h
  if (h >= 12) {
    period = 'PM'
    if (h > 12) hourNum = h - 12
  } else if (h === 0) {
    hourNum = 12
  }
  const hour12 = String(hourNum).padStart(2, '0')

  return { hasValue: true, date, hour12, minute, period }
}

function to24hIso(dateStr, hour12Str, minuteStr, periodStr) {
  if (!dateStr) return ''
  const h12 = parseInt(hour12Str || '10', 10)
  const m = (minuteStr || '00').padStart(2, '0')
  let h24 = h12 % 12
  if (periodStr === 'PM') {
    h24 += 12
  }
  const h24Str = String(h24).padStart(2, '0')
  return `${dateStr}T${h24Str}:${m}`
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DateTimePicker12h({
  value,
  onChange,
  required = false,
  minDate,
  disablePast = true,
  disabled = false,
  hasError = false,
  className = '',
}) {
  const { hasValue, date, hour12, minute, period } = useMemo(() => parseIso(value), [value])

  const todayStr = useMemo(() => getTodayString(), [])
  const effectiveMinDate = minDate || (disablePast ? todayStr : undefined)

  const minuteOptions = useMemo(() => {
    if (minute && !DEFAULT_MINUTES.includes(minute)) {
      return Array.from(new Set([...DEFAULT_MINUTES, minute])).sort((a, b) => Number(a) - Number(b))
    }
    return DEFAULT_MINUTES
  }, [minute])

  const handleDateChange = (e) => {
    const newDate = e.target.value
    if (!newDate) {
      onChange?.('')
      return
    }
    const h = hour12 || '10'
    const m = minute || '00'
    const p = period || 'AM'
    onChange?.(to24hIso(newDate, h, m, p))
  }

  const handleHourChange = (e) => {
    const newH = e.target.value
    const curDate = date || (effectiveMinDate || todayStr)
    const m = minute || '00'
    const p = period || 'AM'
    onChange?.(to24hIso(curDate, newH, m, p))
  }

  const handleMinuteChange = (e) => {
    const newM = e.target.value
    const curDate = date || (effectiveMinDate || todayStr)
    const h = hour12 || '10'
    const p = period || 'AM'
    onChange?.(to24hIso(curDate, h, newM, p))
  }

  const handlePeriodChange = (newP) => {
    if (disabled || newP === period) return
    const curDate = date || (effectiveMinDate || todayStr)
    const h = hour12 || '10'
    const m = minute || '00'
    onChange?.(to24hIso(curDate, h, m, newP))
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
            <Calendar size={15} className={hasError ? 'text-red-500' : 'text-slate-400'} />
          </div>
          <input
            type="date"
            required={required}
            disabled={disabled}
            min={effectiveMinDate}
            value={date}
            onChange={handleDateChange}
            onClick={(e) => { try { e.target.showPicker?.() } catch { } }}
            className={`w-full h-11 pl-9 pr-3 rounded-xl border bg-slate-50 dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer min-w-0 ${hasError
                ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600'
              }`}
          />
        </div>

        {/* 12-Hour Time Section with AM/PM */}
        <div className={`flex items-center gap-1.5 h-11 px-2.5 rounded-xl border bg-slate-50 dark:bg-gray-800 transition-all min-w-0 ${hasError
            ? 'border-red-500 dark:border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20'
            : 'border-slate-200 dark:border-gray-700 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600'
          }`}>
          <Clock size={15} className="text-slate-400 shrink-0 ml-0.5" />

          {/* Hour Select */}
          <select
            value={hour12 || ''}
            onChange={handleHourChange}
            disabled={disabled}
            aria-label="Hour"
            className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer py-1 px-1 rounded hover:bg-slate-200/50 dark:hover:bg-gray-700/50"
          >
            <option value="" disabled className="dark:bg-gray-800">HH</option>
            {HOURS.map(h => (
              <option key={h} value={h} className="dark:bg-gray-800">{h}</option>
            ))}
          </select>

          <span className="text-slate-400 font-bold select-none">:</span>

          {/* Minute Select */}
          <select
            value={minute || ''}
            onChange={handleMinuteChange}
            disabled={disabled}
            aria-label="Minute"
            className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer py-1 px-1 rounded hover:bg-slate-200/50 dark:hover:bg-gray-700/50"
          >
            <option value="" disabled className="dark:bg-gray-800">MM</option>
            {minuteOptions.map(m => (
              <option key={m} value={m} className="dark:bg-gray-800">{m}</option>
            ))}
          </select>

          {/* AM / PM Segmented Control */}
          <div className="flex items-center ml-auto bg-slate-200/70 dark:bg-gray-700/70 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handlePeriodChange('AM')}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-md transition-all ${period === 'AM'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              AM
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handlePeriodChange('PM')}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-md transition-all ${period === 'PM'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              PM
            </button>
          </div>

          {!required && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date and time"
              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
