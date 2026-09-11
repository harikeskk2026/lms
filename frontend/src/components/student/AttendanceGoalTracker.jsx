'use client'
import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'

const OPTIONS = [
  { value: 75, label: 'Minimum' },
  { value: 80, label: 'Good' },
  { value: 90, label: 'Excellent' },
]

export default function AttendanceGoalTracker({ summary }) {
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    studentApi.getAttendanceGoal()
      .then(r => setGoal(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const pickGoal = async (target) => {
    setSaving(true)
    try {
      const r = await studentApi.setAttendanceGoal(target)
      setGoal(r.data.data)
      toast.success(`Goal set to ${target}%`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save goal')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="glass-card p-5 h-32 animate-pulse" />

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-purple-600" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Attendance Goal</h3>
      </div>
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 mb-3">
        {OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => pickGoal(opt.value)} disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              goal?.targetPercentage === opt.value
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
            }`}>
            {opt.value}% <span className="opacity-75">— {opt.label}</span>
          </button>
        ))}
      </div>
      {goal?.targetPercentage ? (() => {
        const target = goal.targetPercentage
        const total = summary?.overallTotal ?? summary?.total ?? 0
        const hasClasses = total > 0
        const currentPct = hasClasses ? (summary?.overallPercentage ?? summary?.percentage ?? (goal.currentPercentage ?? 0)) : 0
        const present = (summary?.present ?? 0) + (summary?.late ?? 0)
        const achieved = hasClasses && currentPct >= target
        const f = target / 100.0
        const computedNeeded = (total > 0 && f < 1.0)
          ? Math.max(0, Math.ceil((f * total - present) / (1 - f)))
          : (goal.classesNeeded ?? 0)
        const needed = achieved ? 0 : computedNeeded

        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm flex-wrap">
            <span className="text-gray-500">Current: <span className="font-semibold text-gray-700 dark:text-gray-300">{hasClasses ? `${currentPct}%` : '—'}</span></span>
            <span className="text-gray-500">Target: <span className="font-semibold text-gray-700 dark:text-gray-300">{target}%</span></span>
            {achieved ? (
              <span className="font-bold text-green-600">Goal achieved! 🎉</span>
            ) : hasClasses ? (
              <span className="font-bold text-purple-600">
                Classes needed: {needed > 100000 ? 'Not reachable' : needed}
              </span>
            ) : (
              <span className="text-xs text-purple-600 font-medium">
                Attend upcoming classes to work towards this goal!
              </span>
            )}
          </div>
        )
      })() : (
        <p className="text-xs text-gray-400">Pick a target above to start tracking your goal.</p>
      )}
    </div>
  )
}
