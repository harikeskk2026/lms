'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { ClipboardList, Upload, X, ChevronDown, ChevronUp, Paperclip, Eye } from 'lucide-react'
import { useAssignments } from '@/hooks/useStudentDashboard'
import { studentApi, resolveFileUrl } from '@/lib/api'
import toast from 'react-hot-toast'
import SkeletonCard from '@/components/student/SkeletonCard'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'

const FILTERS = ['All', 'Pending', 'Pending Approval', 'Submitted', 'Graded', 'Overdue']
const ALLOWED_SUBMISSION_EXTENSIONS = ['.pdf', '.docx', '.xls', '.xlsx']

function dueDateLabel(dueDate, closeTime) {
  if (!dueDate) return { text: 'No due date', cls: 'text-gray-500' }
  const due = closeTime ? new Date(`${dueDate}T${closeTime}`) : new Date(`${dueDate}T23:59:59`)
  const diff = differenceInDays(due, new Date())
  if (diff < 0) return { text: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''}`, cls: 'text-yellow-700 dark:text-yellow-400' }
  if (diff === 0) return { text: 'Due today', cls: 'text-orange-600' }
  if (diff === 1) return { text: 'Due tomorrow', cls: 'text-yellow-600' }
  return { text: `Due in ${diff} days`, cls: 'text-gray-500' }
}

function gradeLabel(grade) {
  if (grade === null || grade === undefined) return ''
  if (grade >= 90) return 'A+'
  if (grade >= 80) return 'A'
  if (grade >= 70) return 'B+'
  if (grade >= 60) return 'B'
  return 'C'
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
    const valid = []
    for (const f of pickedFiles) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      if (!ALLOWED_SUBMISSION_EXTENSIONS.includes(ext)) {
        toast.error(`"${f.name}" is not supported. Only PDF, DOCX, XLS, or XLSX files are allowed`)
        continue
      }
      if (files.some(existing => existing.name === f.name && existing.size === f.size) ||
          valid.some(v => v.name === f.name && v.size === f.size)) {
        continue
      }
      valid.push(f)
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
      files.forEach(f => {
        form.append('files', f)
      })
      if (files[0]) {
        form.append('file', files[0])
      }
      form.append('notes', notes)
      await studentApi.submitAssignment(assignment.id, form)
      toast.success('Assignment submitted successfully!')
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-base">Submit Assignment</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{assignment.title}</p>

          {/* Drop zone */}
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`block w-full border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                : 'border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20'
            }`}
          >
            <Upload size={24} className="mx-auto text-purple-600 dark:text-purple-400 mb-2" />
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Click to browse or drag & drop files</p>
            <p className="text-xs text-gray-400 mt-1">Upload single or multiple files (PDF, DOCX, XLS, XLSX)</p>
            <input type="file" multiple accept=".pdf,.docx,.xls,.xlsx" className="hidden" onChange={handleFileChange} />
          </label>

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
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{f.name}</span>
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

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes for your trainer (optional)..."
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || files.length === 0} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all">
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
  const statusLabel = s ? s.status : isOverdue ? 'OVERDUE' : 'PENDING'
  const { text: dueText, cls: dueCls } = dueDateLabel(a.dueDate, a.closeTime)

  const statusColors = {
    GRADED:           'bg-green-100 text-green-700',
    SUBMITTED:        'bg-blue-100 text-blue-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border border-amber-200',
    REJECTED:         'bg-red-100 text-red-700 border border-red-200',
    PENDING:          'bg-yellow-100 text-yellow-800',
    OVERDUE:          'bg-yellow-200 text-yellow-900',
    LATE:             'bg-orange-100 text-orange-700',
  }

  return (
    <div className="glass-card p-5 hover:scale-[1.005] transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-brand-100 text-brand-700 text-[10px]">{a.batchName}</span>
            {isOverdue && !s && (
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
                  <span className="truncate max-w-[180px]">{att.fileName || `Attachment ${idx + 1}`}</span>
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
          <p className="font-semibold">Awaiting Admin Approval</p>
          <p className="text-amber-700 dark:text-amber-400 mt-0.5">Your submission has been received and is waiting to be approved by your admin / trainer.</p>
        </div>
      )}

      {/* Rejection Alert Notice */}
      {s?.status === 'REJECTED' && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
          <p className="font-semibold">Submission Rejected</p>
          <p className="text-red-600 dark:text-red-400 mt-0.5">
            {s.rejectionReason ? `Reason: ${s.rejectionReason}` : 'Your submission was rejected by the admin. Please revise and resubmit.'}
          </p>
        </div>
      )}

      {/* Student's submitted files section */}
      {s && (s.files?.length > 0 || s.fileUrl) && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Your Submitted Files ({s.files?.length || 1})</p>
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
                  <span className="truncate max-w-[150px]">{sf.fileName || `File ${i + 1}`}</span>
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
                <span className="truncate max-w-[150px]">{s.fileName || 'Submitted File'}</span>
                <Eye size={11} className="text-gray-400" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${dueCls}`}>{dueText}</span>
          <span className="text-xs text-gray-400">{format(new Date(a.dueDate), 'MMM d, h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2">
          {s?.grade !== null && s?.grade !== undefined && (
            <span className={`chip text-sm font-bold px-3 py-1 ${
              s.grade >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {s.grade}/{a.maxMarks} · {gradeLabel(s.grade)}
            </span>
          )}
          {(!s || s.status === 'PENDING') && (
            <button onClick={() => onSubmit(a)} className="btn-primary text-xs py-2 px-4">
              {isOverdue ? 'Submit Late' : 'Upload Submission'}
            </button>
          )}
          {s?.status === 'REJECTED' && (
            <button onClick={() => onSubmit(a)} className="btn-primary text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white">
              Resubmit Assignment
            </button>
          )}
          {s?.status === 'GRADED' && s.feedback && (
            <button onClick={() => setExpanded(e => !e)} className="btn-outline text-xs py-2 px-3">
              View Feedback
            </button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {expanded && s?.feedback && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Trainer Feedback</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{s.feedback}</p>
          {s.gradedAt && (
            <p className="text-xs text-gray-400 mt-1">Graded {format(new Date(s.gradedAt), 'MMM d, yyyy')}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Board View Column ────────────────────────────────────────────────────────
const BOARD_COLUMNS = [
  {
    id: 'pending',
    label: 'Pending',
    emoji: '📋',
    color: 'from-yellow-400 to-amber-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800/40',
    match: a => !a.submission || a.submission.status === 'PENDING',
  },
  {
    id: 'review',
    label: 'In Review',
    emoji: '⏳',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    match: a => a.submission?.status === 'PENDING_APPROVAL' || a.submission?.status === 'SUBMITTED',
  },
  {
    id: 'completed',
    label: 'Completed',
    emoji: '✅',
    color: 'from-emerald-400 to-green-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    match: a => a.submission?.status === 'GRADED',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    emoji: '🔴',
    color: 'from-red-400 to-rose-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800/40',
    match: a => a.isOverdue && (!a.submission || a.submission.status === 'PENDING'),
  },
]

export default function AssignmentsPage() {
  const { data: assignments, loading, error, refetch } = useAssignments()
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('list') // 'list' | 'board'
  const [submitTarget, setSubmitTarget] = useState(null)

  const filtered = !assignments ? [] : assignments.filter(a => {
    if (filter === 'All')              return true
    if (filter === 'Pending')          return !a.submission || a.submission.status === 'PENDING'
    if (filter === 'Pending Approval') return a.submission?.status === 'PENDING_APPROVAL'
    if (filter === 'Submitted')        return a.submission?.status === 'SUBMITTED'
    if (filter === 'Graded')           return a.submission?.status === 'GRADED'
    if (filter === 'Overdue')          return a.isOverdue
    return true
  })

  return (
    <div className="page-wrapper">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Assignments</h1>
          <p className="text-sm text-gray-500">{assignments?.length || 0} total assignments</p>
        </div>
        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <button
            id="view-toggle-list"
            onClick={() => setView('list')}
            title="List View"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              view === 'list'
                ? 'bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect x="1" y="2" width="13" height="2.5" rx="1" fill="currentColor"/>
              <rect x="1" y="6.25" width="13" height="2.5" rx="1" fill="currentColor"/>
              <rect x="1" y="10.5" width="13" height="2.5" rx="1" fill="currentColor"/>
            </svg>
            List
          </button>
          <button
            id="view-toggle-board"
            onClick={() => setView('board')}
            title="Board View"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              view === 'board'
                ? 'bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect x="1" y="1" width="4" height="13" rx="1" fill="currentColor"/>
              <rect x="5.5" y="1" width="4" height="13" rx="1" fill="currentColor"/>
              <rect x="10" y="1" width="4" height="13" rx="1" fill="currentColor"/>
            </svg>
            Board
          </button>
        </div>
      </div>

      {/* Filter tabs (only in list view) */}
      {view === 'list' && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {FILTERS.map(f => {
            const count = !assignments ? 0 : f === 'All' ? assignments.length :
              f === 'Pending'          ? assignments.filter(a => !a.submission || a.submission.status === 'PENDING').length :
              f === 'Pending Approval' ? assignments.filter(a => a.submission?.status === 'PENDING_APPROVAL').length :
              f === 'Submitted'        ? assignments.filter(a => a.submission?.status === 'SUBMITTED').length :
              f === 'Graded'           ? assignments.filter(a => a.submission?.status === 'GRADED').length :
              assignments.filter(a => a.isOverdue).length
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-purple-100 dark:border-purple-800 hover:bg-brand-50 dark:hover:bg-brand-900/20'
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
      )}

      {/* ── LIST VIEW ────────────────────────────────────────────────────── */}
      {view === 'list' && (
        loading ? (
          <div className="space-y-3">{[0,1,2,3].map(i => <SkeletonCard key={i} lines={3} />)}</div>
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
        )
      )}

      {/* ── BOARD VIEW ───────────────────────────────────────────────────── */}
      {view === 'board' && (
        loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2 animate-pulse">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                {[0,1].map(j => <div key={j} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {BOARD_COLUMNS.map(col => {
              const cards = (assignments || []).filter(col.match)
              return (
                <div
                  key={col.id}
                  className={`rounded-2xl border ${col.border} ${col.bg} p-3 flex flex-col gap-3`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-1 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{col.emoji}</span>
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{col.label}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${col.color} text-white`}>
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                      <ClipboardList size={22} className="text-gray-400 mb-1.5" />
                      <p className="text-xs text-gray-400">No assignments</p>
                    </div>
                  ) : (
                    cards.map(a => (
                      <BoardCard key={a.id} a={a} onSubmit={setSubmitTarget} />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )
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

// ─── Board Card (compact, used inside kanban columns) ─────────────────────────
function BoardCard({ a, onSubmit }) {
  const [viewingFile, setViewingFile] = useState(null)
  const s = a.submission
  const isOverdue = a.isOverdue
  const { text: dueText, cls: dueCls } = dueDateLabel(a.dueDate, a.closeTime)

  const statusColors = {
    GRADED:           'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    SUBMITTED:        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    REJECTED:         'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    PENDING:          'bg-yellow-100 text-yellow-800',
    OVERDUE:          'bg-yellow-200 text-yellow-900',
  }
  const statusLabel = s ? s.status : isOverdue ? 'OVERDUE' : 'PENDING'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-2">
      {/* Batch + status */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <span className="chip bg-brand-100 text-brand-700 text-[10px] leading-none">{a.batchName}</span>
        <span className={`chip text-[10px] leading-none flex-shrink-0 ${statusColors[statusLabel] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabel === 'PENDING_APPROVAL' ? 'APPROVAL' : statusLabel}
        </span>
      </div>

      {/* Title */}
      <p className="font-semibold text-sm text-gray-800 dark:text-white leading-snug line-clamp-2">{a.title}</p>

      {/* Due date */}
      <p className={`text-[11px] font-medium ${dueCls}`}>{dueText}</p>

      {/* Awaiting approval badge */}
      {s?.status === 'PENDING_APPROVAL' && (
        <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1 border border-amber-100 dark:border-amber-800/40">
          ⏳ Awaiting admin approval
        </div>
      )}

      {/* Rejection notice */}
      {s?.status === 'REJECTED' && (
        <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-2 py-1 border border-red-100 dark:border-red-800/40">
          ❌ {s.rejectionReason ? `Rejected: ${s.rejectionReason}` : 'Rejected — please resubmit'}
        </div>
      )}

      {/* Grade */}
      {s?.grade !== null && s?.grade !== undefined && (
        <div className={`text-xs font-bold text-center py-1 rounded-lg ${s.grade >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {s.grade}/{a.maxMarks} · {gradeLabel(s.grade)}
        </div>
      )}

      {/* Attachment files chip */}
      {((a.attachments && a.attachments.length > 0) || a.attachmentUrl) && (
        <div className="flex flex-wrap gap-1">
          {((a.attachments && a.attachments.length > 0)
            ? a.attachments
            : [{ fileUrl: a.attachmentUrl, fileName: a.attachmentName }]
          ).slice(0, 2).map((att, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setViewingFile({ url: resolveFileUrl(att.fileUrl), name: att.fileName })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-[11px] font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-100 dark:border-purple-800/40"
              title="Preview assignment file"
            >
              <Paperclip size={10} />
              <span className="truncate max-w-[100px]">{att.fileName || `File ${idx+1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action button */}
      {(!s || s.status === 'PENDING') && (
        <button
          onClick={() => onSubmit(a)}
          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-semibold hover:from-purple-700 hover:to-violet-700 transition-all mt-auto"
        >
          {isOverdue ? 'Submit Late' : 'Upload Submission'}
        </button>
      )}
      {s?.status === 'REJECTED' && (
        <button
          onClick={() => onSubmit(a)}
          className="w-full py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all mt-auto"
        >
          Resubmit
        </button>
      )}

      {viewingFile && (
        <ViewAttachmentModal
          url={viewingFile.url}
          name={viewingFile.name}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  )
}

