'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'

const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE']

export default function CorrectionRequestModal({ record, onClose, onSubmitted }) {
  const [mounted, setMounted] = useState(false)
  const [requestedStatus, setRequestedStatus] = useState(
    record.attendanceStatus === 'ABSENT' ? 'LEAVE' : 'PRESENT'
  )
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const submit = async () => {
    if (!reason.trim()) return toast.error('Reason is required')
    setSubmitting(true)
    try {
      await studentApi.requestCorrection({
        attendanceId: record.attendanceId,
        requestedStatus,
        reason,
        comment: comment || undefined,
        documentUrl: documentUrl || undefined,
      })
      toast.success('Correction request submitted')
      onSubmitted()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white">Request Correction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Class</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{record.classTitle}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Status</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{record.attendanceStatus}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Expected Status</label>
            <select value={requestedStatus} onChange={e => setRequestedStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason *</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Medical emergency, network issue"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comment (optional)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Supporting Document Link (optional)</label>
            <input value={documentUrl} onChange={e => setDocumentUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <button onClick={submit} disabled={submitting}
          className="mt-4 w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all">
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>,
    document.body
  )
}

