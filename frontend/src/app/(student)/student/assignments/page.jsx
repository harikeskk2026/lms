'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { ClipboardList, Upload, X, ChevronDown, ChevronUp, Paperclip, Eye, ZoomIn, ZoomOut } from 'lucide-react'
import { useAssignments } from '@/hooks/useStudentDashboard'
import { studentApi, resolveFileUrl } from '@/lib/api'
import toast from 'react-hot-toast'
import SkeletonCard from '@/components/student/SkeletonCard'

const FILTERS = ['All', 'Pending', 'Submitted', 'Graded', 'Overdue']
const ALLOWED_SUBMISSION_EXTENSIONS = ['.pdf', '.docx', '.xls', '.xlsx']
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

function dueDateLabel(dueDate) {
  const due = new Date(dueDate)
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

function SubmitModal({ assignment, onClose, onSuccess }) {
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const picked = e.target.files[0]
    if (!picked) return
    const ext = picked.name.slice(picked.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_SUBMISSION_EXTENSIONS.includes(ext)) {
      toast.error('Only PDF, DOCX, XLS, or XLSX files are allowed')
      e.target.value = ''
      return
    }
    setFile(picked)
  }

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async () => {
    if (!file) return toast.error('Please select a file')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
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
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-base">Submit Assignment</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{assignment.title}</p>

        {/* Drop zone */}
        <label className="block w-full border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl p-6 text-center cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
          <Upload size={24} className="mx-auto text-purple-600 dark:text-purple-400 mb-2" />
          {file ? (
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">{file.name}</p>
          ) : (
            <p className="text-sm text-gray-400">Click to upload or drag & drop<br /><span className="text-xs">PDF, DOCX, XLS, XLSX</span></p>
          )}
          <input type="file" accept=".pdf,.docx,.xls,.xlsx" className="hidden" onChange={handleFileChange} />
        </label>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add any notes for your trainer (optional)..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !file} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 disabled:opacity-60 transition-all">
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Renders each PDF page onto its own <canvas> via pdf.js instead of relying on
// the browser's built-in PDF plugin (which upscales blurrily inside a resized
// iframe). The canvas's pixel buffer is rendered at `effectiveScale * devicePixelRatio`
// (clamped 2x–3x) while its CSS size stays at `effectiveScale` — a sharp bitmap
// displayed at a smaller/matching CSS size, so text and lines stay crisp on
// Retina/high-DPI screens instead of being scaled up from a low-res render.
// `effectiveScale` itself is `containerWidth-fit-baseline * zoomMultiplier`, so the
// page fills the available width by default and the +/-/reset controls zoom
// further from there — every zoom level re-renders at full sharpness rather than
// stretching a fixed-resolution bitmap.
function PdfCanvasViewer({ url, zoomMultiplier }) {
  const scrollRef = useRef(null)
  const canvasRefs = useRef([])
  const renderTasksRef = useRef([])
  const pdfRef = useRef(null)
  const nativeWidthRef = useRef(null)

  const [numPages, setNumPages] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNumPages(0)
    pdfRef.current = null
    nativeWidthRef.current = null

    ;(async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return
        const firstPage = await pdf.getPage(1)
        nativeWidthRef.current = firstPage.getViewport({ scale: 1 }).width
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('Failed to load PDF preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [url])

  // Auto-fit the page to the available width on load and on modal/window resize.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const baseScale = containerWidth && nativeWidthRef.current
    ? (containerWidth - 32) / nativeWidthRef.current
    : 1
  const effectiveScale = Math.max(0.1, baseScale * zoomMultiplier)

  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || numPages === 0 || !containerWidth) return
    let cancelled = false

    renderTasksRef.current.forEach(t => t?.cancel?.())
    renderTasksRef.current = []

    const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)

    ;(async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) return
        const canvas = canvasRefs.current[pageNum - 1]
        if (!canvas) continue
        const page = await pdf.getPage(pageNum)
        const cssViewport = page.getViewport({ scale: effectiveScale })
        const renderViewport = page.getViewport({ scale: effectiveScale * outputScale })

        canvas.width = Math.ceil(renderViewport.width)
        canvas.height = Math.ceil(renderViewport.height)
        canvas.style.width = `${Math.ceil(cssViewport.width)}px`
        canvas.style.height = `${Math.ceil(cssViewport.height)}px`

        const ctx = canvas.getContext('2d')
        const task = page.render({ canvasContext: ctx, viewport: renderViewport })
        renderTasksRef.current[pageNum - 1] = task
        try {
          await task.promise
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') console.error(e)
        }
      }
    })()

    return () => { cancelled = true }
  }, [numPages, containerWidth, effectiveScale])

  useEffect(() => () => pdfRef.current?.destroy?.(), [])

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-500">{error}</div>
  }

  return (
    <div
      ref={scrollRef}
      onContextMenu={e => e.preventDefault()}
      className="flex-1 min-h-0 w-full overflow-auto bg-gray-100 flex flex-col items-center gap-4 p-4"
    >
      {loading && <p className="text-sm text-gray-500 py-8">Loading preview…</p>}
      {Array.from({ length: numPages }).map((_, i) => (
        <canvas key={i} ref={el => (canvasRefs.current[i] = el)} className="shadow-md bg-white" />
      ))}
    </div>
  )
}

function ViewAttachmentModal({ url, name, onClose }) {
  const [zoomMultiplier, setZoomMultiplier] = useState(1)
  const isPdf = /\.pdf($|\?)/i.test(url)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-white rounded-t-2xl">
          <h3 className="font-display font-bold text-sm sm:text-base text-gray-800 truncate">{name || 'Assignment attachment'}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPdf && (
              <>
                <button type="button" onClick={() => setZoomMultiplier(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Zoom out">
                  <ZoomOut size={18} />
                </button>
                <button type="button" onClick={() => setZoomMultiplier(1)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 w-12 text-center" title="Reset zoom">
                  {Math.round(zoomMultiplier * 100)}%
                </button>
                <button type="button" onClick={() => setZoomMultiplier(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Zoom in">
                  <ZoomIn size={18} />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={20} /></button>
          </div>
        </div>
        {isPdf ? (
          <PdfCanvasViewer url={url} zoomMultiplier={zoomMultiplier} />
        ) : (
          <div className="flex-1 min-h-0 w-full flex items-center justify-center text-sm text-gray-500 p-6 text-center">
            Preview isn't available for this file type. Ask your instructor for a PDF version if you need to view it here.
          </div>
        )}
      </div>
    </div>
  )
}


function AssignmentCard({ a, onSubmit }) {
  const [expanded, setExpanded] = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState(false)
  const s = a.submission
  const isOverdue = a.isOverdue
  const statusLabel = s ? s.status : isOverdue ? 'OVERDUE' : 'PENDING'
  const { text: dueText, cls: dueCls } = dueDateLabel(a.dueDate)

  const statusColors = {
    GRADED:    'bg-green-100 text-green-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    PENDING:   'bg-yellow-100 text-yellow-800',
    OVERDUE:   'bg-yellow-200 text-yellow-900',
    LATE:      'bg-orange-100 text-orange-700',
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
          {statusLabel}
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
        {a.attachmentUrl && (
          <button type="button" onClick={() => setViewingAttachment(true)}
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline font-medium mt-2">
            <Paperclip size={12} /> {a.attachmentName || 'Assignment attachment'} <Eye size={11} />
          </button>
        )}
      </div>

      {viewingAttachment && (
        <ViewAttachmentModal
          url={resolveFileUrl(a.attachmentUrl)}
          name={a.attachmentName}
          onClose={() => setViewingAttachment(false)}
        />
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

export default function AssignmentsPage() {
  const { data: assignments, loading, error, refetch } = useAssignments()
  const [filter, setFilter]     = useState('All')
  const [submitTarget, setSubmitTarget] = useState(null)

  const filtered = !assignments ? [] : assignments.filter(a => {
    if (filter === 'All')       return true
    if (filter === 'Pending')   return !a.submission || a.submission.status === 'PENDING'
    if (filter === 'Submitted') return a.submission?.status === 'SUBMITTED'
    if (filter === 'Graded')    return a.submission?.status === 'GRADED'
    if (filter === 'Overdue')   return a.isOverdue
    return true
  })

  return (
    <div className="page-wrapper">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Assignments</h1>
          <p className="text-sm text-gray-500">{assignments?.length || 0} total assignments</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => {
          const count = !assignments ? 0 : f === 'All' ? assignments.length :
            f === 'Pending'   ? assignments.filter(a => !a.submission || a.submission.status === 'PENDING').length :
            f === 'Submitted' ? assignments.filter(a => a.submission?.status === 'SUBMITTED').length :
            f === 'Graded'    ? assignments.filter(a => a.submission?.status === 'GRADED').length :
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

      {loading ? (
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
