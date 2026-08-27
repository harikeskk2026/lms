'use client'
import { format } from 'date-fns'
import { X, Video, PlayCircle } from 'lucide-react'

export default function AttendanceDayModal({ date, records = [], loading, onClose, onRequestCorrection }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
          <p className="text-sm text-gray-400">No class recorded on this day.</p>
        ) : (
          <div className="space-y-3">
            {records.map(r => (
              <div key={r.attendanceId} className="rounded-xl border border-purple-100 dark:border-purple-900/30 p-4 space-y-1.5">
                <p className="font-semibold text-gray-800 dark:text-white">{r.classTitle}</p>
                {r.trainerId && <p className="text-xs text-gray-500">Trainer #{r.trainerId}</p>}
                <p className="text-xs text-gray-500">{format(new Date(r.date), 'h:mm a, d MMM yyyy')}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    {r.attendanceStatus}
                  </span>
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
                <button onClick={() => onRequestCorrection(r)}
                  className="mt-2 text-xs font-semibold text-purple-600 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  Request Correction
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
