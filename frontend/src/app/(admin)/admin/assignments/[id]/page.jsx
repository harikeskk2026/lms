'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BookOpen, Users, Calendar, Award, Paperclip, Download,
  Send, Lock, Trash2, CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import submissionService from '@/services/submissionService'

const STATUS_COLORS = {
  DRAFT:     'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  CLOSED:    'bg-red-100 text-red-700',
}

const ROW_STATUS_COLORS = {
  PENDING:   'bg-gray-100 text-gray-500',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  LATE:      'bg-amber-100 text-amber-700',
}

export default function AssignmentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState(true)
  const [gradeInputs, setGradeInputs] = useState({})
  const [feedbackInputs, setFeedbackInputs] = useState({})
  const [saving, setSaving] = useState({})

  const loadAssignment = () => {
    setLoading(true)
    assignmentService.get(id)
      .then(r => setAssignment(r.data))
      .catch(err => toast.error(err.message || 'Failed to load assignment'))
      .finally(() => setLoading(false))
  }

  const loadSubmissions = () => {
    setSubLoading(true)
    submissionService.list(id)
      .then(r => {
        setSubmissions(r.data.submissions)
        setSummary(r.data.summary)
        const grades = {}, feedbacks = {}
        r.data.submissions.forEach(s => {
          if (s.submissionId) {
            grades[s.submissionId] = s.marks ?? ''
            feedbacks[s.submissionId] = s.feedback ?? ''
          }
        })
        setGradeInputs(grades)
        setFeedbackInputs(feedbacks)
      })
      .catch(err => toast.error(err.message || 'Failed to load submissions'))
      .finally(() => setSubLoading(false))
  }

  useEffect(() => { loadAssignment(); loadSubmissions() }, [id])

  const handlePublish = async () => {
    try { await assignmentService.publish(id); toast.success('Assignment published'); loadAssignment() }
    catch (err) { toast.error(err.message || 'Failed to publish') }
  }

  const handleClose = async () => {
    if (!confirm('Close this assignment? Students will no longer be able to submit.')) return
    try { await assignmentService.close(id); toast.success('Assignment closed'); loadAssignment() }
    catch (err) { toast.error(err.message || 'Failed to close') }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return
    try {
      await assignmentService.remove(id)
      toast.success('Assignment deleted')
      router.push('/admin/assignments')
    } catch (err) { toast.error(err.message || 'Failed to delete') }
  }

  const handleGrade = async (row) => {
    const marks = gradeInputs[row.submissionId]
    if (marks === '' || marks === undefined) return toast.error('Enter marks')
    setSaving(s => ({ ...s, [row.submissionId]: true }))
    try {
      await submissionService.grade(id, row.submissionId, {
        marks: Number(marks),
        feedback: feedbackInputs[row.submissionId] || '',
        reviewed: true,
      })
      toast.success('Submission graded')
      loadSubmissions()
    } catch (err) { toast.error(err.message || 'Failed to grade') }
    finally { setSaving(s => ({ ...s, [row.submissionId]: false })) }
  }

  const handleMarkReviewed = async (row) => {
    try {
      await submissionService.grade(id, row.submissionId, { reviewed: !row.reviewed })
      loadSubmissions()
    } catch (err) { toast.error(err.message || 'Failed to update') }
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
    </div>
  )

  if (!assignment) return <div className="text-center py-20 text-gray-400">Assignment not found</div>

  return (
    <div className="max-w-6xl mx-auto space-y-5">
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
              { icon: Users,    label: 'Batch',  value: assignment.batch.name },
              { icon: Calendar, label: 'Due Date', value: format(new Date(assignment.dueDate), 'dd MMM yyyy') },
              { icon: Award,    label: 'Total Marks', value: assignment.totalMarks },
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
              <a href={assignment.attachmentUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline font-semibold">
                <Paperclip size={14} /> {assignment.attachmentName || 'Download attachment'} <Download size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Submission stats */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Submissions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Students', value: summary?.totalStudents ?? '—', color: 'text-gray-700 dark:text-gray-300' },
              { label: 'Submitted',      value: summary?.submitted ?? '—',     color: 'text-green-600' },
              { label: 'Pending',        value: summary?.pending ?? '—',       color: 'text-gray-500' },
              { label: 'Late',           value: summary?.late ?? '—',          color: 'text-amber-600' },
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
        {subLoading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : submissions.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No students in this batch</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['Student', 'Status', 'Submitted', 'File', 'Marks', 'Feedback', 'Reviewed', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(row => (
                  <tr key={row.studentId} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 dark:text-white">{row.studentName}</p>
                      <p className="text-xs text-gray-400">{row.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROW_STATUS_COLORS[row.status]}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {row.submittedAt ? format(new Date(row.submittedAt), 'dd MMM, HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.fileUrl ? (
                        <a href={row.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-purple-600 hover:underline font-semibold whitespace-nowrap">
                          <Download size={12} /> {row.fileName || 'File'}
                        </a>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.submissionId ? (
                        <input
                          type="number" min="0" max={assignment.totalMarks}
                          value={gradeInputs[row.submissionId] ?? ''}
                          onChange={e => setGradeInputs(prev => ({ ...prev, [row.submissionId]: e.target.value }))}
                          placeholder={`/ ${assignment.totalMarks}`}
                          className="w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.submissionId ? (
                        <input
                          type="text"
                          value={feedbackInputs[row.submissionId] ?? ''}
                          onChange={e => setFeedbackInputs(prev => ({ ...prev, [row.submissionId]: e.target.value }))}
                          placeholder="Optional feedback"
                          className="w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.submissionId ? (
                        <button onClick={() => handleMarkReviewed(row)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${row.reviewed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          title={row.reviewed ? 'Reviewed' : 'Mark as reviewed'}>
                          <CheckCircle2 size={14} />
                        </button>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.submissionId && (
                        <button onClick={() => handleGrade(row)} disabled={saving[row.submissionId]}
                          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60 whitespace-nowrap">
                          {saving[row.submissionId] ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
