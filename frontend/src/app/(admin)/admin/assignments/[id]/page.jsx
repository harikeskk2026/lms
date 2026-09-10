'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BookOpen, Users, Calendar, Award, Paperclip, Eye,
  Send, Lock, Unlock, Trash2, CheckCircle2, Search, RefreshCw, Check, X,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatAssignmentDueDate } from '@/utils/assignmentDate'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import submissionService from '@/services/submissionService'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'
import { resolveFileUrl } from '@/lib/api'

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
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
  const [actionLoading, setActionLoading] = useState({})
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [filters, setFilters] = useState(EMPTY_SUBMISSION_FILTERS)
  const [page, setPage] = useState(1)
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
        setSubmissions(r.data.submissions)
      })
      .catch(err => { toast.error(err.message || 'Failed to load submissions'); setSubError(true) })
      .finally(() => setSubLoading(false))
  }

  useEffect(() => { loadAssignment(); loadSubmissions() }, [id])

  // Summary cards always reflect every student in the batch, independent of the
  // filters/search applied to the table below.
  const stats = useMemo(() => ({
    totalStudents: submissions.length,
    submitted: submissions.filter(s => s.status === 'SUBMITTED').length,
    notSubmitted: submissions.filter(s => s.status === 'PENDING').length,
    late: submissions.filter(s => s.status === 'LATE').length,
    evaluated: submissions.filter(s => s.reviewed).length,
    pendingEvaluation: submissions.filter(s => s.submissionId && !s.reviewed).length,
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
      if (filters.evaluation === 'EVALUATED' && !row.reviewed) return false
      if (filters.evaluation === 'PENDING' && (!row.submissionId || row.reviewed)) return false
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

  const handleClose = async () => {
    if (!confirm('Close this assignment? Students will no longer be able to submit.')) return
    try { await assignmentService.close(id); toast.success('Assignment closed'); loadAssignment() }
    catch (err) { toast.error(err.message || 'Failed to close') }
  }

  const handleReopen = async () => {
    if (!confirm('Reopen this assignment? Students will be able to submit again.')) return
    try { await assignmentService.reopen(id); toast.success('Assignment reopened'); loadAssignment() }
    catch (err) { toast.error(err.message || 'Failed to reopen') }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return
    try {
      await assignmentService.remove(id)
      toast.success('Assignment deleted')
      router.push('/admin/assignments')
    } catch (err) { toast.error(err.message || 'Failed to delete') }
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
            <p className="text-sm text-gray-500">{assignment.course.title} · {assignment.batch.name}</p>
          </div>
          <div className="flex gap-2">
            {assignment.status === 'DRAFT' && (
              <button onClick={handlePublish}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                <Send size={14} /> Publish
              </button>
            )}
            {assignment.status === 'PUBLISHED' && (
              <button onClick={handleClose}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors">
                <Lock size={14} /> Close
              </button>
            )}
            {assignment.status === 'CLOSED' && (
              <button onClick={handleReopen}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                <Unlock size={14} /> Reopen
              </button>
            )}
            <button onClick={handleDelete}
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
              { icon: BookOpen, label: 'Course', value: assignment.course.title },
              { icon: Users, label: 'Batch', value: assignment.batch.name },
              { icon: Calendar, label: 'Due Date', value: formatAssignmentDueDate(assignment.dueDate, assignment.closeTime, assignment.closeTime ? 'dd MMM yyyy, h:mm a' : 'dd MMM yyyy') },
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
          {assignment.attachmentUrl && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Attachment</h3>
              <button
                type="button"
                onClick={() => setViewingFile({ url: resolveFileUrl(assignment.attachmentUrl), name: assignment.attachmentName || 'Attachment' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/40 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-2xs"
                title="Preview attachment"
              >
                <Paperclip size={13} className="text-purple-500" />
                <span className="truncate max-w-[260px]">{assignment.attachmentName || 'Attachment'}</span>
                <Eye size={13} className="text-purple-500 ml-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* Submission stats */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Submissions</h3>
          <div className="grid grid-cols-2 gap-3">
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
          <select
            className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
            value={filters.status} onChange={e => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SUBMITTED">Submitted (On-time)</option>
            <option value="LATE">Late</option>
            <option value="REJECTED">Rejected</option>
            <option value="PENDING">Not Submitted</option>
          </select>
          <select
            className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
            value={filters.evaluation} onChange={e => updateFilter('evaluation', e.target.value)}
          >
            <option value="">All Evaluations</option>
            <option value="EVALUATED">Evaluated</option>
            <option value="PENDING">Pending Evaluation</option>
          </select>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['Student ID', 'Student', 'Status', 'Submitted', 'File', 'Score', 'Feedback', 'Evaluation', 'Actions'].map(h => (
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
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROW_STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ROW_STATUS_LABELS[row.status] || row.status}
                      </span>
                      {row.status === 'REJECTED' && row.rejectionReason && (
                        <p className="text-[10px] text-red-500 italic mt-1 max-w-[160px] truncate" title={row.rejectionReason}>
                          Reason: {row.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {row.submittedAt ? format(new Date(row.submittedAt), 'dd MMM, HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.files && row.files.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {row.files.map((f, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setViewingFile({ url: resolveFileUrl(f.fileUrl), name: f.fileName || `File ${idx + 1}` })}
                              className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 hover:underline font-semibold whitespace-nowrap"
                              title="Preview file"
                            >
                              <Paperclip size={12} className="text-purple-500" />
                              <span className="truncate max-w-[160px]">{f.fileName || `File ${idx + 1}`}</span>
                              <Eye size={12} className="text-purple-500 flex-shrink-0 ml-0.5" />
                            </button>
                          ))}
                        </div>
                      ) : row.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingFile({ url: resolveFileUrl(row.fileUrl), name: row.fileName || 'File' })}
                          className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 hover:underline font-semibold whitespace-nowrap"
                          title="Preview file"
                        >
                          <Paperclip size={12} className="text-purple-500" />
                          <span className="truncate max-w-[160px]">{row.fileName || 'File'}</span>
                          <Eye size={12} className="text-purple-500 flex-shrink-0 ml-0.5" />
                        </button>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.marks != null ? (
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60 shadow-2xs">
                          <Award size={12} className="text-purple-600 dark:text-purple-400" />
                          {row.marks} / {assignment.totalMarks}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.feedback ? (
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic max-w-[180px] truncate" title={row.feedback}>
                          "{row.feedback}"
                        </p>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.reviewed || row.marks != null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800/40">
                          <CheckCircle2 size={12} /> Evaluated
                        </span>
                      ) : row.status === 'PENDING_APPROVAL' ? (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                          Needs Review
                        </span>
                      ) : row.status === 'SUBMITTED' || row.status === 'LATE' ? (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          Pending
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
