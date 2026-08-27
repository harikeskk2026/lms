'use client'
import { useEffect, useState } from 'react'
import batchService from '@/services/batchService'
import departmentService from '@/services/departmentService'
import courseService from '@/services/courseService'

// Eligibility is never hard-coded - it's expressed entirely through these
// structured criteria fields on the Drive. Leaving a numeric field blank, or a
// checklist empty, means "no restriction on that dimension".
export default function EligibilityCriteriaFields({ value, onChange }) {
  const [batches, setBatches] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])

  useEffect(() => {
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
    departmentService.list().then(r => setDepartments(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  const toggleId = (key, id) => {
    const current = value[key] || []
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    onChange({ [key]: next })
  }

  function ChecklistBox({ label, items, selectedIds, onToggle, getLabel }) {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-1">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 px-1 py-1">None available</p>
          ) : items.map(item => (
            <label key={item.id} className="flex items-center gap-2 px-1 py-0.5 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} />
              {getLabel(item)}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {selectedIds.length === 0 ? 'No restriction - open to all' : `${selectedIds.length} selected`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Min CGPA</label>
          <input type="number" step="0.1" min="0" max="10" value={value.minCgpa ?? ''}
            onChange={e => onChange({ minCgpa: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 7.0"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Min Percentage</label>
          <input type="number" step="0.1" min="0" max="100" value={value.minPercentage ?? ''}
            onChange={e => onChange({ minPercentage: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 60"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Max Backlogs</label>
          <input type="number" step="1" min="0" value={value.maxBacklogs ?? ''}
            onChange={e => onChange({ maxBacklogs: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 0"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ChecklistBox label="Eligible Batches" items={batches} selectedIds={value.eligibleBatchIds || []}
          onToggle={id => toggleId('eligibleBatchIds', id)} getLabel={b => b.name} />
        <ChecklistBox label="Eligible Departments" items={departments} selectedIds={value.eligibleDepartmentIds || []}
          onToggle={id => toggleId('eligibleDepartmentIds', id)} getLabel={d => d.name} />
        <ChecklistBox label="Eligible Courses" items={courses} selectedIds={value.eligibleCourseIds || []}
          onToggle={id => toggleId('eligibleCourseIds', id)} getLabel={c => c.title} />
      </div>
    </div>
  )
}
