'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { X, Video, PlayCircle } from 'lucide-react'

export default function AttendanceDayModal({ date, records = [], loading, onClose, onRequestCorrection }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white">
            {date ? format(new Date(date), 'MMMM d, yyyy') : ''}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="h-24 rounded-xl bg-purple-50 dark:bg-purple-900/20 animate-pulse" />
        ) : records.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
              ☕
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">No Class Scheduled</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              No classes were scheduled for your batch on this date. This day does not count against your attendance rate.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(r => (
              <div key={r.attendanceId || r.classId || r.meetingLinkId} className="rounded-xl border border-purple-100 dark:border-purple-900/30 p-4 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 dark:text-white">{r.classTitle}</p>
                  {r.meetingLinkId && !r.classId && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      Scheduled Class
                    </span>
                  )}
                </div>
                {r.trainerId && <p className="text-xs text-gray-500">Trainer #{r.trainerId}</p>}
                <p className="text-xs text-gray-500">{format(new Date(r.date), 'h:mm a, d MMM yyyy')}</p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {r.attendanceId ? (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                      r.attendanceStatus === 'PRESENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      r.attendanceStatus === 'ABSENT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}>
                      {r.attendanceStatus}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      Not Marked
                    </span>
                  )}
                  {r.correctionPending && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      ⏳ Pending Request: {r.correctionRequestedStatus || 'PRESENT'}
                    </span>
                  )}
                  {r.markedAt && (
                    <span className="text-[10px] text-gray-400">Marked {format(new Date(r.markedAt), 'h:mm a')}</span>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  {r.meetLink && (
                    <a href={r.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-purple-600 hover:underline">
                      <Video size={12} /> Meeting Link
                    </a>
                  )}
                  {r.recordingUrl && (
                    <a href={r.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-purple-600 hover:underline">
                      <PlayCircle size={12} /> Recording
                    </a>
                  )}
                </div>
                {r.correctionPending ? (
                  <p className="mt-2 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-1.5 border border-amber-200 dark:border-amber-800 inline-block">
                    Request for {r.correctionRequestedStatus || 'PRESENT'} has been sent to Admin (Pending)
                  </p>
                ) : (
                  <button onClick={() => onRequestCorrection(r)}
                    className="mt-2 text-xs font-semibold text-purple-600 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                    {r.attendanceStatus === 'ABSENT' ? 'Request Present from Admin' : (r.attendanceId ? 'Request Correction' : 'Report Missing Attendance')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

