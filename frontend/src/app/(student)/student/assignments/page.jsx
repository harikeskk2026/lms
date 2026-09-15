'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { format, formatDistanceToNow } from 'date-fns'
import { ClipboardList, Upload, X, ChevronDown, ChevronUp, Paperclip, Eye, Clock, Award, Lock, AlertCircle, RefreshCw } from 'lucide-react'
import { useAssignments } from '@/hooks/useStudentDashboard'
import { studentApi, resolveFileUrl } from '@/lib/api'
import toast from 'react-hot-toast'
import SkeletonCard from '@/components/student/SkeletonCard'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'
import FormDrawer from '@/components/ui/FormDrawer'

const FILTERS = ['All', 'Pending', 'Pending Approval', 'Submitted', 'Graded', 'Overdue', 'Closed']
const ALLOWED_SUBMISSION_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.csv', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.zip']

export function parseAssignmentDueDate(dueDate, closeTime) {
  if (!dueDate) return null
  try {
    const parts = dueDate.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return new Date(dueDate)
    const [year, month, day] = parts
    if (closeTime) {
      const timeParts = closeTime.split(':').map(Number)
      const hours = timeParts[0] || 0
      const minutes = timeParts[1] || 0
      const seconds = timeParts[2] || 0
      return new Date(year, month - 1, day, hours, minutes, seconds)
    }
    return new Date(year, month - 1, day, 23, 59, 59)
  } catch {
    return new Date(dueDate)
  }
}

function dueDateLabel(dueDate, closeTime, isClosed) {
  if (isClosed) {
    return { text: 'Assignment Closed', cls: 'text-red-600 dark:text-red-400 font-semibold' }
  }
  const due = parseAssignmentDueDate(dueDate, closeTime)
  if (!due) return { text: 'No due date', cls: 'text-gray-500' }
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()

  if (diffMs < 0) {
    const daysOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
    if (daysOverdue === 0) {
      return { text: 'Overdue today', cls: 'text-red-600 dark:text-red-400 font-semibold' }
    }
    return { text: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`, cls: 'text-red-600 dark:text-red-400 font-semibold' }
  }

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60))
  if (hoursLeft < 1) {
    const minsLeft = Math.max(1, Math.floor(diffMs / (1000 * 60)))
    return { text: `Due in ${minsLeft} min${minsLeft !== 1 ? 's' : ''}`, cls: 'text-rose-600 dark:text-rose-400 font-bold animate-pulse' }
  }
  if (hoursLeft < 24 && due.getDate() === now.getDate()) {
    return { text: `Due today (${hoursLeft}h left)`, cls: 'text-orange-600 dark:text-orange-400 font-semibold' }
  }
  if (diffDays === 1) {
    return { text: 'Due tomorrow', cls: 'text-amber-600 dark:text-amber-400 font-semibold' }
  }
  return { text: `Due in ${diffDays} days`, cls: 'text-gray-500 dark:text-gray-400' }
}

function formatEventTime(dateStr, includeRelative = true) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const formatted = format(d, 'MMM d, yyyy · h:mm a')
    if (!includeRelative) return formatted
    const relative = formatDistanceToNow(d, { addSuffix: true })
    return `${formatted} (${relative})`
  } catch {
    return ''
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function SubmitModal({ assignment, onClose, onSuccess }) {
  const [mounted, setMounted] = useState(false)
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewState, setPreviewState] = useState(null)

  const handlePreviewFile = (f) => {
    const objUrl = URL.createObjectURL(f)
    setPreviewState({ url: objUrl, name: f.name, isBlob: true })
  }

  const closePreview = () => {
    if (previewState?.isBlob && previewState.url) {
      URL.revokeObjectURL(previewState.url)
    }
    setPreviewState(null)
  }

  useEffect(() => {
    return () => {
      if (previewState?.isBlob && previewState.url) {
        URL.revokeObjectURL(previewState.url)
      }
    }
  }, [previewState])

  const processFiles = (pickedFiles) => {
    if (!pickedFiles || pickedFiles.length === 0) return
    const invalid = []
    const valid = []
    for (const f of pickedFiles) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      if (!ALLOWED_SUBMISSION_EXTENSIONS.includes(ext)) {
        invalid.push(f.name)
      } else {
        if (!files.some(existing => existing.name === f.name && existing.size === f.size) &&
          !valid.some(v => v.name === f.name && v.size === f.size)) {
          valid.push(f)
        }
      }
    }

    if (invalid.length > 0) {
      const errMsg = `Unsupported file type: "${invalid.join(', ')}". Allowed formats: PDF, Word, PowerPoint, Text, Sheets, Images, and ZIP.`
      setFileError(errMsg)
      toast.error(errMsg)
    } else {
      setFileError('')
    }

    if (valid.length > 0) {
      setFiles(prev => [...prev, ...valid])
    }
  }

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || [])
    processFiles(picked)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    processFiles(dropped)
  }

  const removeFile = (idxToRemove) => {
    setFiles(prev => prev.filter((_, i) => i !== idxToRemove))
  }

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async () => {
    if (files.length === 0) return toast.error('Please select at least one file to upload')
    setLoading(true)
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      if (notes.trim()) form.append('notes', notes.trim())
      await studentApi.submitAssignment(assignment.id, form)
      toast.success('Assignment submitted successfully!')
      onSuccess?.()
      onClose?.()
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Submission failed'
      if (err.response?.status === 400 || serverMsg.includes('closed') || serverMsg.includes('deadline')) {
        toast.error('Assignment is closed or deadline has passed. Submissions are no longer accepted.')
      } else {
        toast.error(serverMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const isDirty = files.length > 0 || Boolean(notes.trim())

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh] space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-purple-600 dark:text-purple-400" size={20} />
            <h2 className="font-display font-bold text-lg text-gray-800 dark:text-white">Submit Assignment</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Drop zone */}
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`block w-full border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${dragOver
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
              : 'border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
          >
            <Upload size={24} className="mx-auto text-purple-600 dark:text-purple-400 mb-2" />
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Click to browse or drag & drop files</p>
            <p className="text-xs text-gray-400 mt-1">Upload single or multiple files (PDF, DOC, DOCX, PPT, Images, ZIP)</p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {/* Inline Error Message */}
          {fileError && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Selected files list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Selected Files ({files.length})
                </span>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30 text-xs">
                    <div className="flex items-center gap-2 min-w-0 mr-2">
                      <Paperclip size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 break-words">{f.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">({formatFileSize(f.size)})</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewFile(f)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-2 py-1 rounded-lg transition-colors"
                        title="Preview file"
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Submission Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter submission notes (optional)..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md transition-all disabled:opacity-50 min-w-[110px]"
          >
            {loading ? 'Submitting…' : `Submit${files.length > 1 ? ` (${files.length} files)` : ''}`}
          </button>
        </div>

        {previewState && (
          <ViewAttachmentModal
            url={previewState.url}
            name={previewState.name}
            onClose={closePreview}
          />
        )}
      </div>
    </div>,
    document.body
  )
}

function AssignmentCard({ a, onSubmit }) {
  const [expanded, setExpanded] = useState(false)
  const [viewingFile, setViewingFile] = useState(null)
  const s = a.submission
  const isOverdue = a.isOverdue
  const isClosed = a.status === 'CLOSED'
  const statusLabel = (!s || s.status === 'PENDING') && isClosed
    ? 'CLOSED'
    : (s ? s.status : isOverdue ? 'OVERDUE' : 'PENDING')
  const { text: dueText, cls: dueCls } = dueDateLabel(a.dueDate, a.closeTime, isClosed)

  const statusColors = {
    GRADED: 'bg-green-100 text-green-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border border-amber-200',
    REJECTED: 'bg-red-100 text-red-700 border border-red-200',
    PENDING: 'bg-yellow-100 text-yellow-800',
    OVERDUE: 'bg-yellow-200 text-yellow-900',
    LATE: 'bg-orange-100 text-orange-700',
    CLOSED: 'bg-red-100 text-red-700 border border-red-200',
  }

  return (
    <div className="glass-card p-5 hover:scale-[1.005] transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-brand-100 text-brand-700 text-[10px]">{a.batchName}</span>
            {isClosed && (
              <span className="chip bg-red-100 text-red-700 border border-red-200 text-[10px] flex items-center gap-1 font-bold">
                <Lock size={10} /> CLOSED
              </span>
            )}
            {isOverdue && !s && !isClosed && (
              <span className="chip bg-yellow-200 text-yellow-900 text-[10px]">OVERDUE</span>
            )}
          </div>
          <h3 className="font-display font-bold text-gray-800 dark:text-white">{a.title}</h3>
        </div>
        <span className={`chip text-xs flex-shrink-0 ${statusColors[statusLabel] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabel === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : statusLabel}
        </span>
      </div>

      {/* Description */}
      <div className="mb-3">
        <p className={`text-sm text-gray-600 dark:text-gray-400 ${expanded ? '' : 'line-clamp-2'}`}>
          {a.description}
        </p>
        {a.description.length > 100 && (
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-brand-600 hover:underline mt-1 flex items-center gap-0.5">
            {expanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More</>}
          </button>
        )}

        {/* Assignment files attached by Admin / Trainer */}
        {((a.attachments && a.attachments.length > 0) || a.attachmentUrl) && (
          <div className="mt-2.5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Assignment Files ({a.attachments?.length || 1})
            </span>
            <div className="flex flex-wrap gap-2">
              {((a.attachments && a.attachments.length > 0)
                ? a.attachments
                : [{ fileUrl: a.attachmentUrl, fileName: a.attachmentName }]
              ).map((att, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setViewingFile({ url: resolveFileUrl(att.fileUrl), name: att.fileName })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-100 dark:border-purple-800/40"
                  title="Preview assignment file"
                >
                  <Paperclip size={12} className="text-purple-500" />
                  <span className="break-words">{att.fileName || `Attachment ${idx + 1}`}</span>
                  <Eye size={12} className="text-purple-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewingFile && (
        <ViewAttachmentModal
          url={viewingFile.url}
          name={viewingFile.name}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* Awaiting Approval Notice */}
      {s?.status === 'PENDING_APPROVAL' && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⏳</span> Awaiting Trainer Approval{a.trainerName ? `: ${a.trainerName}` : ''}
            </p>
            {s.submittedAt && (
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1">
                <Clock size={11} /> Submitted {formatEventTime(s.submittedAt)}
              </span>
            )}
          </div>
          <p className="text-amber-700 dark:text-amber-400 mt-0.5">
            {a.trainerName
              ? `Your submission has been received and is waiting to be approved by your trainer (${a.trainerName}).`
              : 'Your submission has been received and is waiting to be approved by your trainer.'}
          </p>
        </div>
      )}

      {/* Rejection Alert Notice */}
      {s?.status === 'REJECTED' && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
            <p className="font-semibold flex items-center gap-1.5">
              <span>❌</span> Submission Rejected
            </p>
            {s.gradedAt && (
              <span className="text-[11px] text-red-600/80 dark:text-red-400/80 flex items-center gap-1">
                <Clock size={11} /> {formatEventTime(s.gradedAt)}
              </span>
            )}
          </div>
          <p className="text-red-600 dark:text-red-400 mt-0.5">
            {s.rejectionReason ? `Reason: ${s.rejectionReason}` : 'Your submission was rejected by the admin. Please revise and resubmit.'}
          </p>
        </div>
      )}

      {/* Student's submitted files section */}
      {s && (s.files?.length > 0 || s.fileUrl) && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              Your Submitted Files ({s.files?.length || 1})
            </p>
            {s.submittedAt && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock size={11} className="text-purple-500" />
                Submitted {formatEventTime(s.submittedAt)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.files && s.files.length > 0 ? (
              s.files.map((sf, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setViewingFile({ url: resolveFileUrl(sf.fileUrl), name: sf.fileName })}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <Paperclip size={12} />
                  <span className="break-words">{sf.fileName || `File ${i + 1}`}</span>
                  <Eye size={11} className="text-gray-400" />
                </button>
              ))
            ) : s.fileUrl ? (
              <button
                type="button"
                onClick={() => setViewingFile({ url: resolveFileUrl(s.fileUrl), name: s.fileName })}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-purple-600 hover:text-purple-700 font-medium"
              >
                <Paperclip size={12} />
                <span className="break-words">{s.fileName || 'Submitted File'}</span>
                <Eye size={11} className="text-gray-400" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100/80 dark:border-gray-800/80">
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-gray-400 flex-shrink-0" />
            <span className={`font-medium ${dueCls}`}>{dueText}</span>
            {parseAssignmentDueDate(a.dueDate, a.closeTime) && (
              <span className="text-gray-400 dark:text-gray-500">
                • {format(parseAssignmentDueDate(a.dueDate, a.closeTime), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
          {s?.submittedAt && !s?.gradedAt && (
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              • Submitted {format(new Date(s.submittedAt), 'MMM d, h:mm a')}
            </span>
          )}
          {s?.gradedAt && (
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              • Graded {format(new Date(s.gradedAt), 'MMM d, h:mm a')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {s?.grade !== null && s?.grade !== undefined && (
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border ${s.grade >= 80
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                  }`}
              >
                <Award size={14} className={s.grade >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'} />
                <span className="font-medium opacity-80">Grade:</span>
                <span className="text-sm font-extrabold">{s.grade}/{a.maxMarks}</span>
                {a.maxMarks > 0 && (
                  <span className="text-[11px] font-semibold opacity-75">
                    ({Math.round((s.grade / a.maxMarks) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          )}
          {isClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold border border-gray-200 dark:border-gray-700">
              <Lock size={13} className="text-gray-400" />
              Submissions Closed
            </span>
          ) : (!s || s.status === 'PENDING') ? (
            <button onClick={() => onSubmit(a)} className="btn-primary text-xs py-2 px-4">
              {isOverdue ? 'Submit Late' : 'Upload Submission'}
            </button>
          ) : null}
          {s?.status === 'REJECTED' && (
            isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-semibold border border-gray-200">
                <Lock size={13} className="text-gray-400" />
                Assignment Closed
              </span>
            ) : (
              <button onClick={() => onSubmit(a)} className="btn-primary text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white">
                Resubmit Assignment
              </button>
            )
          )}
          {s?.status === 'GRADED' && s.feedback && (
            <button onClick={() => setExpanded(e => !e)} className="btn-outline text-xs py-2 px-3">
              {expanded ? 'Hide Feedback' : 'View Feedback'}
            </button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {expanded && s?.feedback && (
        <div className="mt-3 p-3.5 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Trainer Feedback</p>
            {s.gradedAt && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock size={11} className="text-purple-500" />
                Graded {formatEventTime(s.gradedAt)}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s.feedback}</p>
        </div>
      )}
    </div>
  )
}

export default function AssignmentsPage() {
  const { data: assignments, loading, error, refetch } = useAssignments()
  const [filter, setFilter] = useState('All')
  const [submitTarget, setSubmitTarget] = useState(null)
  const [, setTick] = useState(0)

  // Live dynamic timer: refresh relative time displays every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  const filtered = !assignments ? [] : assignments.filter(a => {
    if (filter === 'All') return true
    if (filter === 'Pending') return (!a.submission || a.submission.status === 'PENDING') && a.status !== 'CLOSED'
    if (filter === 'Pending Approval') return a.submission?.status === 'PENDING_APPROVAL'
    if (filter === 'Submitted') return a.submission?.status === 'SUBMITTED'
    if (filter === 'Graded') return a.submission?.status === 'GRADED'
    if (filter === 'Overdue') return a.isOverdue && a.status !== 'CLOSED'
    if (filter === 'Closed') return a.status === 'CLOSED'
    return true
  })

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Assignments</h1>
          <p className="text-sm text-gray-500">{assignments?.length || 0} total assignments</p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-700 hover:text-purple-600 transition-all disabled:opacity-50 cursor-pointer shadow-2xs self-start sm:self-auto"
          title="Refresh assignments"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {FILTERS.map(f => {
          const count = !assignments ? 0 : f === 'All' ? assignments.length :
            f === 'Pending' ? assignments.filter(a => (!a.submission || a.submission.status === 'PENDING') && a.status !== 'CLOSED').length :
              f === 'Pending Approval' ? assignments.filter(a => a.submission?.status === 'PENDING_APPROVAL').length :
                f === 'Submitted' ? assignments.filter(a => a.submission?.status === 'SUBMITTED').length :
                  f === 'Graded' ? assignments.filter(a => a.submission?.status === 'GRADED').length :
                    f === 'Overdue' ? assignments.filter(a => a.isOverdue && a.status !== 'CLOSED').length :
                      f === 'Closed' ? assignments.filter(a => a.status === 'CLOSED').length : 0
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-purple-100 dark:border-purple-800 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                }`}>
              {f}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No assignments in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <AssignmentCard key={a.id} a={a} onSubmit={setSubmitTarget} />
          ))}
        </div>
      )}

      {submitTarget && (
        <SubmitModal
          assignment={submitTarget}
          onClose={() => setSubmitTarget(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

