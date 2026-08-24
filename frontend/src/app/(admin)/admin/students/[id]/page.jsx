'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Linkedin, Github, RefreshCw,
  CheckCircle, XCircle, Clock, Award, Brain, Briefcase, Activity
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'

const TABS = ['Overview', 'Attendance', 'Assignments', 'Quizzes', 'Placement', 'Activity']

const PLACEMENT_COLORS = {
  SEEKING: 'bg-blue-100 text-blue-700',
  INTERVIEWING: 'bg-yellow-100 text-yellow-700',
  PLACED: 'bg-green-100 text-green-700',
  NOT_SEEKING: 'bg-gray-100 text-gray-600',
}

const STATUS_COLORS = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT:  'bg-red-100 text-red-700',
  LATE:    'bg-yellow-100 text-yellow-700',
  EXCUSED: 'bg-blue-100 text-blue-700',
}

export default function StudentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [gradeInputs, setGradeInputs] = useState({})
  const [feedbackInputs, setFeedbackInputs] = useState({})

  const load = () => {
    setLoading(true)
    adminApi.getStudentDetail(id)
      .then(r => setStudent(r.data.data))
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleGrade = async (subId, assignmentId) => {
    const grade = gradeInputs[subId]
    const feedback = feedbackInputs[subId] || ''
    if (!grade) return toast.error('Enter a grade')
    try {
      await adminApi.gradeSubmission(assignmentId, subId, { grade: parseInt(grade), feedback })
      toast.success('Graded successfully')
      load()
    } catch { toast.error('Failed to grade') }
  }

  const handlePlacementUpdate = async (status) => {
    try {
      await adminApi.updatePlacementStatus(id, status)
      toast.success('Placement status updated')
      load()
    } catch { toast.error('Failed to update') }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
    </div>
  )

  if (!student) return <div className="text-center py-20 text-gray-400">Student not found</div>

  const sp = student.studentProfile
  const att = student.attendanceSummary || {}
  const enrollment = sp?.enrollments?.[0]

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0 mt-1">
          <ArrowLeft size={16} />
        </button>
        <div className="glass-card p-5 flex-1 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl font-display">
              {student.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{student.name}</h1>
              <p className="text-sm text-gray-500">{sp?.enrollmentNo || '—'} · {student.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
                {sp?.placementStatus && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[sp.placementStatus]}`}>
                    {sp.placementStatus.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const pw = Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@!'[Math.floor(Math.random() * 64)]).join('')
              if (confirm(`Reset password to: ${pw}`)) {
                adminApi.resetStudentPassword(id, { newPassword: pw }).then(() => toast.success('Password reset')).catch(() => toast.error('Failed'))
              }
            }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} /> Reset PW
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Personal Info</h3>
            {[
              { icon: User,    label: 'Name',          value: student.name },
              { icon: Mail,    label: 'Email',         value: student.email },
              { icon: Phone,   label: 'Phone',         value: student.phone || '—' },
              { icon: MapPin,  label: 'Address',       value: sp?.address || '—' },
              { icon: Award,   label: 'Qualification', value: sp?.qualification || '—' },
              { icon: Linkedin,label: 'LinkedIn',      value: sp?.linkedinUrl || '—' },
              { icon: Github,  label: 'GitHub',        value: sp?.githubUrl || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
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
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Current Batch</h3>
              {enrollment ? (
                <div className="space-y-2">
                  <p className="font-semibold text-gray-800 dark:text-white">{enrollment.batch?.name}</p>
                  <p className="text-sm text-gray-500">{enrollment.batch?.course?.title}</p>
                  <p className="text-xs text-gray-400">{enrollment.batch?.timing} · {enrollment.batch?.mode}</p>
                </div>
              ) : <p className="text-sm text-gray-400">Not enrolled in any batch</p>}
            </div>
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Quick Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-purple-600 font-display">{att.percentage || 0}%</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-blue-600 font-display">{(sp?.submissions || []).filter(s => s.grade === null).length || 0}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-green-600 font-display">{(sp?.quizAttempts || []).length || 0}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Quizzes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Attendance' && (
        <div className="glass-card p-6">
          <div className="flex gap-4 mb-6 flex-wrap">
            {[
              { label: 'Present', value: att.present || 0, color: 'text-green-600' },
              { label: 'Absent',  value: att.absent  || 0, color: 'text-red-500' },
              { label: 'Late',    value: att.late    || 0, color: 'text-yellow-600' },
              { label: 'Total',   value: att.total   || 0, color: 'text-gray-600' },
              { label: 'Pct',     value: `${att.percentage || 0}%`, color: 'text-purple-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className={`text-xl font-extrabold font-display ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(sp?.attendances || []).length === 0 ? (
              <p className="text-center text-gray-400 py-8">No attendance records</p>
            ) : (
              (sp?.attendances || []).slice().reverse().map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {a.class?.title || 'Class'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.class?.date ? format(new Date(a.class.date), 'dd MMM yyyy, HH:mm') : '—'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'Assignments' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Assignment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {(sp?.submissions || []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No submissions</td></tr>
                ) : (
                  (sp?.submissions || []).map(sub => (
                    <tr key={sub.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{sub.assignment?.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sub.assignment?.dueDate ? format(new Date(sub.assignment.dueDate), 'dd MMM') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.status === 'GRADED' ? 'bg-green-100 text-green-700' : sub.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sub.grade !== null ? (
                          <span className="text-sm font-bold text-green-600">{sub.grade}/{sub.assignment?.maxMarks}</span>
                        ) : (
                          <div className="flex gap-1">
                            <input
                              type="number" min="0" max={sub.assignment?.maxMarks || 100}
                              value={gradeInputs[sub.id] || ''}
                              onChange={e => setGradeInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                              placeholder="Grade"
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sub.grade === null && (
                          <button onClick={() => handleGrade(sub.id, sub.assignmentId)}
                            className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded-lg hover:bg-purple-700 transition-colors">
                            Grade
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Quizzes' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100">
                  {['Quiz', 'Attempted On', 'Score', 'Result', 'Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sp?.quizAttempts || []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No quiz attempts</td></tr>
                ) : (
                  (sp?.quizAttempts || []).map(a => {
                    const pct = Math.round((a.score / a.totalMarks) * 100)
                    return (
                      <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{a.quiz?.title}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.submittedAt ? format(new Date(a.submittedAt), 'dd MMM yyyy') : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f97316' }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">{a.score}/{a.totalMarks}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {a.passed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.timeTaken ? `${a.timeTaken}s` : '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Placement' && (
        <div className="space-y-5">
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Placement Status</h3>
            <div className="flex flex-wrap gap-2">
              {['SEEKING', 'INTERVIEWING', 'PLACED', 'NOT_SEEKING'].map(s => (
                <button key={s} onClick={() => handlePlacementUpdate(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${sp?.placementStatus === s ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Mock Interviews</h3>
            {(sp?.mockInterviews || []).length === 0 ? (
              <p className="text-sm text-gray-400">No mock interviews scheduled</p>
            ) : (
              <div className="space-y-3">
                {(sp?.mockInterviews || []).map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800/50">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.interviewerName || 'Interview'}</p>
                      <p className="text-xs text-gray-400">{format(new Date(m.scheduledAt), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.rating && <span className="text-sm font-bold text-yellow-500">{'★'.repeat(m.rating)}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : m.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Placement Timeline</h3>
            {(sp?.placementUpdates || []).length === 0 ? (
              <p className="text-sm text-gray-400">No updates yet</p>
            ) : (
              <div className="space-y-3">
                {(sp?.placementUpdates || []).map(u => (
                  <div key={u.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{u.title}</p>
                      <p className="text-xs text-gray-500">{u.body}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(u.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Activity' && (
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Recent Notifications</h3>
          {(student.notifications || []).length === 0 ? (
            <p className="text-sm text-gray-400">No notifications</p>
          ) : (
            <div className="space-y-3">
              {student.notifications.map(n => (
                <div key={n.id} className="flex gap-3 py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-purple-500'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
