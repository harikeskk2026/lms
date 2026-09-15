'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BookOpen, Users, Calendar, Award, Paperclip, Eye,
  Send, Lock, Unlock, Trash2, CheckCircle2, Search, RefreshCw, Check, X, Clock,
  MessageSquare, FileText, Files,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatAssignmentDueDate, format12HourTime } from '@/utils/assignmentDate'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import submissionService from '@/services/submissionService'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { resolveFileUrl } from '@/lib/api'
import CustomSelect from '@/components/ui/CustomSelect'

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-700 border border-blue-200',
  PUBLISHED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
}

const ROW_STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-500',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border border-amber-200',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  LATE: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const ROW_STATUS_LABELS = {
  PENDING: 'Not Submitted',
  PENDING_APPROVAL: 'Pending Approval',
  SUBMITTED: 'Submitted',
  LATE: 'Late',
  REJECTED: 'Rejected',
}

const EVAL_STATUS_COLORS = {
  EVALUATED: 'bg-green-100 text-green-700',
  PENDING: 'bg-gray-100 text-gray-500',
}

const SUBMISSIONS_PAGE_SIZE = 10
const EMPTY_SUBMISSION_FILTERS = { search: '', status: '', evaluation: '', dateFrom: '', dateTo: '' }

export default function AssignmentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState(true)
  const [subError, setSubError] = useState(false)
  const [viewingFile, setViewingFile] = useState(null)
  const [viewingFilesModal, setViewingFilesModal] = useState(null)
  const [viewingTextModal, setViewingTextModal] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [filters, setFilters] = useState(EMPTY_SUBMISSION_FILTERS)
  const [page, setPage] = useState(1)
  const [gradeInputs, setGradeInputs] = useState({})
  const [feedbackInputs, setFeedbackInputs] = useState({})
  const [savingInline, setSavingInline] = useState({})
  const [evaluatingRow, setEvaluatingRow] = useState(null)
  const [evalMarks, setEvalMarks] = useState('')
  const [evalFeedback, setEvalFeedback] = useState('')
  const [evalErrors, setEvalErrors] = useState({})
  const [evalSaving, setEvalSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopening, setReopening] = useState(false)
  const searchTimer = useRef(null)

  const loadAssignment = () => {
    setLoading(true)
    assignmentService.get(id)
      .then(r => setAssignment(r.data))
      .catch(err => toast.error(err.message || 'Failed to load assignment'))
      .finally(() => setLoading(false))
  }

  const loadSubmissions = () => {
    setSubLoading(true)
    setSubError(false)
    submissionService.list(id)
      .then(r => {
        const list = r.data?.submissions || []
        setSubmissions(list)
        const grades = {}
        const feedbacks = {}
        list.forEach(s => {
          if (s.submissionId) {
            grades[s.submissionId] = s.marks != null ? s.marks : ''
            feedbacks[s.submissionId] = s.feedback || ''
          }
        })
        setGradeInputs(grades)
        setFeedbackInputs(feedbacks)
      })
      .catch(err => { toast.error(err.message || 'Failed to load submissions'); setSubError(true) })
      .finally(() => setSubLoading(false))
  }

  const handleGradeInline = async (row) => {
    const rawMarks = gradeInputs[row.submissionId]
    if (rawMarks === '' || rawMarks === undefined || rawMarks === null) {
      return toast.error('Please enter marks/score')
    }
    const marksNum = Number(rawMarks)
    if (isNaN(marksNum) || marksNum < 0) {
      return toast.error('Please enter valid marks')
    }
    const maxMarks = assignment?.totalMarks || 100
    if (marksNum > maxMarks) {
      return toast.error(`Marks cannot exceed total marks (${maxMarks})`)
    }
    setSavingInline(prev => ({ ...prev, [row.submissionId]: true }))
    try {
      await submissionService.grade(id, row.submissionId, {
        marks: marksNum,
        feedback: (feedbackInputs[row.submissionId] || '').trim(),
        reviewed: true,
      })
      toast.success(`Marks & feedback saved for ${row.studentName}`)
      loadSubmissions()
    } catch (err) {
      toast.error(err.message || 'Failed to save marks and feedback')
    } finally {
      setSavingInline(prev => ({ ...prev, [row.submissionId]: false }))
    }
  }

  useEffect(() => { loadAssignment(); loadSubmissions() }, [id])

  const isEvaluated = (s) => Boolean(s && (s.reviewed || s.marks != null))
  const isPendingEvaluation = (s) => Boolean(
    s && s.submissionId &&
    (s.status === 'SUBMITTED' || s.status === 'LATE' || s.status === 'PENDING_APPROVAL') &&
    !s.reviewed &&
    s.marks == null
  )

  // Summary cards always reflect every student in the batch, independent of the
  // filters/search applied to the table below.
  const stats = useMemo(() => ({
    totalStudents: submissions.length,
    submitted: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'PENDING_APPROVAL').length,
    notSubmitted: submissions.filter(s => s.status === 'PENDING').length,
    late: submissions.filter(s => s.status === 'LATE').length,
    evaluated: submissions.filter(isEvaluated).length,
    pendingEvaluation: submissions.filter(isPendingEvaluation).length,
  }), [submissions])

  const filteredSubmissions = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return submissions.filter(row => {
      if (q) {
        const matches = row.studentName?.toLowerCase().includes(q)
          || row.studentEmail?.toLowerCase().includes(q)
          || String(row.studentId).includes(q)
        if (!matches) return false
      }
      if (filters.status && row.status !== filters.status) return false
      if (filters.evaluation === 'EVALUATED' && !isEvaluated(row)) return false
      if (filters.evaluation === 'PENDING' && !isPendingEvaluation(row)) return false
      if (filters.dateFrom && (!row.submittedAt || new Date(row.submittedAt) < new Date(filters.dateFrom))) return false
      if (filters.dateTo && (!row.submittedAt || new Date(row.submittedAt) > new Date(`${filters.dateTo}T23:59:59`))) return false
      return true
    })
  }, [submissions, filters])

  const totalSubmissionPages = Math.max(1, Math.ceil(filteredSubmissions.length / SUBMISSIONS_PAGE_SIZE))
  const validSubmissionPage = Math.min(page, totalSubmissionPages)
  const pagedSubmissions = filteredSubmissions.slice(
    (validSubmissionPage - 1) * SUBMISSIONS_PAGE_SIZE,
    validSubmissionPage * SUBMISSIONS_PAGE_SIZE
  )

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setFilters(f => ({ ...f, search: v })); setPage(1) }, 300)
  }

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const handlePublish = async () => {
    try { await assignmentService.publish(id); toast.success('Assignment published'); loadAssignment() }
    catch (err) { toast.error(err.message || 'Failed to publish') }
  }

  const handleConfirmClose = async () => {
    setClosing(true)
    try {
      await assignmentService.close(id)
      toast.success('Assignment closed')
      setShowCloseModal(false)
      loadAssignment()
    } catch (err) {
      toast.error(err.message || 'Failed to close')
    } finally {
      setClosing(false)
    }
  }

  const handleConfirmReopen = async () => {
    setReopening(true)
    try {
      await assignmentService.reopen(id)
      toast.success('Assignment reopened')
      setShowReopenModal(false)
      loadAssignment()
    } catch (err) {
      toast.error(err.message || 'Failed to reopen')
    } finally {
      setReopening(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await assignmentService.remove(id)
      toast.success('Assignment deleted')
      setShowDeleteModal(false)
      router.push('/admin/assignments')
    } catch (err) {
      toast.error(err.message || 'Failed to delete assignment')
    } finally {
      setDeleting(false)
    }
  }

  const handleApprove = async (row) => {
    setActionLoading(prev => ({ ...prev, [row.submissionId]: true }))
    try {
      await submissionService.approveOrReject(id, row.submissionId, { action: 'APPROVE' })
      toast.success(`Submission approved for ${row.studentName}`)
      loadSubmissions()
    } catch (err) {
      toast.error(err.message || 'Failed to approve submission')
    } finally {
      setActionLoading(prev => ({ ...prev, [row.submissionId]: false }))
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    setActionLoading(prev => ({ ...prev, [rejectTarget.submissionId]: true }))
    try {
      await submissionService.approveOrReject(id, rejectTarget.submissionId, {
        action: 'REJECT',
        reason: rejectReason.trim() || undefined,
      })
      toast.success(`Submission rejected for ${rejectTarget.studentName}`)
      setRejectTarget(null)
      setRejectReason('')
      loadSubmissions()
    } catch (err) {
      toast.error(err.message || 'Failed to reject submission')
    } finally {
      setActionLoading(prev => ({ ...prev, [rejectTarget.submissionId]: false }))
    }
  }

  const handleOpenEvaluate = (row) => {
    setEvaluatingRow(row)
    setEvalMarks(row.marks != null ? String(row.marks) : '')
    setEvalFeedback(row.feedback || '')
    setEvalErrors({})
  }

  const handleSaveEvaluation = async (e) => {
    e?.preventDefault?.()
    if (!evaluatingRow) return
    const cleanMarks = String(evalMarks || '').trim()
    if (!cleanMarks) {
      setEvalErrors({ marks: 'Please enter marks' })
      return
    }
    const marksNum = Number(cleanMarks)
    if (isNaN(marksNum) || marksNum < 0) {
      setEvalErrors({ marks: 'Please enter a valid numeric score' })
      return
    }
    const maxMarks = assignment?.totalMarks || 100
    if (marksNum > maxMarks) {
      setEvalErrors({ marks: `Marks cannot exceed total marks (${maxMarks})` })
      return
    }
    setEvalErrors({})
    setEvalSaving(true)
    try {
      await submissionService.grade(id, evaluatingRow.submissionId, {
        marks: marksNum,
        feedback: evalFeedback.trim() || undefined,
      })
      toast.success('Evaluation saved successfully!')
      setEvaluatingRow(null)
      loadSubmissions()
    } catch (err) {
      toast.error(err.message || 'Failed to save evaluation')
    } finally {
      setEvalSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
    </div>
  )

  if (!assignment) return <div className="text-center py-20 text-gray-400">Assignment not found</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0 mt-1">
          <ArrowLeft size={16} />
        </button>
        <div className="glass-card p-5 flex-1 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{assignment.title}</h1>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[assignment.status]}`}>{assignment.status}</span>
            </div>
            <p className="text-sm text-gray-500">{assignment.course?.title ?? '—'} · {assignment.batch?.name ?? '—'}</p>
          </div>
          <div className="flex gap-2">
            {assignment.status === 'DRAFT' && (
              <button onClick={handlePublish}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                <Send size={14} /> Publish
              </button>
            )}
            {assignment.status === 'SCHEDULED' && (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                <Clock size={14} /> Scheduled for {assignment.startDate}{assignment.publishTime ? ' at ' + format12HourTime(assignment.publishTime) : ''}
              </span>
            )}
            {assignment.status === 'PUBLISHED' && (
              <button onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors">
                <Lock size={14} /> Close
              </button>
            )}
            {assignment.status === 'CLOSED' && (
              <button onClick={() => setShowReopenModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                <Unlock size={14} /> Reopen
              </button>
            )}
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Details */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: 'Course', value: assignment.course?.title ?? '—' },
              { icon: Users, label: 'Batch', value: assignment.batch?.name ?? '—' },
              { icon: Calendar, label: 'End Date', value: formatAssignmentDueDate(assignment.dueDate, assignment.closeTime, assignment.closeTime ? 'dd MMM yyyy, h:mm a' : 'dd MMM yyyy') },
              { icon: Award, label: 'Total Marks', value: assignment.totalMarks },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{assignment.description}</p>
          </div>
          {((assignment.attachments && assignment.attachments.length > 0) || assignment.attachmentUrl) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Attachment{((assignment.attachments?.length || 1) > 1) ? 's' : ''} ({assignment.attachments?.length || 1})
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {(assignment.attachments?.length > 0 ? assignment.attachments : [{ fileUrl: assignment.attachmentUrl, fileName: assignment.attachmentName || 'Attachment' }]).map((att, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setViewingFile({ url: resolveFileUrl(att.fileUrl), name: att.fileName || `Attachment ${idx + 1}` })}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-2xs cursor-pointer"
                    title="Preview attachment in viewer"
                  >
                    <Paperclip size={14} className="text-purple-600 dark:text-purple-400" />
                    <span className="truncate max-w-[260px]">{att.fileName || `Attachment ${idx + 1}`}</span>
                    <Eye size={13} className="text-purple-600 dark:text-purple-400 ml-0.5" />
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-purple-200/60 dark:bg-purple-800/60 px-1.5 py-0.5 rounded">Preview</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submission stats */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Submissions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Total Students', value: subLoading ? '—' : stats.totalStudents, color: 'text-gray-700 dark:text-gray-300' },
              { label: 'Submitted', value: subLoading ? '—' : stats.submitted, color: 'text-green-600' },
              { label: 'Not Submitted', value: subLoading ? '—' : stats.notSubmitted, color: 'text-gray-500' },
              { label: 'Late Submissions', value: subLoading ? '—' : stats.late, color: 'text-amber-600' },
              { label: 'Evaluated', value: subLoading ? '—' : stats.evaluated, color: 'text-purple-600' },
              { label: 'Pending Evaluation', value: subLoading ? '—' : stats.pendingEvaluation, color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-3 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className={`text-xl font-extrabold font-display ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Management */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 dark:border-purple-900/30">
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Submission Management</h3>
        </div>

        {/* Filters */}
        <div className="px-5 py-4 border-b border-purple-100 dark:border-purple-900/30 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 flex-1 min-w-[220px]">
            <Search size={15} className="text-purple-400 flex-shrink-0" />
            <input
              placeholder="Search by name, email, or student ID..."
              className="bg-transparent text-sm outline-none w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <CustomSelect
            value={filters.status}
            onChange={(val) => updateFilter('status', val)}
            options={[
              { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
              { value: 'SUBMITTED', label: 'Submitted (On-time)' },
              { value: 'LATE', label: 'Late' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'PENDING', label: 'Not Submitted' },
            ]}
            placeholder="All Statuses"
            compact
          />
          <CustomSelect
            value={filters.evaluation}
            onChange={(val) => updateFilter('evaluation', val)}
            options={[
              { value: 'EVALUATED', label: 'Evaluated' },
              { value: 'PENDING', label: 'Pending Evaluation' },
            ]}
            placeholder="All Evaluations"
            compact
          />
          <input
            type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)}
            className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
            title="Submitted from"
          />
          <input
            type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)}
            className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
            title="Submitted to"
          />
          <button onClick={loadSubmissions} className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {subLoading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : subError ? (
          <div className="p-10 text-center text-gray-400">
            Failed to load submissions.
            <button onClick={loadSubmissions} className="block mx-auto mt-2 text-sm text-purple-600 font-semibold hover:underline">Try again</button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No students in this batch</div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No submissions match your filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['Student ID', 'Student', 'Status', 'Submitted', 'File', 'Description', 'Score', 'Feedback', 'Evaluation', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedSubmissions.map(row => (
                  <tr key={row.studentId} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{row.studentId}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 dark:text-white">{row.studentName}</p>
                      <p className="text-xs text-gray-400">{row.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROW_STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ROW_STATUS_LABELS[row.status] || row.status}
                      </span>
                      {row.status === 'REJECTED' && row.rejectionReason && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => setViewingTextModal({
                              title: 'Rejection Reason',
                              subtitle: `Submission from ${row.studentName}`,
                              content: row.rejectionReason,
                              icon: X,
                              tone: 'red',
                            })}
                            className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 hover:underline font-medium cursor-pointer"
                            title="Click to view rejection reason"
                          >
                            <Eye size={11} />
                            <span>View Reason</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {row.submittedAt ? format(new Date(row.submittedAt), 'dd MMM, HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const fileList = row.files && row.files.length > 0
                          ? row.files
                          : (row.fileUrl ? [{ fileUrl: row.fileUrl, fileName: row.fileName || 'Submitted File' }] : [])

                        if (fileList.length === 0) {
                          return <span className="text-gray-300 text-xs">—</span>
                        }
                        if (fileList.length === 1) {
                          const single = fileList[0]
                          return (
                            <button
                              type="button"
                              onClick={() => setViewingFile({ url: resolveFileUrl(single.fileUrl), name: single.fileName || 'Submitted File' })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-100 dark:border-purple-800/40 transition-colors max-w-[180px] cursor-pointer shadow-2xs"
                              title={single.fileName || 'Preview file'}
                            >
                              <Paperclip size={12} className="text-purple-500 flex-shrink-0" />
                              <span className="truncate">{single.fileName || 'File'}</span>
                              <Eye size={12} className="text-purple-500 flex-shrink-0 ml-0.5" />
                            </button>
                          )
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => setViewingFilesModal({ studentName: row.studentName, files: fileList })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800/60 shadow-2xs transition-colors cursor-pointer"
                            title="Click to view all submitted files"
                          >
                            <Paperclip size={12} className="text-purple-600 dark:text-purple-400" />
                            <span>{fileList.length} Files</span>
                            <Eye size={12} className="text-purple-500 ml-0.5" />
                          </button>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.notes ? (
                        <button
                          type="button"
                          onClick={() => setViewingTextModal({
                            title: 'Student Description / Notes',
                            subtitle: `Submitted by ${row.studentName}`,
                            content: row.notes,
                            icon: MessageSquare,
                            tone: 'purple',
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-purple-950/40 text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium border border-gray-200 dark:border-gray-700 hover:border-purple-200 transition-colors max-w-[160px] group cursor-pointer shadow-2xs"
                          title="Click to view full note"
                        >
                          <MessageSquare size={12} className="text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                          <span className="truncate italic">"{row.notes}"</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.marks != null ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEvaluate(row)}
                          className="inline-flex items-center gap-1 font-bold text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60 shadow-2xs hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
                          title="Click to view or edit grade"
                        >
                          <Award size={12} className="text-purple-600 dark:text-purple-400" />
                          {row.marks} / {assignment?.totalMarks || 100}
                        </button>
                      ) : (row.status === 'SUBMITTED' || row.status === 'LATE' || row.status === 'PENDING_APPROVAL') ? (
                        <span className="text-gray-400 text-xs font-medium italic">Pending</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.feedback ? (
                        <button
                          type="button"
                          onClick={() => setViewingTextModal({
                            title: 'Trainer Feedback',
                            subtitle: `Feedback for ${row.studentName}`,
                            content: row.feedback,
                            icon: FileText,
                            tone: 'blue',
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium border border-gray-200 dark:border-gray-700 hover:border-blue-200 transition-colors max-w-[160px] group cursor-pointer shadow-2xs"
                          title="Click to view full feedback"
                        >
                          <FileText size={12} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                          <span className="truncate italic">"{row.feedback}"</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEvaluated(row) ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEvaluate(row)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800/40 hover:bg-green-200 transition-colors cursor-pointer"
                          title="Click to view evaluation"
                        >
                          <CheckCircle2 size={12} /> Evaluated
                        </button>
                      ) : (row.status === 'SUBMITTED' || row.status === 'LATE') ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEvaluate(row)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-200 transition-colors cursor-pointer"
                          title="Click to evaluate submission"
                        >
                          <Check size={12} /> Approved
                        </button>
                      ) : row.status === 'PENDING_APPROVAL' ? (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                          Needs Review
                        </span>
                      ) : row.status === 'REJECTED' ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/40">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleApprove(row)}
                            disabled={actionLoading[row.submissionId]}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                            title="Approve submission"
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectTarget(row); setRejectReason('') }}
                            disabled={actionLoading[row.submissionId]}
                            className="inline-flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold px-2 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                            title="Reject submission"
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (row.status === 'SUBMITTED' || row.status === 'LATE') ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {!isEvaluated(row) ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEvaluate(row)}
                              className="inline-flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs hover:shadow transition-all"
                              title="Evaluate and enter score & feedback"
                            >
                              <Award size={13} />
                              <span>Evaluate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEvaluate(row)}
                              className="inline-flex items-center gap-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                              title="Update score & feedback"
                            >
                              <Award size={13} />
                              <span>Update Grade</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!subLoading && !subError && filteredSubmissions.length > SUBMISSIONS_PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-purple-100 dark:border-purple-900/30">
            <p className="text-xs text-gray-500">
              Showing {(validSubmissionPage - 1) * SUBMISSIONS_PAGE_SIZE + 1}–{Math.min(validSubmissionPage * SUBMISSIONS_PAGE_SIZE, filteredSubmissions.length)} of {filteredSubmissions.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={validSubmissionPage === 1}
                className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 transition-colors">
                ← Prev
              </button>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{validSubmissionPage} / {totalSubmissionPages}</span>
              <button onClick={() => setPage(p => Math.min(totalSubmissionPages, p + 1))} disabled={validSubmissionPage === totalSubmissionPages}
                className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Reject Submission</h3>
              <p className="text-xs text-gray-500 mt-1">
                Reject submission from <strong className="text-gray-700 dark:text-gray-300">{rejectTarget.studentName}</strong>. The student will be notified and allowed to resubmit.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Rejection Reason / Feedback (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete solution, file corrupted, or incorrect format. Please fix and resubmit."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading[rejectTarget.submissionId]}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60"
              >
                {actionLoading[rejectTarget.submissionId] ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluate / Grade Modal */}
      {evaluatingRow && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Award className="text-purple-600" size={18} />
                  <span>{isEvaluated(evaluatingRow) ? 'Update Evaluation' : 'Evaluate Submission'}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Student: <strong className="text-gray-700 dark:text-gray-300">{evaluatingRow.studentName}</strong> ({evaluatingRow.studentEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingRow(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Student Submission Info */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Assignment: <strong className="text-gray-800 dark:text-white">{assignment?.title}</strong></span>
                <span>Max Marks: <strong className="text-purple-700 dark:text-purple-300">{assignment?.totalMarks}</strong></span>
              </div>
              {evaluatingRow.submittedAt && (
                <p className="text-gray-500">Submitted: {format(new Date(evaluatingRow.submittedAt), 'dd MMM yyyy, HH:mm')}</p>
              )}
              {/* Submitted files preview */}
              <div>
                <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">Submitted Files:</p>
                {evaluatingRow.files && evaluatingRow.files.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {evaluatingRow.files.map((f, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setViewingFile({ url: resolveFileUrl(f.fileUrl), name: f.fileName || `File ${idx + 1}` })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 font-medium hover:underline"
                      >
                        <Paperclip size={12} />
                        <span className="truncate max-w-[160px]">{f.fileName || `File ${idx + 1}`}</span>
                        <Eye size={12} />
                      </button>
                    ))}
                  </div>
                ) : evaluatingRow.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => setViewingFile({ url: resolveFileUrl(evaluatingRow.fileUrl), name: evaluatingRow.fileName || 'File' })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 font-medium hover:underline"
                  >
                    <Paperclip size={12} />
                    <span className="truncate max-w-[160px]">{evaluatingRow.fileName || 'File'}</span>
                    <Eye size={12} />
                  </button>
                ) : (
                  <span className="text-gray-400">No files</span>
                )}
              </div>

              {/* Student's Description / Notes */}
              {evaluatingRow.notes && (
                <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/40">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Student Description / Notes:</p>
                  <p className="text-gray-600 dark:text-gray-400 italic whitespace-pre-wrap bg-white dark:bg-gray-800/80 p-2 rounded-lg border border-purple-100 dark:border-purple-900/30">
                    "{evaluatingRow.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEvaluation} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Marks / Score (out of {assignment?.totalMarks || 100}) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={evalMarks}
                  placeholder={`Enter score 0 - ${assignment?.totalMarks || 100}`}
                  onKeyDown={e => {
                    // Disallow scientific notation ('e', 'E'), negative sign ('-'), plus ('+'), and decimals ('.')
                    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onPaste={e => {
                    e.preventDefault()
                    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
                    if (pasted) {
                      if (evalErrors.marks) setEvalErrors(prev => ({ ...prev, marks: undefined }))
                      const max = assignment?.totalMarks || 100
                      const num = Number(pasted)
                      if (num > max) {
                        setEvalMarks(String(max))
                        setEvalErrors({ marks: `Marks cannot exceed total marks (${max})` })
                      } else {
                        setEvalMarks(pasted)
                      }
                    }
                  }}
                  onChange={e => {
                    if (evalErrors.marks) setEvalErrors(prev => ({ ...prev, marks: undefined }))
                    const clean = e.target.value.replace(/[^0-9]/g, '')
                    if (clean === '') {
                      setEvalMarks('')
                      return
                    }
                    const max = assignment?.totalMarks || 100
                    const num = Number(clean)
                    if (num > max) {
                      setEvalMarks(String(max))
                      setEvalErrors({ marks: `Marks cannot exceed total marks (${max})` })
                    } else {
                      setEvalMarks(clean)
                    }
                  }}
                  className={`w-full rounded-xl border p-2.5 text-xs outline-none focus:ring-2 font-semibold text-gray-800 dark:text-white transition-colors ${
                    evalErrors.marks
                      ? 'border-red-400 focus:ring-red-400 bg-red-50/20 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-purple-500'
                  }`}
                />
                {evalErrors.marks && (
                  <p className="text-xs text-red-500 font-medium mt-1">{evalErrors.marks}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Trainer Feedback (Optional)
                </label>
                <textarea
                  value={evalFeedback}
                  onChange={e => setEvalFeedback(e.target.value)}
                  placeholder="Provide feedback on the submission, strengths, improvements..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEvaluatingRow(null)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evalSaving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} />
                  <span>{evalSaving ? 'Saving...' : 'Save Evaluation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingFile && (
        <ViewAttachmentModal
          url={viewingFile.url}
          name={viewingFile.name}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* Submitted Files Modal */}
      {viewingFilesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Files size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Submitted Files</h3>
                  <p className="text-xs text-gray-500">
                    Student: <strong className="text-gray-700 dark:text-gray-300">{viewingFilesModal.studentName}</strong> ({viewingFilesModal.files.length} file{viewingFilesModal.files.length !== 1 ? 's' : ''})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingFilesModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {viewingFilesModal.files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 break-all">{file.fileName || `File ${idx + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewingFile({ url: resolveFileUrl(file.fileUrl), name: file.fileName || `File ${idx + 1}` })}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer"
                      title="Preview file"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setViewingFilesModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text View Modal (Notes / Feedback / Rejection Reason) */}
      {viewingTextModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  viewingTextModal.tone === 'blue'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : viewingTextModal.tone === 'red'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                }`}>
                  {viewingTextModal.icon ? <viewingTextModal.icon size={16} /> : <MessageSquare size={16} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{viewingTextModal.title}</h3>
                  {viewingTextModal.subtitle && (
                    <p className="text-xs text-gray-500">{viewingTextModal.subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTextModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {viewingTextModal.content}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setViewingTextModal(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (matches Image 3) */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Assignment?"
        itemName={assignment?.title}
        loading={deleting}
      />

      {/* Close Confirmation Modal (matches Image 3 style) */}
      <ConfirmModal
        isOpen={showCloseModal}
        onClose={() => !closing && setShowCloseModal(false)}
        onConfirm={handleConfirmClose}
        title="Close Assignment?"
        tone="warning"
        icon={Lock}
        confirmLabel="Close Assignment"
        loading={closing}
        loadingText="Closing..."
        message={
          <>
            Are you sure you want to close{' '}
            <strong className="text-slate-800 dark:text-gray-200 font-semibold">"{assignment?.title}"</strong>?
            Students will no longer be able to submit.
          </>
        }
      />

      {/* Reopen Confirmation Modal (matches Image 3 style) */}
      <ConfirmModal
        isOpen={showReopenModal}
        onClose={() => !reopening && setShowReopenModal(false)}
        onConfirm={handleConfirmReopen}
        title="Reopen Assignment?"
        tone="success"
        icon={Unlock}
        confirmLabel="Reopen"
        loading={reopening}
        loadingText="Reopening..."
        message={
          <>
            Are you sure you want to reopen{' '}
            <strong className="text-slate-800 dark:text-gray-200 font-semibold">"{assignment?.title}"</strong>?
            Students will be able to submit again.
          </>
        }
      />
    </div>
  )
}
