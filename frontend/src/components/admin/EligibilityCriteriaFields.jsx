'use client'
import { useEffect, useState } from 'react'
import batchService from '@/services/batchService'
import courseService from '@/services/courseService'
import MultiSelect from '@/components/ui/MultiSelect'

// Eligibility is never hard-coded - it's expressed entirely through these
// structured criteria fields on the Drive. Leaving a numeric field blank, or a
// dropdown empty, means "no restriction on that dimension".
export default function EligibilityCriteriaFields({ value, onChange, errors = {} }) {
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [scoreType, setScoreType] = useState(value.minPercentage != null ? 'PERCENTAGE' : 'CGPA')

  useEffect(() => {
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  const activeScore = scoreType === 'CGPA' ? (value.minCgpa ?? '') : (value.minPercentage ?? '')
  const scoreError = errors.minCgpa || errors.minPercentage

  const handleScoreChange = (e) => {
    const num = e.target.value === '' ? null : Number(e.target.value)
    if (scoreType === 'CGPA') {
      onChange({ minCgpa: num, minPercentage: null })
    } else {
      onChange({ minPercentage: num, minCgpa: null })
    }
  }

  const switchScoreType = (t) => {
    if (t === scoreType) return
    setScoreType(t)
    const num = (scoreType === 'CGPA' ? value.minCgpa : value.minPercentage) ?? null
    if (t === 'CGPA') {
      onChange({ minCgpa: num, minPercentage: null })
    } else {
      onChange({ minPercentage: num, minCgpa: null })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Min Academic Score *</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/70 dark:bg-gray-700/70 p-0.5 rounded-lg shrink-0">
              <button type="button" onClick={() => switchScoreType('CGPA')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${scoreType === 'CGPA' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                CGPA
              </button>
              <button type="button" onClick={() => switchScoreType('PERCENTAGE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${scoreType === 'PERCENTAGE' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                Percentage
              </button>
            </div>
            <input type="number" step="0.1" min="0" max={scoreType === 'CGPA' ? 10 : 100} value={activeScore}
              onChange={handleScoreChange}
              placeholder={scoreType === 'CGPA' ? 'e.g. 7.0' : 'e.g. 60'}
              className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 ${scoreError ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`} />
          </div>
          {scoreError ? (
            <p className="text-[11px] text-red-500 font-medium mt-1">{scoreError}</p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">Enter the minimum CGPA or Percentage required for eligibility.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Max Backlogs</label>
          <input type="number" step="1" min="0" value={value.maxBacklogs ?? ''}
            onChange={e => onChange({ maxBacklogs: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 0"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Eligible Batches</label>
          <MultiSelect
            value={value.eligibleBatchIds || []}
            onChange={next => onChange({ eligibleBatchIds: next })}
            options={batches.map(b => ({ value: b.id, label: b.name }))}
            placeholder={batches.length === 0 ? 'None available' : 'All batches (no restriction)'}
            emptyLabel="No batches available"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Eligible Courses</label>
          <MultiSelect
            value={value.eligibleCourseIds || []}
            onChange={next => onChange({ eligibleCourseIds: next })}
            options={courses.map(c => ({ value: c.id, label: c.title }))}
            placeholder={courses.length === 0 ? 'None available' : 'All courses (no restriction)'}
            emptyLabel="No courses available"
          />
        </div>
      </div>
    </div>
  )
}