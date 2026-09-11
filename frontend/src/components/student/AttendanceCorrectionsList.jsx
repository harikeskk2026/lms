'use client'
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { format } from 'date-fns'
import { studentApi } from '@/lib/api'

const STATUS_STYLE = {
  PENDING:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const AttendanceCorrectionsList = forwardRef(function AttendanceCorrectionsList(_props, ref) {
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    studentApi.getMyCorrections()
      .then(r => setCorrections(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])
  useImperativeHandle(ref, () => ({ reload: load }))

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Correction Requests</h3>
      {loading ? (
        <div className="h-16 rounded-xl bg-purple-50 dark:bg-purple-900/20 animate-pulse" />
      ) : corrections.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No correction requests yet. Click a marked day on the calendar to request one.</p>
      ) : (
        <div className="space-y-2">
          {corrections.map(c => (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border border-purple-50 dark:border-purple-900/20 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{c.classTitle}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(c.classDate), 'MMM d, yyyy')} · {c.currentStatus} → {c.requestedStatus}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{c.reason}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg self-start sm:self-auto ${STATUS_STYLE[c.status]}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default AttendanceCorrectionsList
