'use client'
import React, { useMemo } from 'react'
import { Calendar, Clock, X } from 'lucide-react'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function parseIso(val) {
  if (!val) {
    return { hasValue: false, date: '', hour12: '10', minute: '00', ampm: 'AM' }
  }
  const clean = String(val).replace(' ', 'T')
  const [d, t] = clean.split('T')
  const date = d || ''
  if (!t) {
    return { hasValue: Boolean(date), date, hour12: '10', minute: '00', ampm: 'AM' }
  }
  const [hStr, mStr] = t.split(':')
  const h24 = parseInt(hStr, 10)
  const safeH24 = isNaN(h24) ? 10 : h24
  const minute = (mStr || '00').slice(0, 2).padStart(2, '0')
  const ampm = safeH24 >= 12 ? 'PM' : 'AM'
  const h12Num = safeH24 % 12 === 0 ? 12 : safeH24 % 12
  const hour12 = String(h12Num).padStart(2, '0')
  return { hasValue: true, date, hour12, minute, ampm }
}

function toIso(date, hour12, minute, ampm) {
  if (!date) return ''
  const hNum = parseInt(hour12, 10) || 12
  let h24
  if (ampm === 'AM') {
    h24 = hNum === 12 ? 0 : hNum
  } else {
    h24 = hNum === 12 ? 12 : hNum + 12
  }
  const h24Str = String(h24).padStart(2, '0')
  const mStr = String(minute || '00').padStart(2, '0')
  return `${date}T${h24Str}:${mStr}`
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
  disabled = false,
  className = '',
}) {
  const { hasValue, date, hour12, minute, ampm } = useMemo(() => parseIso(value), [value])

  const handleDateChange = (e) => {
    const newDate = e.target.value
    if (!newDate) {
      onChange?.('')
      return
    }
    onChange?.(toIso(newDate, hour12, minute, ampm))
  }

  const handleHourChange = (e) => {
    const newHour = e.target.value
    const curDate = date || getTodayString()
    onChange?.(toIso(curDate, newHour, minute, ampm))
  }

  const handleMinuteChange = (e) => {
    const newMinute = e.target.value
    const curDate = date || getTodayString()
    onChange?.(toIso(curDate, hour12, newMinute, ampm))
  }

  const handleAmPmToggle = (newAmPm) => {
    if (ampm === newAmPm && hasValue) return
    const curDate = date || getTodayString()
    onChange?.(toIso(curDate, hour12, minute, newAmPm))
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        {/* Date Section */}
        <div className="sm:col-span-6 relative flex items-center">
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <Calendar size={15} />
          </div>
          <input
            type="date"
            required={required}
            disabled={disabled}
            min={minDate}
            value={date}
            onChange={handleDateChange}
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          />
        </div>

        {/* Time + AM/PM Section */}
        <div
          className={`sm:col-span-6 h-11 flex items-center justify-between gap-1.5 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600 ${
            !hasValue && !required ? 'opacity-85' : ''
          }`}
        >
          {/* Time digits */}
          <div className="flex items-center gap-1">
            <Clock size={15} className="text-slate-400 flex-shrink-0 mr-1" />

            {/* Hour select (No default arrow) */}
            <div className="relative">
              <select
                disabled={disabled}
                value={hour12}
                onChange={handleHourChange}
                aria-label="Hour"
                className="appearance-none bg-transparent text-center font-bold text-sm text-slate-800 dark:text-slate-100 outline-none cursor-pointer py-1 px-1.5 rounded-lg hover:bg-purple-100/70 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100">
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-400 font-bold select-none text-sm -mt-0.5">:</span>

            {/* Minute select (No default arrow) */}
            <div className="relative">
              <select
                disabled={disabled}
                value={minute}
                onChange={handleMinuteChange}
                aria-label="Minute"
                className="appearance-none bg-transparent text-center font-bold text-sm text-slate-800 dark:text-slate-100 outline-none cursor-pointer py-1 px-1.5 rounded-lg hover:bg-purple-100/70 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AM / PM Segmented Pills + Optional Clear */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-200/90 dark:bg-gray-700/80 p-0.5 rounded-lg text-xs font-bold select-none border border-slate-300/40 dark:border-gray-600/50">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleAmPmToggle('AM')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all duration-150 ${
                  hasValue && ampm === 'AM'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : !hasValue && ampm === 'AM'
                    ? 'bg-slate-300 dark:bg-gray-600 text-slate-700 dark:text-slate-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleAmPmToggle('PM')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all duration-150 ${
                  hasValue && ampm === 'PM'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : !hasValue && ampm === 'PM'
                    ? 'bg-slate-300 dark:bg-gray-600 text-slate-700 dark:text-slate-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
