'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Plus, ChevronDown, ChevronUp, Star, Trash2, Calendar, Building2, MapPin, Users, CheckCircle, X } from 'lucide-react'
import { format, differenceInDays, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import SlidePanel from '@/components/admin/SlidePanel'
import EligibilityCriteriaFields from '@/components/admin/EligibilityCriteriaFields'
import DateTimePicker12h from '@/components/ui/DateTimePicker12h'

const EMPTY_DRIVE_FORM = {
  companyName: '', role: '', packageOffered: '', location: '', driveDate: '', applyDeadline: '',
  description: '', requirements: '', skills: '', driveType: 'CAMPUS', status: 'UPCOMING', applyLink: '',
  minCgpa: null, minPercentage: null, maxBacklogs: null,
  eligibleBatchIds: [], eligibleCourseIds: [],
}

const TABS = ['Students', 'Mock Interviews', 'Interview Questions', 'Company Drives']
const PLACEMENT_COLORS = { SEEKING: 'bg-blue-100 text-blue-700', INTERVIEWING: 'bg-yellow-100 text-yellow-700', PLACED: 'bg-green-100 text-green-700', NOT_SEEKING: 'bg-gray-100 text-gray-500' }
const DIFF_COLORS = { EASY: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HARD: 'bg-red-100 text-red-700' }
const IQ_CATEGORIES = ['All', 'Python', 'Java', 'DSA', 'HR', 'System Design', 'SQL', 'React', 'Node.js']

export default function PlacementPage() {
  const [tab, setTab] = useState('Students')
  const [overview, setOverview] = useState(null)
  const [mocks, setMocks] = useState([])
  const [iqList, setIqList] = useState([])
  const [drives, setDrives] = useState([])
  const [driveApplications, setDriveApplications] = useState({})
  const [viewingApps, setViewingApps] = useState(null)
  const [drivePanel, setDrivePanel] = useState(false)
  const [driveForm, setDriveForm] = useState(EMPTY_DRIVE_FORM)
  const [loading, setLoading] = useState(true)
  const [iqCategory, setIqCategory] = useState('All')
  const [iqDiff, setIqDiff] = useState('')
  const [iqSearch, setIqSearch] = useState('')
  const [expandedAnswers, setExpandedAnswers] = useState({})
  const [mockPanel, setMockPanel] = useState(false)
  const [iqPanel, setIqPanel] = useState(false)
  const [feedbackPanel, setFeedbackPanel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mockForm, setMockForm] = useState({ studentId: '', scheduledAt: '', interviewerName: '', meetLink: '' })
  const [iqForm, setIqForm] = useState({ category: '', question: '', answer: '', difficulty: 'MEDIUM', tags: '' })
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', rating: 5, status: 'COMPLETED', strengths: '', improvements: '' })
  const [editIq, setEditIq] = useState(null)

  // Each section loads independently - one tab's backend not being ready yet
  // (rolled out phase by phase) must never blank out an already-working tab.
  const loadData = () => {
    setLoading(true)
    Promise.allSettled([
      adminApi.getPlacement().catch(() => adminApi.getStudents()),
      adminApi.getMockInterviews(),
      adminApi.getInterviewQuestions({ category: iqCategory === 'All' ? '' : iqCategory, difficulty: iqDiff, search: iqSearch }),
      adminApi.getDrives(),
    ]).then(([p, m, iq, d]) => {
      if (p.status === 'fulfilled') {
        const rawData = p.value.data?.data || p.value.data
        const studentList = rawData?.students || rawData?.items || (Array.isArray(rawData) ? rawData : [])

        const statusCounts = rawData?.statusCounts || {
          SEEKING: studentList.filter(s => (s.placementStatus || 'SEEKING') === 'SEEKING').length,
          INTERVIEWING: studentList.filter(s => s.placementStatus === 'INTERVIEWING').length,
          PLACED: studentList.filter(s => s.placementStatus === 'PLACED').length,
          NOT_SEEKING: studentList.filter(s => s.placementStatus === 'NOT_SEEKING').length,
        }
        const total = studentList.length
        const placed = statusCounts.PLACED || 0
        const conversionRate = rawData?.conversionRate ?? (total > 0 ? Math.round((placed / total) * 100) : 0)

        setOverview({
          statusCounts,
          conversionRate,
          students: studentList.map(s => ({
            id: s.id,
            name: s.name || s.user?.name || `Student #${s.id}`,
            email: s.email || s.user?.email || '',
            phone: s.phone || '',
            placementStatus: s.placementStatus || 'SEEKING',
            mockCount: s.mockCount || 0,
            avgMockRating: s.avgMockRating || 0,
            updatedAt: s.updatedAt || ''
          }))
        })
      }

      if (m.status === 'fulfilled') setMocks(m.value.data.data || [])
      else setMocks([])

      if (iq.status === 'fulfilled') setIqList(Array.isArray(iq.value.data.data) ? iq.value.data.data : iq.value.data.data?.items || [])

      if (d.status === 'fulfilled') setDrives(d.value.data.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    adminApi.getInterviewQuestions({ category: iqCategory === 'All' ? '' : iqCategory, difficulty: iqDiff, search: iqSearch })
      .then(res => setIqList(res.data.data?.items || res.data.data || []))
      .catch(() => { })
  }, [iqCategory, iqDiff, iqSearch])

  const handlePlacementStatus = async (studentId, status) => {
    try {
      await adminApi.updatePlacementStatus(studentId, status)
      toast.success('Status updated')
      loadData()
    } catch { toast.error('Failed') }
  }

  const handleScheduleMock = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.scheduleMockInterview(mockForm)
      toast.success('Mock interview scheduled')
      setMockPanel(false)
      setMockForm({ studentId: '', scheduledAt: '', interviewerName: '', meetLink: '' })
      loadData()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const handleFeedback = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.updateMockInterview(feedbackPanel, {
        ...feedbackForm,
        strengths: feedbackForm.strengths.split(',').map(s => s.trim()).filter(Boolean),
        improvements: feedbackForm.improvements.split(',').map(s => s.trim()).filter(Boolean),
      })
      toast.success('Feedback saved')
      setFeedbackPanel(null)
      loadData()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const handleSaveIq = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const data = {
        ...iqForm,
        questionText: iqForm.questionText || iqForm.question,
        answerText: iqForm.answerText || iqForm.answer,
        tags: typeof iqForm.tags === 'string' ? iqForm.tags.split(',').map(t => t.trim()).filter(Boolean) : (iqForm.tags || [])
      }
      if (editIq) await adminApi.updateInterviewQuestion(editIq, data)
      else await adminApi.createInterviewQuestion(data)
      toast.success(editIq ? 'Updated' : 'Question added')
      setIqPanel(false)
      setEditIq(null)
      setIqForm({ category: '', question: '', answer: '', difficulty: 'MEDIUM', tags: '' })
      loadData()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const handleDeleteIq = async (id) => {
    if (!confirm('Delete this question?')) return
    try { await adminApi.deleteInterviewQuestion(id); toast.success('Deleted'); loadData() }
    catch { toast.error('Failed') }
  }

  const handleCreateDrive = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createDrive({
        ...driveForm,
        requirements: driveForm.requirements.split(',').map(s => s.trim()).filter(Boolean),
        skills: driveForm.skills.split(',').map(s => s.trim()).filter(Boolean),
      })
      toast.success('Drive created')
      setDrivePanel(false)
      setDriveForm(EMPTY_DRIVE_FORM)
      loadData()
    } catch { toast.error('Failed to create drive') } finally { setSaving(false) }
  }

  const handleViewApps = async (driveId) => {
    setViewingApps(driveId)
    if (!driveApplications[driveId]) {
      try {
        const res = await adminApi.getDriveApplications(driveId)
        setDriveApplications(prev => ({ ...prev, [driveId]: res.data.data || [] }))
      } catch { toast.error('Failed to load applications') }
    }
  }

  const handleUpdateAppStatus = async (driveId, appId, status) => {
    try {
      await adminApi.updateDriveApplication(driveId, appId, { status })
      setDriveApplications(prev => ({
        ...prev,
        [driveId]: (prev[driveId] || []).map(a => a.id === appId ? { ...a, status } : a)
      }))
      toast.success('Status updated')
    } catch { toast.error('Failed') }
  }

  const sc = overview?.statusCounts || {}
  const total = Object.values(sc).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Placement Management</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: total, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Seeking', value: sc.SEEKING || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Interviewing', value: sc.INTERVIEWING || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Placed', value: sc.PLACED || 0, color: 'text-green-600', bg: 'bg-green-50 border-2 border-green-200' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`glass-card p-5 ${bg}`}>
            <p className={`text-3xl font-extrabold font-display ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{label}</p>
            {label !== 'Total Students' && total > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">{Math.round((value / total) * 100)}%</p>
            )}
          </div>
        ))}
      </div>



      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {tab === 'Students' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100">
                  {['Student', 'Status', 'Mocks', 'Avg Rating', 'Last Update', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-2"><div className="h-8 bg-gray-100 rounded-lg animate-pulse" /></td></tr>
                  ))
                ) : (overview?.students || []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No students</td></tr>
                ) : (
                  (overview?.students || []).map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select value={s.placementStatus} onChange={e => handlePlacementStatus(s.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${PLACEMENT_COLORS[s.placementStatus]}`}>
                          <option value="SEEKING">SEEKING</option>
                          <option value="INTERVIEWING">INTERVIEWING</option>
                          <option value="PLACED">PLACED</option>
                          <option value="NOT_SEEKING">NOT SEEKING</option>
                        </select>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold text-gray-600">{s.mockCount}</span></td>
                      <td className="px-4 py-3">
                        {s.avgMockRating > 0 ? (
                          <span className="text-yellow-500 text-sm">{'★'.repeat(s.avgMockRating)}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {s.latestUpdate ? s.latestUpdate.title : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setMockForm(f => ({ ...f, studentId: s.id })); setMockPanel(true) }}
                          className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100">
                          Schedule Mock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mock Interviews Tab */}
      {tab === 'Mock Interviews' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setMockPanel(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Schedule Mock Interview
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50/50 border-b border-purple-100">
                    {['Student', 'Date/Time', 'Interviewer', 'Rating', 'Status', 'Feedback'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mocks.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No mock interviews</td></tr>
                  ) : (
                    mocks.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                        <td className="px-4 py-3 font-semibold text-gray-800">{m.student?.user?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(m.scheduledAt), 'dd MMM yyyy, HH:mm')}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.interviewerName || '—'}</td>
                        <td className="px-4 py-3">
                          {m.rating ? <span className="text-yellow-500">{'★'.repeat(m.rating)}</span> : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : m.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.status !== 'COMPLETED' ? (
                            <button onClick={() => { setFeedbackPanel(m.id); setFeedbackForm({ feedback: m.feedback || '', rating: m.rating || 5, status: 'COMPLETED', strengths: (m.strengths || []).join(', '), improvements: (m.improvements || []).join(', ') }) }}
                              className="text-xs text-purple-600 font-semibold hover:underline">Add Feedback</button>
                          ) : <span className="text-xs text-gray-400">Done</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interview Questions Tab */}
      {tab === 'Interview Questions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {IQ_CATEGORIES.slice(0, 6).map(c => (
                <button key={c} onClick={() => setIqCategory(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${iqCategory === c ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                  {c}
                </button>
              ))}
              <select value={iqDiff} onChange={e => setIqDiff(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Difficulty</option>
                <option>EASY</option><option>MEDIUM</option><option>HARD</option>
              </select>
            </div>
            <button onClick={() => { setIqPanel(true); setEditIq(null); setIqForm({ category: '', question: '', answer: '', difficulty: 'MEDIUM', tags: '' }) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">
              <Plus size={12} /> Add Question
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {iqList.length === 0 ? (
              <div className="col-span-2 glass-card p-10 text-center text-gray-400">No questions found</div>
            ) : (
              iqList.map(q => (
                <div key={q.id} className="glass-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{q.category}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditIq(q.id); setIqForm({ category: q.category, question: q.question, answer: q.answer, difficulty: q.difficulty, tags: (q.tags || []).join(', ') }); setIqPanel(true) }}
                        className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs">✎</button>
                      <button onClick={() => handleDeleteIq(q.id)}
                        className="w-6 h-6 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{q.question}</p>
                  {expandedAnswers[q.id] ? (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{q.answer}</p>
                      <button onClick={() => setExpandedAnswers(prev => ({ ...prev, [q.id]: false }))}
                        className="text-xs text-purple-500 font-semibold mt-1 flex items-center gap-1">
                        <ChevronUp size={11} /> Hide Answer
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setExpandedAnswers(prev => ({ ...prev, [q.id]: true }))}
                      className="text-xs text-purple-500 font-semibold flex items-center gap-1">
                      <ChevronDown size={11} /> Show Answer
                    </button>
                  )}
                  {(q.tags || []).length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {q.tags.map(t => <span key={t} className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Company Drives Tab */}
      {tab === 'Company Drives' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setDrivePanel(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Create Drive
            </button>
          </div>

          {/* Applications modal */}
          <DriveAppsModal
            viewingApps={viewingApps}
            driveApplications={driveApplications}
            onClose={() => setViewingApps(null)}
            handleUpdateAppStatus={handleUpdateAppStatus}
          />


          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50/50 border-b border-purple-100">
                    {['Company', 'Role', 'Package', 'Drive Date', 'Deadline', 'Applied', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drives.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No drives created yet</td></tr>
                  ) : drives.map(d => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{d.companyName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.role}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.packageOffered}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(d.driveDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-xs">
                        {isPast(new Date(d.applyDeadline)) ? (
                          <span className="text-gray-400">Passed</span>
                        ) : (
                          <span className={`font-medium ${differenceInDays(new Date(d.applyDeadline), new Date()) <= 2 ? 'text-red-500' : 'text-gray-600'}`}>
                            {format(new Date(d.applyDeadline), 'dd MMM')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-600">{d._count?.applications || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            d.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-500'
                          }`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleViewApps(d.id)}
                            className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100">
                            Applications
                          </button>
                          <select value={d.status}
                            onChange={async e => {
                              try {
                                await adminApi.updateDriveStatus(d.id, e.target.value)
                                setDrives(prev => prev.map(dr => dr.id === d.id ? { ...dr, status: e.target.value } : dr))
                                toast.success('Status updated')
                              } catch { toast.error('Failed') }
                            }}
                            className="text-xs px-1.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 outline-none">
                            <option value="UPCOMING">UPCOMING</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="CLOSED">CLOSED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Mock Panel */}
      <SlidePanel open={mockPanel} onClose={() => setMockPanel(false)} title="Schedule Mock Interview">
        <form onSubmit={handleScheduleMock} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Student *</label>
            <select value={mockForm.studentId} onChange={e => setMockForm(f => ({ ...f, studentId: e.target.value }))} required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select student</option>
              {(overview?.students || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date & Time *</label>
            <DateTimePicker12h
              required
              value={mockForm.scheduledAt}
              onChange={val => setMockForm(f => ({ ...f, scheduledAt: val }))}
            />
          </div>
          {[
            { label: 'Interviewer Name', key: 'interviewerName', placeholder: 'Rajesh Kumar' },
            { label: 'Meeting Link', key: 'meetLink', placeholder: 'https://meet.google.com/...' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input value={mockForm[key]} onChange={e => setMockForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setMockPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Feedback Panel */}
      <SlidePanel open={!!feedbackPanel} onClose={() => setFeedbackPanel(null)} title="Add Feedback">
        <form onSubmit={handleFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} type="button" onClick={() => setFeedbackForm(f => ({ ...f, rating: r }))}
                  className={`text-2xl transition-opacity ${feedbackForm.rating >= r ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Feedback</label>
            <textarea value={feedbackForm.feedback} onChange={e => setFeedbackForm(f => ({ ...f, feedback: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          {[
            { label: 'Strengths (comma-separated)', key: 'strengths', placeholder: 'Good communication, Confident' },
            { label: 'Improvements (comma-separated)', key: 'improvements', placeholder: 'Data structures, System design' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input value={feedbackForm[key]} onChange={e => setFeedbackForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFeedbackPanel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Feedback'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Create Drive Panel */}
      <SlidePanel open={drivePanel} onClose={() => setDrivePanel(false)} title="Create Company Drive">
        <form onSubmit={handleCreateDrive} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Company Name *', key: 'companyName', placeholder: 'TCS Digital' },
              { label: 'Role *', key: 'role', placeholder: 'Junior Developer' },
              { label: 'Package', key: 'packageOffered', placeholder: '3.5 - 5 LPA' },
              { label: 'Location', key: 'location', placeholder: 'Chennai' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                <input value={driveForm[key]} onChange={e => setDriveForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required={label.includes('*')} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Drive Date *</label>
              <input type="date" value={driveForm.driveDate} onChange={e => setDriveForm(f => ({ ...f, driveDate: e.target.value }))} required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Apply Deadline *</label>
              <input type="date" value={driveForm.applyDeadline} onChange={e => setDriveForm(f => ({ ...f, applyDeadline: e.target.value }))} required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={driveForm.description} onChange={e => setDriveForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Requirements (comma-separated)</label>
            <input value={driveForm.requirements} onChange={e => setDriveForm(f => ({ ...f, requirements: e.target.value }))} placeholder="B.Tech/MCA, 60% throughout, No backlogs"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Skills Required (comma-separated)</label>
            <input value={driveForm.skills} onChange={e => setDriveForm(f => ({ ...f, skills: e.target.value }))} placeholder="Python, Django, SQL, Git"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Drive Type</label>
              <select value={driveForm.driveType} onChange={e => setDriveForm(f => ({ ...f, driveType: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="CAMPUS">CAMPUS</option>
                <option value="OFF_CAMPUS">OFF_CAMPUS</option>
                <option value="POOL">POOL</option>
                <option value="VIRTUAL">VIRTUAL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select value={driveForm.status} onChange={e => setDriveForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="UPCOMING">UPCOMING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">External Apply Link (optional)</label>
            <input value={driveForm.applyLink} onChange={e => setDriveForm(f => ({ ...f, applyLink: e.target.value }))} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            <p className="text-[10px] text-gray-400 mt-1">Company reference link only - students still express interest through the platform, never apply directly.</p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">Eligibility Criteria</p>
            <EligibilityCriteriaFields value={driveForm} onChange={patch => setDriveForm(f => ({ ...f, ...patch }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setDrivePanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Drive'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* IQ Panel */}
      <SlidePanel open={iqPanel} onClose={() => setIqPanel(false)} title={editIq ? 'Edit Question' : 'Add Question'}>
        <form onSubmit={handleSaveIq} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
              <input value={iqForm.category} onChange={e => setIqForm(f => ({ ...f, category: e.target.value }))} placeholder="Python, DSA..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
              <select value={iqForm.difficulty} onChange={e => setIqForm(f => ({ ...f, difficulty: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option>EASY</option><option>MEDIUM</option><option>HARD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Question *</label>
            <textarea value={iqForm.question} onChange={e => setIqForm(f => ({ ...f, question: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Answer *</label>
            <textarea value={iqForm.answer} onChange={e => setIqForm(f => ({ ...f, answer: e.target.value }))} rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (comma-separated)</label>
            <input value={iqForm.tags} onChange={e => setIqForm(f => ({ ...f, tags: e.target.value }))} placeholder="oop, classes, inheritance"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIqPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : (editIq ? 'Update' : 'Add Question')}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}

function DriveAppsModal({ viewingApps, driveApplications, onClose, handleUpdateAppStatus }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !viewingApps) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Drive Applications</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {!driveApplications[viewingApps] ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
          ) : driveApplications[viewingApps].length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No applications yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  {['Student', 'Email', 'Applied', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driveApplications[viewingApps].map(app => (
                  <tr key={app.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white">{app.student?.user?.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{app.student?.user?.email}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{format(new Date(app.appliedAt), 'dd MMM')}</td>
                    <td className="px-4 py-2.5">
                      <select value={app.status}
                        onChange={e => handleUpdateAppStatus(viewingApps, app.id, e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none">
                        <option value="INTERESTED">INTERESTED</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="SHORTLISTED">SHORTLISTED</option>
                        <option value="RESUME_SHARED">RESUME_SHARED</option>
                        <option value="SELECTED">SELECTED</option>
                        <option value="NOT_SELECTED">NOT_SELECTED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

