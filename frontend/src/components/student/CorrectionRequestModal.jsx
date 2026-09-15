'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'
import CustomSelect from '@/components/ui/CustomSelect'
import FormDrawer from '@/components/ui/FormDrawer'
import clsx from 'clsx'

const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE']

export default function CorrectionRequestModal({ record, onClose, onSubmitted }) {
  const [requestedStatus, setRequestedStatus] = useState('PRESENT')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (!record) return null

  const isReasonValid = Boolean(reason.trim())
  const isUrlValid = !documentUrl.trim() || /^https?:\/\/.+/i.test(documentUrl.trim())
  const isFormValid = isReasonValid && isUrlValid
  const isDirty = Boolean(reason || comment || documentUrl || requestedStatus !== 'PRESENT')

  const title = record.attendanceStatus === 'ABSENT'
    ? 'Request Present from Admin'
    : record.attendanceId
    ? 'Request Attendance Correction'
    : 'Report Missing Attendance'

  const submit = async (e) => {
    e?.preventDefault()
    setSubmitted(true)
    if (!isFormValid) return

    setSubmitting(true)
    try {
      await studentApi.requestCorrection({
        attendanceId: record.attendanceId || undefined,
        dailyClassId: !record.attendanceId && record.classId ? record.classId : undefined,
        meetingLinkId: !record.attendanceId && !record.classId ? record.meetingLinkId : undefined,
        requestedStatus,
        reason: reason.trim(),
        comment: comment.trim() || undefined,
        documentUrl: documentUrl.trim() || undefined,
      })
      toast.success(requestedStatus === 'PRESENT' ? 'Present request sent to admin' : 'Correction request submitted')
      onSubmitted?.()
      onClose?.()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDrawer
      open={true}
      onClose={onClose}
      title={title}
      subtitle={record.classTitle}
      isDirty={isDirty}
      width="w-full sm:w-[480px]"
    >
      <form onSubmit={submit} noValidate className="p-4 sm:p-6 space-y-4">
        <div className="p-3 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-100 dark:border-gray-800 space-y-2">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Class Title</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{record.classTitle}</p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-gray-700/60">
            <span className="text-xs text-gray-500">Current Status</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              {record.attendanceStatus || 'Not Marked'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Expected Status *
          </label>
          <CustomSelect
            value={requestedStatus}
            onChange={setRequestedStatus}
            options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Reason *
          </label>
          <input
            type="text"
            value={reason}
            onBlur={() => setTouched(prev => ({ ...prev, reason: true }))}
            onChange={e => setReason(e.target.value)}
            placeholder="Enter reason for attendance correction"
            className={clsx(
              'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all',
              ((touched.reason || submitted) && !isReasonValid) && 'border-red-500'
            )}
          />
          {(touched.reason || submitted) && !isReasonValid && (
            <p className="text-xs text-red-500 mt-1">Reason is required</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Additional Comment <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Enter additional comments (optional)..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Supporting Document URL <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            type="url"
            value={documentUrl}
            onBlur={() => setTouched(prev => ({ ...prev, documentUrl: true }))}
            onChange={e => setDocumentUrl(e.target.value)}
            placeholder="Enter supporting document link (optional, https://...)"
            className={clsx(
              'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all',
              ((touched.documentUrl || submitted) && !isUrlValid) && 'border-red-500'
            )}
          />
          {(touched.documentUrl || submitted) && !isUrlValid && (
            <p className="text-xs text-red-500 mt-1">Please enter a valid URL starting with http:// or https://</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (submitted && !isFormValid)}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md transition-all disabled:opacity-50 min-w-[120px]"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </FormDrawer>
  )
}
