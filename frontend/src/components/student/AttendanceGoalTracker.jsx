'use client'
import { useState, useEffect } from 'react'
import { Target, X } from 'lucide-react'
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
    if (saving) return
    setSaving(true)
    try {
      if (goal?.targetPercentage === target) {
        // Toggle off if already selected
        const r = await studentApi.clearAttendanceGoal()
        setGoal(r.data?.data || null)
        toast.success('Goal unselected')
      } else {
        // Set new goal
        const r = await studentApi.setAttendanceGoal(target)
        setGoal(r.data?.data || null)
        toast.success(`Goal set to ${target}%`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update goal')
    } finally {
      setSaving(false)
    }
  }

  const handleClearGoal = async () => {
    if (saving) return
    setSaving(true)
    try {
      const r = await studentApi.clearAttendanceGoal()
      setGoal(r.data?.data || null)
      toast.success('Goal cleared')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear goal')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="glass-card p-5 h-32 animate-pulse" />

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-purple-600" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Attendance Goal</h3>
        </div>
        {goal?.targetPercentage && (
          <button
            onClick={handleClearGoal}
            disabled={saving}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
            title="Unselect current goal"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 mb-3">
        {OPTIONS.map(opt => {
          const isSelected = goal?.targetPercentage === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => pickGoal(opt.value)}
              disabled={saving}
              title={isSelected ? 'Click to unselect this goal' : `Set goal to ${opt.value}%`}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md ring-2 ring-purple-400/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              <span>{opt.value}% <span className="opacity-75">— {opt.label}</span></span>
              {isSelected && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-md text-white font-bold">Selected</span>}
            </button>
          )
        })}
      </div>

      {goal?.targetPercentage ? (() => {
        const target = goal.targetPercentage
        const total = summary?.overallTotal ?? summary?.total ?? 0
        const hasClasses = total > 0
        const currentPct = hasClasses ? (summary?.overallPercentage ?? summary?.percentage ?? (goal.currentPercentage ?? 0)) : (goal.currentPercentage ?? 0)
        const achieved = goal.achieved ?? (hasClasses && currentPct >= target)
        const needed = goal.classesNeeded !== undefined ? goal.classesNeeded : 0

        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm flex-wrap">
            <span className="text-gray-500">Current: <span className="font-semibold text-gray-700 dark:text-gray-300">{hasClasses ? `${currentPct}%` : '—'}</span></span>
            <span className="text-gray-500">Target: <span className="font-semibold text-gray-700 dark:text-gray-300">{target}%</span></span>
            {achieved ? (
              <span className="font-bold text-green-600">Goal achieved! 🎉</span>
            ) : (
              <span className="font-bold text-purple-600">
                Classes needed: {needed > 100000 ? 'Not reachable' : needed}
              </span>
            )}
          </div>
        )
      })() : (
        <p className="text-xs text-gray-400">Pick a target above to start tracking your goal. Click an active target anytime to unselect it.</p>
      )}
    </div>
  )
}
