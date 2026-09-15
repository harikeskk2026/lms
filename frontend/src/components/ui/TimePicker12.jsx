'use client'
import React, { useMemo } from 'react'
import { Clock, X } from 'lucide-react'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function parseTime24(timeStr) {
  if (!timeStr) return { hasValue: false, hour12: '', minute: '', period: 'AM' }
  const [hStr, mStr] = String(timeStr).split(':')
  const h24 = parseInt(hStr, 10)
  if (isNaN(h24)) return { hasValue: false, hour12: '', minute: '', period: 'AM' }
  const minute = String(parseInt(mStr || '0', 10)).padStart(2, '0')
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  const hour12 = String(h12).padStart(2, '0')
  return { hasValue: true, hour12, minute, period }
}

function toTime24(h12Str, mStr, periodStr) {
  if (!h12Str) return ''
  let h = parseInt(h12Str, 10)
  if (isNaN(h)) return ''
  const m = String(parseInt(mStr || '00', 10)).padStart(2, '0')
  const p = (periodStr || 'AM').toUpperCase()
  if (p === 'PM' && h < 12) h += 12
  if (p === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m}`
}

export default function TimePicker12({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = '--:-- --',
  error = false,
}) {
  const { hasValue, hour12, minute, period } = useMemo(() => parseTime24(value), [value])

  const handleHourChange = (e) => {
    const newHour = e.target.value
    if (!newHour) {
      onChange?.('')
      return
    }
    const curMinute = minute || '00'
    const curPeriod = period || 'AM'
    onChange?.(toTime24(newHour, curMinute, curPeriod))
  }

  const handleMinuteChange = (e) => {
    const newMinute = e.target.value
    const curHour = hour12 || '12'
    const curPeriod = period || 'AM'
    onChange?.(toTime24(curHour, newMinute, curPeriod))
  }

  const handlePeriodChange = (newPeriod) => {
    if (disabled) return
    const curHour = hour12 || '12'
    const curMinute = minute || '00'
    onChange?.(toTime24(curHour, curMinute, newPeriod))
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <div
      className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-800 dark:text-gray-200 transition-all min-w-0 ${
        error
          ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-400'
          : 'border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-purple-500'
      } ${className}`}
    >
      <Clock size={14} className="text-purple-500 shrink-0" />

      {/* Hour Select (01 - 12) */}
      <select
        disabled={disabled}
        value={hour12}
        onChange={handleHourChange}
        className="appearance-none bg-transparent text-sm font-semibold text-center w-7 outline-none cursor-pointer text-gray-800 dark:text-gray-100 py-0.5"
        title="Hour (1 - 12)"
      >
        <option value="" disabled className="dark:bg-gray-800">--</option>
        {HOURS.map(h => (
          <option key={h} value={h} className="dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            {h}
          </option>
        ))}
      </select>

      <span className="font-bold text-gray-400 select-none text-xs">:</span>

      {/* Minute Select (00 - 59) */}
      <select
        disabled={disabled}
        value={minute}
        onChange={handleMinuteChange}
        className="appearance-none bg-transparent text-sm font-semibold text-center w-7 outline-none cursor-pointer text-gray-800 dark:text-gray-100 py-0.5"
        title="Minute (00 - 59)"
      >
        <option value="" disabled className="dark:bg-gray-800">--</option>
        {MINUTES.map(m => (
          <option key={m} value={m} className="dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            {m}
          </option>
        ))}
      </select>

      {/* AM / PM Toggle Pills */}
      <div className="flex items-center ml-auto bg-gray-200/70 dark:bg-gray-700/60 rounded-lg p-0.5 text-[11px] font-bold select-none shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handlePeriodChange('AM')}
          className={`px-1.5 py-0.5 rounded transition-all ${
            hasValue && period === 'AM'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handlePeriodChange('PM')}
          className={`px-1.5 py-0.5 rounded transition-all ${
            hasValue && period === 'PM'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300'
          }`}
        >
          PM
        </button>
      </div>

      {/* Clear Button */}
      {hasValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear time"
          className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors shrink-0 ml-0.5"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
