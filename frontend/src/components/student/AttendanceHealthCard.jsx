'use client'
import { useState, useEffect } from 'react'
import { studentApi } from '@/lib/api'

const RISK_CONFIG = {
  HEALTHY:  { emoji: '🟢', label: 'Healthy',  text: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20' },
  AT_RISK:  { emoji: '🟠', label: 'At Risk',  text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  CRITICAL: { emoji: '🔴', label: 'Critical', text: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
}

export default function AttendanceHealthCard() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.getAttendanceHealth()
      .then(r => setHealth(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="glass-card p-5 h-28 animate-pulse" />
  if (!health) return null

  const cfg = RISK_CONFIG[health.riskLevel] || RISK_CONFIG.AT_RISK
  const improvementLabel = health.improvement > 0 ? `+${health.improvement}%` : `${health.improvement}%`

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Attendance Health</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{health.overallPercentage ?? health.currentPercentage}%</p>
          <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.text}`}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-500">Previous: <span className="font-semibold text-gray-700 dark:text-gray-300">{health.previousPercentage}%</span></p>
          <p className="text-gray-500">Current: <span className="font-semibold text-gray-700 dark:text-gray-300">{health.currentPercentage}%</span></p>
          <p className={`font-bold mt-1 ${health.improvement >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {health.improvement >= 0 ? 'Improvement' : 'Decline'}: {improvementLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
