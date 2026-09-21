'use client'
import React, { useMemo, useState } from 'react'
import { Calendar, Clock, X } from 'lucide-react'

function parseIso(val) {
  if (!val) {
    return { hasValue: false, date: '', hour: '', minute: '' }
  }
  const clean = String(val).replace(' ', 'T')
  const [d, t] = clean.split('T')
  const date = d || ''
  if (!t || t.trim() === '') {
    return { hasValue: Boolean(date), date, hour: '', minute: '' }
  }
  const [hStr, mStr] = t.split(':')
  if (hStr === undefined || hStr === '') {
    return { hasValue: Boolean(date), date, hour: '', minute: '' }
  }
  const hour = String(parseInt(hStr || '0', 10)).padStart(2, '0')
  const minute = (mStr || '00').slice(0, 2).padStart(2, '0')

  return { hasValue: true, date, hour, minute }
}

function toIso(dateStr, hourStr, minuteStr) {
  if (!dateStr) return ''
  const h = (hourStr || '10').padStart(2, '0')
  const m = (minuteStr || '00').padStart(2, '0')
  return `${dateStr}T${h}:${m}`
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DateTimePicker({
  value,
  onChange,
  required = false,
  minDate,
  disablePast = true,
  disabled = false,
  hasError = false,
  className = '',
  requireExplicitTime = false,
}) {
  const parsed = useMemo(() => parseIso(value), [value])

  const hasValue = parsed.hasValue
  const date = parsed.date
  const hour = parsed.hour
  const minute = parsed.minute

  const todayStr = useMemo(() => getTodayString(), [])
  const effectiveMinDate = minDate || (disablePast ? todayStr : undefined)

  const handleDateChange = (e) => {
    const newDate = e.target.value
    if (!newDate) {
      onChange?.('')
      return
    }
    // If a time was already explicitly selected, keep it with the new date
    if (hour && minute) {
      onChange?.(toIso(newDate, hour, minute))
    } else {
      // Do NOT auto-set a fabricated time! Keep time empty.
      onChange?.(newDate)
    }
  }

  const handleTimeChange = (e) => {
    const val = e.target.value
    if (!val) {
      // Time was cleared, keep the existing date
      onChange?.(date || '')
      return
    }
    const [newH, newM] = val.split(':')
    const curDate = date || (effectiveMinDate || todayStr)
    onChange?.(toIso(curDate, newH, newM))
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // If time is set, clear only the time so the user's date is NOT removed
    if (hour || minute) {
      onChange?.(date || '')
    } else {
      // If time is already empty, clear the whole field (date)
      onChange?.('')
    }
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

        {/* 24-Hour Time Section */}
        <div className={`flex items-center gap-1.5 h-11 px-2.5 rounded-xl border bg-slate-50 dark:bg-gray-800 transition-all min-w-0 ${hasError
            ? 'border-red-500 dark:border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20'
            : 'border-slate-200 dark:border-gray-700 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 hover:border-slate-300 dark:hover:border-gray-600'
          }`}>
          <Clock size={15} className="text-slate-400 shrink-0 ml-0.5" />

          {/* Single Time Input (24h) - pick hours & minutes together in one click */}
          <input
            type="time"
            disabled={disabled}
            aria-label="Time"
            value={hour && minute ? `${hour}:${minute}` : ''}
            onChange={handleTimeChange}
            onClick={(e) => { try { e.target.showPicker?.() } catch { } }}
            className="w-full h-full bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] outline-none cursor-pointer px-1"
          />

          {!required && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title={hour || minute ? 'Clear time' : 'Clear date'}
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