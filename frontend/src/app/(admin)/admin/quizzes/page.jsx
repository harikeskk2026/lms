'use client'
import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, Eye, BarChart3, Users, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'
import QuestionBankPanel from '@/components/admin/QuestionBankPanel'
import QuestionForm from '@/components/admin/QuestionForm'
import BulkQuestionForm from '@/components/admin/BulkQuestionForm'

const STEP_LABELS = ['Settings', 'Questions', 'Preview']

const TYPE_LABELS = { MCQ: 'MCQ', APTITUDE: 'Aptitude', CODING: 'Coding', INTERVIEW_PREP: 'Interview', ADAPTIVE: 'Adaptive' }
const TYPE_STYLES = {
  MCQ:            'bg-purple-100 text-purple-700',
  APTITUDE:       'bg-blue-100 text-blue-700',
  CODING:         'bg-green-100 text-green-700',
  INTERVIEW_PREP: 'bg-yellow-100 text-yellow-700',
  ADAPTIVE:       'bg-pink-100 text-pink-700',
}
const DIFFICULTY_STYLES = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
}

const EMPTY_FORM = {
  title: '', description: '', type: 'MCQ', difficulty: 'MEDIUM',
  duration: 30, passingScore: 50, maxAttempts: 1,
  courseId: '', batchId: '',
  randomQuestions: false, randomOptions: false, showExplanation: true,
  negativeMarking: false, resultVisibility: 'IMMEDIATE',
  scheduledStart: '', scheduledEnd: '',
}

const STATUS_BADGE_STYLES = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  LIVE:      'bg-green-100 text-green-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  ARCHIVED:  'bg-red-100 text-red-700',
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [bankQuestions, setBankQuestions] = useState([])
  const [topics, setTopics]         = useState([])
  const [courses, setCourses]       = useState([])
  const [batches, setBatches]       = useState([])
  const [panelOpen, setPanelOpen]   = useState(false)
  const [questionsView, setQuestionsView] = useState('list') // 'list' | 'create' | 'bulkCreate'
  const [step, setStep]             = useState(0)
  const [saving, setSaving]         = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [quizSearch, setQuizSearch] = useState('')
  const [activeTab, setActiveTab]   = useState('quizzes')
  const [questionSearch, setQuestionSearch] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [quizPage, setQuizPage]     = useState(1)
  const [quizPageSize, setQuizPageSize] = useState(10)
  const [pickerPage, setPickerPage] = useState(1)
  const [pickerPageSize, setPickerPageSize] = useState(10)
  const [viewingQuiz, setViewingQuiz] = useState(null)
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false)
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null)
  const [quizAnalytics, setQuizAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [questionMarks, setQuestionMarks] = useState({})
  const [selectedBatchIds, setSelectedBatchIds] = useState([])
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [assigningQuiz, setAssigningQuiz] = useState(null)
  const [quizAssignments, setQuizAssignments] = useState([])

  const loadBankQuestions = () => {
    quizService.listQuestions({ active: true }).then(r => setBankQuestions(r.data || [])).catch(() => {})
  }

  const load = () => {
    setLoading(true)
    quizService.listQuizzes().then(r => setQuizzes(r.data || [])).catch(() => toast.error('Failed to load quizzes')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    loadBankQuestions()
    quizService.listTopics().then(r => setTopics(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
  }, [])

  const handleQuestionCreated = (newQuestion) => {
    setBankQuestions(prev => [newQuestion, ...prev])
    setSelectedQuestionIds(prev => [...prev, newQuestion.id])
    setQuestionsView('list')
  }

  const handleBulkQuestionsCreated = (newQuestions) => {
    setBankQuestions(prev => [...newQuestions, ...prev])
    setSelectedQuestionIds(prev => [...prev, ...newQuestions.map(q => q.id)])
    setQuestionsView('list')
  }

  const handleStatusToggle = async (quiz) => {
    const nextStatus = quiz.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    if (nextStatus === 'PUBLISHED') {
      const missing = []
      if (!quiz.totalQuestions) missing.push('at least one question')
      if (!quiz.assignments?.length && !quiz.courseId && !quiz.batchId) missing.push('an assignment to at least one batch, course, or student')
      if (missing.length > 0) {
        toast.error(`Quiz cannot be published. Complete: ${missing.join(', ')}.`)
        return
      }
    }
    try {
      await quizService.updateQuiz(quiz.id, {
        title: quiz.title, description: quiz.description, type: quiz.type, difficulty: quiz.difficulty,
        duration: quiz.duration, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts,
        courseId: quiz.courseId || null, batchId: quiz.batchId || null,
        randomQuestions: quiz.randomQuestions, randomOptions: quiz.randomOptions,
        showExplanation: quiz.showExplanation,
        negativeMarking: quiz.negativeMarking, resultVisibility: quiz.resultVisibility,
        scheduledStart: quiz.scheduledStart || null, scheduledEnd: quiz.scheduledEnd || null,
        status: nextStatus,
      })
      toast.success(nextStatus === 'PUBLISHED' ? 'Quiz published' : 'Quiz moved to draft')
      load()
    } catch (err) { toast.error(err.message || 'Failed') }
  }

  const handleViewQuiz = async (quiz) => {
    setLoadingQuizDetails(true)
    setViewingQuiz(quiz)
    try {
      const res = await quizService.getQuiz(quiz.id)
      if (res.data) {
        setViewingQuiz(res.data)
      }
    } catch (err) {
      toast.error('Failed to load quiz details')
    } finally {
      setLoadingQuizDetails(false)
    }
  }

  const handleViewAnalytics = async (quiz) => {
    setAnalyticsQuiz(quiz)
    setLoadingAnalytics(true)
    try {
      const res = await quizService.getAdminQuizAnalytics(quiz.id)
      setQuizAnalytics(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load analytics')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleDelete = async (quiz) => {
    if (!confirm(`Delete "${quiz.title}"?`)) return
    try {
      await quizService.removeQuiz(quiz.id)
      toast.success('Quiz deleted')
      load()
    } catch (err) { toast.error(err.message || 'Failed to delete quiz') }
  }

  const toggleQuestion = (id) => {
    setSelectedQuestionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const moveQuestion = (id, direction) => {
    setSelectedQuestionIds(prev => {
      const idx = prev.indexOf(id)
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }

  const setQuestionMark = (id, value) => {
    setQuestionMarks(prev => ({ ...prev, [id]: value === '' ? undefined : Number(value) }))
  }

  // Preserves selection/reorder order (unlike a plain bank filter)
  const selectedQuestions = selectedQuestionIds
    .map(id => bankQuestions.find(q => q.id === id))
    .filter(Boolean)
  const totalPoints = selectedQuestions.reduce((a, q) => a + (questionMarks[q.id] ?? q.points ?? 1), 0)
  const filteredBankQuestions = questionSearch
    ? bankQuestions.filter(q => q.questionText.toLowerCase().includes(questionSearch.toLowerCase()))
    : bankQuestions

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSelectedQuestionIds([])
    setQuestionMarks({})
    setSelectedBatchIds([])
    setSelectedCourseIds([])
    setStep(0)
    setQuestionsView('list')
    setPanelOpen(true)
  }

  const missingPublishRequirements = () => {
    const missing = []
    if (selectedQuestionIds.length === 0) missing.push('at least one question')
    if (!selectedBatchIds.length && !selectedCourseIds.length && !form.courseId && !form.batchId) {
      missing.push('an assignment to at least one batch, course, or student')
    }
    return missing
  }

  const handleSave = async (publish = false) => {
    if (selectedQuestionIds.length === 0) {
      toast.error('Select at least one question')
      return
    }
    if (publish) {
      const missing = missingPublishRequirements()
      if (missing.length > 0) {
        toast.error(`Quiz cannot be published. Complete: ${missing.join(', ')}.`)
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        courseId: form.courseId || null,
        batchId: form.batchId || null,
        scheduledStart: form.scheduledStart || null,
        scheduledEnd: form.scheduledEnd || null,
      }
      const quiz = await quizService.createQuiz(payload)
      const quizId = quiz.data.id
      await quizService.attachQuestions(quizId, selectedQuestionIds)
      await quizService.reorderQuestions(quizId, selectedQuestionIds.map(id => ({
        questionId: id,
        marks: questionMarks[id] ?? null,
      })))
      if (selectedBatchIds.length) {
        await quizService.assignQuiz(quizId, { targetType: 'BATCH', targetIds: selectedBatchIds })
      }
      if (selectedCourseIds.length) {
        await quizService.assignQuiz(quizId, { targetType: 'COURSE', targetIds: selectedCourseIds })
      }
      if (publish) {
        await quizService.updateQuiz(quizId, { ...payload, status: 'PUBLISHED' })
      }
      toast.success(publish ? 'Quiz published!' : 'Quiz saved as draft')
      setPanelOpen(false); setStep(0)
      setForm(EMPTY_FORM)
      setSelectedQuestionIds([])
      setQuestionMarks({})
      setSelectedBatchIds([])
      setSelectedCourseIds([])
      load()
    } catch (err) { toast.error(err.message || 'Failed to save quiz') } finally { setSaving(false) }
  }

  const openAssign = async (quiz) => {
    setAssigningQuiz(quiz)
    try {
      const res = await quizService.getQuizAssignments(quiz.id)
      setQuizAssignments(res.data || [])
    } catch { toast.error('Failed to load assignments') }
  }

  const addAssignment = async (targetType, targetIds) => {
    if (!assigningQuiz || !targetIds.length) return
    try {
      const res = await quizService.assignQuiz(assigningQuiz.id, { targetType, targetIds })
      setQuizAssignments(res.data || [])
      toast.success('Assignment updated')
    } catch (err) { toast.error(err.message || 'Failed to assign') }
  }

  const removeAssignmentRow = async (assignmentId) => {
    if (!assigningQuiz) return
    try {
      await quizService.removeQuizAssignment(assigningQuiz.id, assignmentId)
      setQuizAssignments(prev => prev.filter(a => a.id !== assignmentId))
    } catch { toast.error('Failed to remove assignment') }
  }

  const handleReleaseResults = async (quiz) => {
    try {
      await quizService.releaseResults(quiz.id)
      toast.success('Results released to students')
      load()
    } catch (err) { toast.error(err.message || 'Failed to release results') }
  }

  const filtered = quizzes.filter(q => {
    if (typeFilter && q.type !== typeFilter) return false
    if (statusFilter && q.effectiveStatus !== statusFilter) return false
    if (courseFilter && String(q.courseId) !== String(courseFilter)) return false
    if (batchFilter && String(q.batchId) !== String(batchFilter)) return false
    if (quizSearch && !q.title?.toLowerCase().includes(quizSearch.toLowerCase())) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Served by the Java API. Questions come from the Question Bank.</p>
        </div>
        {activeTab === 'quizzes' && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus size={16} /> Create Quiz
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {[
          { id: 'quizzes', label: 'Quizzes' },
          { id: 'question-bank', label: 'Question Bank' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'question-bank' && <QuestionBankPanel onChange={loadBankQuestions} />}

      {activeTab === 'quizzes' && (
      <>
      {/* Search + Filters Toolbar Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={quizSearch}
              onChange={e => { setQuizSearch(e.target.value); setQuizPage(1); }}
              placeholder="Search quizzes by title..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Course Filter Dropdown */}
            <select
              value={courseFilter}
              onChange={e => { setCourseFilter(e.target.value); setQuizPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            {/* Batch Filter Dropdown */}
            <select
              value={batchFilter}
              onChange={e => { setBatchFilter(e.target.value); setQuizPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            {/* Type Filter Dropdown */}
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setQuizPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="APTITUDE">Aptitude</option>
              <option value="CODING">Coding</option>
              <option value="INTERVIEW_PREP">Interview Prep</option>
            </select>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setQuizPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>


      {/* Quiz Table */}
      {(() => {
        const totalQuizPages = Math.ceil(filtered.length / quizPageSize) || 1
        const validQuizPage = Math.min(quizPage, totalQuizPages)
        const quizStartIndex = (validQuizPage - 1) * quizPageSize
        const quizEndIndex = Math.min(quizStartIndex + quizPageSize, filtered.length)
        const paginatedQuizzes = filtered.slice(quizStartIndex, quizEndIndex)

        return (
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-50/50 border-b border-purple-100 dark:bg-purple-900/20 dark:border-purple-900/30">
                        {['Title', 'Type', 'Difficulty', 'Course / Batch', 'Questions', 'Duration', 'Passing', 'Max Attempts', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedQuizzes.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center">
                            <div className="max-w-xs mx-auto flex flex-col items-center justify-center">
                              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-500 mb-3">
                                <Search size={22} />
                              </div>
                              <h4 className="font-bold text-gray-800 dark:text-white text-base">No Quizzes Found</h4>
                              <p className="text-xs text-gray-500 mt-1">Try adjusting your filter or search query to find available quizzes.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedQuizzes.map(q => (
                          <tr key={q.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50/20 dark:hover:bg-purple-900/10 transition-colors">
                            <td className="px-3 py-3 font-semibold text-gray-800 dark:text-white max-w-[160px] truncate">{q.title}</td>
                            <td className="px-3 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[q.type] || TYPE_STYLES.MCQ}`}>
                                {TYPE_LABELS[q.type] || q.type}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[q.difficulty]}`}>{q.difficulty}</span>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-500 max-w-[160px]">
                              {q.courseName || q.batchName ? (
                                <div className="flex flex-col gap-0.5">
                                  {q.courseName && <span className="truncate">{q.courseName}</span>}
                                  {q.batchName && <span className="text-gray-400 truncate">{q.batchName}</span>}
                                </div>
                              ) : <span className="text-gray-300">All students</span>}
                            </td>
                            <td className="px-3 py-3"><span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{q.totalQuestions}</span></td>
                            <td className="px-3 py-3 text-xs text-gray-500">{q.duration}m</td>
                            <td className="px-3 py-3 text-xs text-gray-500">{q.passingScore}%</td>
                            <td className="px-3 py-3 text-xs text-gray-500">{q.maxAttempts}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <button
                                onClick={() => handleStatusToggle(q)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border shadow-sm ${
                                  q.status === 'PUBLISHED' || q.effectiveStatus === 'LIVE'
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/50'
                                    : q.effectiveStatus === 'SCHEDULED'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50 hover:bg-amber-100'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }`}
                                title={q.status === 'PUBLISHED' ? 'Click to unpublish (set to Draft)' : 'Click to publish (set to Live)'}
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${q.status === 'PUBLISHED' || q.effectiveStatus === 'LIVE' ? 'bg-green-500 animate-pulse' : q.effectiveStatus === 'SCHEDULED' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                <span>{q.effectiveStatus || (q.status === 'PUBLISHED' ? 'LIVE' : 'DRAFT')}</span>
                                <span className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ml-1 shrink-0 ${q.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${q.status === 'PUBLISHED' ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                </span>
                              </button>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleViewQuiz(q)} className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center transition-colors" title="View Quiz Details">
                                  <Eye size={13} />
                                </button>
                                <button onClick={() => openAssign(q)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 flex items-center justify-center transition-colors" title="Assign">
                                  <Users size={13} />
                                </button>
                                <button onClick={() => handleViewAnalytics(q)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 flex items-center justify-center transition-colors" title="Analytics">
                                  <BarChart3 size={13} />
                                </button>
                                {q.resultVisibility === 'MANUAL' && !q.resultsReleased && (
                                  <button onClick={() => handleReleaseResults(q)} className="w-7 h-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors" title="Release Results">
                                    <Send size={13} />
                                  </button>
                                )}
                                <button onClick={() => handleDelete(q)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span>Per page:</span>
                    <select
                      value={quizPageSize}
                      onChange={e => { setQuizPageSize(Number(e.target.value)); setQuizPage(1); }}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:ring-2 focus:ring-purple-500 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white font-semibold"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="ml-2 font-medium">
                      Showing {filtered.length > 0 ? quizStartIndex + 1 : 0}–{quizEndIndex} of {filtered.length} quizzes
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQuizPage(p => Math.max(1, p - 1))}
                      disabled={validQuizPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalQuizPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalQuizPages || Math.abs(p - validQuizPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                          <button
                            onClick={() => setQuizPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                              validQuizPage === p
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      onClick={() => setQuizPage(p => Math.min(totalQuizPages, p + 1))}
                      disabled={validQuizPage >= totalQuizPages || totalQuizPages === 0}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}
      </>
      )}

      {/* Create Quiz Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setStep(0); setQuestionsView('list') }} title="Create Quiz" width="w-[600px]">
        {/* Steps */}
        <div className="flex mb-6 gap-1">
          {STEP_LABELS.map((l, i) => (
            <button key={l} onClick={() => setStep(i)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${step === i ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {i + 1}. {l}
            </button>
          ))}
        </div>

        {/* Step 0: Settings */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Python Fundamentals Quiz"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quiz Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="MCQ">MCQ</option>
                  <option value="APTITUDE">Aptitude</option>
                  <option value="CODING">Coding</option>
                  <option value="INTERVIEW_PREP">Interview Prep</option>
                  <option value="ADAPTIVE">Adaptive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
                <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course</label>
                <select value={form.courseId}
                  onChange={e => {
                    const courseId = e.target.value
                    setForm(f => {
                      const stillValid = f.batchId && batches.some(b => String(b.id) === String(f.batchId) && String(b.course?.id) === String(courseId))
                      return { ...f, courseId, batchId: stillValid ? f.batchId : '' }
                    })
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">All courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
                <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">All batches</option>
                  {batches
                    .filter(b => !form.courseId || String(b.course?.id) === String(form.courseId))
                    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (min)</label>
                <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Passing Score (%)</label>
                <input type="number" min={0} max={100} value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Max Attempts</label>
                <input type="number" min={1} value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date/Time</label>
                <input type="datetime-local" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date/Time</label>
                <input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Result Visibility</label>
              <select value={form.resultVisibility} onChange={e => setForm(f => ({ ...f, resultVisibility: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="IMMEDIATE">Show result immediately</option>
                <option value="AFTER_CLOSE">Show result after quiz closes</option>
                <option value="MANUAL">Release result manually</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.randomQuestions} onChange={e => setForm(f => ({ ...f, randomQuestions: e.target.checked }))}
                  className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Randomize question order</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.randomOptions} onChange={e => setForm(f => ({ ...f, randomOptions: e.target.checked }))}
                  className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Randomize option order</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.negativeMarking} onChange={e => setForm(f => ({ ...f, negativeMarking: e.target.checked }))}
                  className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Negative marking (wrong answers deduct full marks)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.showExplanation} onChange={e => setForm(f => ({ ...f, showExplanation: e.target.checked }))}
                  className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Show explanations after submission</span>
              </label>
            </div>
            <button onClick={() => setStep(1)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold">
              Next: Add Questions →
            </button>
          </div>
        )}

        {/* Step 1: Questions (from the Question Bank) */}
        {step === 1 && questionsView === 'list' && (() => {
          const totalPickerPages = Math.ceil(filteredBankQuestions.length / pickerPageSize) || 1
          const validPickerPage = Math.min(pickerPage, totalPickerPages)
          const pickerStartIndex = (validPickerPage - 1) * pickerPageSize
          const pickerEndIndex = Math.min(pickerStartIndex + pickerPageSize, filteredBankQuestions.length)
          const paginatedPickerQuestions = filteredBankQuestions.slice(pickerStartIndex, pickerEndIndex)

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">{selectedQuestionIds.length} selected</p>
              </div>
              {/* Info note */}
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                <span className="mt-0.5 shrink-0">ℹ️</span>
                <span>Questions are sourced from the <strong>Question Bank</strong> tab. Use the Question Bank to create, import, or manage all your questions centrally — they can be reused across multiple quizzes.</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search question bank..." value={questionSearch} onChange={e => { setQuestionSearch(e.target.value); setPickerPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {paginatedPickerQuestions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No active questions found. Add some in the Question Bank first.
                  </p>
                ) : (
                  paginatedPickerQuestions.map(q => (
                    <label key={q.id} className="flex items-start gap-3 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={selectedQuestionIds.includes(q.id)} onChange={() => toggleQuestion(q.id)}
                        className="w-4 h-4 mt-0.5 accent-purple-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{q.questionText}</p>
                        <div className="flex gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${q.questionType === 'MULTIPLE_CORRECT' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                            {q.questionType === 'MULTIPLE_CORRECT' ? 'Multi-Select' : q.questionType}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${DIFFICULTY_STYLES[q.difficulty]}`}>{q.difficulty}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{q.points} pts</span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Picker Pagination Bar */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
                <span>Showing {filteredBankQuestions.length > 0 ? pickerStartIndex + 1 : 0}–{pickerEndIndex} of {filteredBankQuestions.length}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPickerPage(p => Math.max(1, p - 1))}
                    disabled={validPickerPage === 1}
                    className="p-1 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-bold px-1.5 text-gray-700">{validPickerPage} / {totalPickerPages}</span>
                  <button
                    type="button"
                    onClick={() => setPickerPage(p => Math.min(totalPickerPages, p + 1))}
                    disabled={validPickerPage >= totalPickerPages}
                    className="p-1 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <button onClick={() => setStep(2)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold">
                Preview & Publish →
              </button>
            </div>
          )
        })()}

        {/* Step 1: Questions — inline single question creation view */}
        {step === 1 && questionsView === 'create' && (
          <div className="space-y-4">
            <button type="button" onClick={() => setQuestionsView('list')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1">
              ← Back to Questions
            </button>
            <QuestionForm
              topics={topics}
              onTopicsChange={setTopics}
              onSaved={handleQuestionCreated}
              onCancel={() => setQuestionsView('list')}
            />
          </div>
        )}

        {/* Step 1: Questions — inline batch questions creation view */}
        {step === 1 && questionsView === 'bulkCreate' && (
          <div className="space-y-4">
            <button type="button" onClick={() => setQuestionsView('list')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1">
              ← Back to Questions
            </button>
            <BulkQuestionForm
              topics={topics}
              onSaved={handleBulkQuestionsCreated}
              onCancel={() => setQuestionsView('list')}
            />
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[form.type] || TYPE_STYLES.MCQ}`}>
                    {TYPE_LABELS[form.type] || form.type}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[form.difficulty]}`}>{form.difficulty}</span>
                </div>
              </div>
              <h3 className="font-display font-bold text-gray-800 dark:text-white">{form.title || 'Untitled Quiz'}</h3>
              {form.description && <p className="text-xs text-gray-500 mt-1">{form.description}</p>}
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{selectedQuestionIds.length} questions</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{form.duration} minutes</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Total: {totalPoints} pts</span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Pass: {form.passingScore}%</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Max attempts: {form.maxAttempts}</span>
              </div>
            </div>

            {/* Questions Preview List with View Icon Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-purple-600" /> Questions Preview ({selectedQuestions.length})
                </h4>
              </div>

              {selectedQuestions.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  No questions selected. Go back to Step 2 to select questions.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-semibold text-gray-800 dark:text-white">{q.questionText}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input type="number" min={1} value={questionMarks[q.id] ?? q.points ?? 1}
                            onChange={e => setQuestionMark(q.id, e.target.value)}
                            className="w-12 text-[10px] font-bold text-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 py-0.5" />
                          <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0}
                            className="w-5 h-5 rounded bg-gray-100 text-gray-500 disabled:opacity-30 flex items-center justify-center">↑</button>
                          <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={idx === selectedQuestions.length - 1}
                            className="w-5 h-5 rounded bg-gray-100 text-gray-500 disabled:opacity-30 flex items-center justify-center">↓</button>
                          <button type="button" onClick={() => toggleQuestion(q.id)}
                            className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center">×</button>
                        </div>
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 pt-1 pl-7">
                          {q.options.map((o, oIdx) => (
                            <div key={o.id || oIdx} className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${o.correct ? 'bg-green-50 text-green-700 border-green-200 font-medium' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                              <span>{o.correct ? '✓' : '•'}</span>
                              <span className="truncate">{o.optionText}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign To */}
            <div className="glass-card p-4 space-y-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Assign To</p>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Batches</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {batches.map(b => (
                    <label key={b.id} className="flex items-center gap-1.5 text-[11px] bg-gray-50 dark:bg-gray-800 rounded-full px-2.5 py-1 cursor-pointer">
                      <input type="checkbox" checked={selectedBatchIds.includes(b.id)}
                        onChange={() => setSelectedBatchIds(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id])}
                        className="w-3 h-3 accent-purple-600" />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Courses</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {courses.map(c => (
                    <label key={c.id} className="flex items-center gap-1.5 text-[11px] bg-gray-50 dark:bg-gray-800 rounded-full px-2.5 py-1 cursor-pointer">
                      <input type="checkbox" checked={selectedCourseIds.includes(c.id)}
                        onChange={() => setSelectedCourseIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                        className="w-3 h-3 accent-purple-600" />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                {selectedBatchIds.length || selectedCourseIds.length
                  ? `Assigned to: ${selectedBatchIds.length} batch(es), ${selectedCourseIds.length} course(s)`
                  : 'No batches/courses selected yet — pick at least one, or use the Course/Batch fields in Step 1, before publishing.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => handleSave(false)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                {saving ? '...' : 'Save Draft'}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                {saving ? 'Publishing...' : 'Publish Quiz'}
              </button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Quiz Details View SlidePanel */}
      <SlidePanel open={!!viewingQuiz} onClose={() => setViewingQuiz(null)} title="Quiz Details" width="w-[600px]">
        {viewingQuiz && (
          <div className="space-y-5">
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${TYPE_STYLES[viewingQuiz.type] || TYPE_STYLES.MCQ}`}>
                  {TYPE_LABELS[viewingQuiz.type] || viewingQuiz.type}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${DIFFICULTY_STYLES[viewingQuiz.difficulty]}`}>
                  {viewingQuiz.difficulty}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${viewingQuiz.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {viewingQuiz.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">{viewingQuiz.title}</h2>
              {viewingQuiz.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{viewingQuiz.description}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg font-semibold border border-purple-100 dark:border-purple-800">
                  🕒 Duration: {viewingQuiz.duration} mins
                </span>
                <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-lg font-semibold border border-green-100 dark:border-green-800">
                  🎯 Passing: {viewingQuiz.passingScore}%
                </span>
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg font-semibold border border-blue-100 dark:border-blue-800">
                  🔄 Max Attempts: {viewingQuiz.maxAttempts}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center justify-between">
                <span>Quiz Questions</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                  {viewingQuiz.questions?.length || viewingQuiz.totalQuestions || 0} Questions
                </span>
              </h3>

              {loadingQuizDetails ? (
                <div className="py-8 text-center text-xs text-gray-500 animate-pulse">Loading quiz questions...</div>
              ) : !viewingQuiz.questions || viewingQuiz.questions.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 border border-dashed rounded-xl">No questions attached to this quiz yet.</div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {viewingQuiz.questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-semibold text-gray-800 dark:text-white">{q.questionText}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                          {q.points || 1} pt{q.points > 1 ? 's' : ''}
                        </span>
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1 pl-7">
                          {q.options.map((o, oIdx) => (
                            <div key={o.id || oIdx} className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${o.correct ? 'bg-green-50 text-green-700 border-green-200 font-semibold' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                              <span>{o.correct ? '✓' : '•'}</span>
                              <span>{o.optionText}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Quiz Analytics SlidePanel */}
      <SlidePanel open={!!analyticsQuiz} onClose={() => { setAnalyticsQuiz(null); setQuizAnalytics(null) }} title="Quiz Analytics" width="w-[420px]">
        {analyticsQuiz && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{analyticsQuiz.title}</h3>
            {loadingAnalytics ? (
              <div className="space-y-3">{[0,1].map(i => <div key={i} className="h-16 glass-card animate-pulse" />)}</div>
            ) : quizAnalytics ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Attempts', val: quizAnalytics.totalAttempts },
                  { label: 'Average Score', val: `${quizAnalytics.averageScore}%` },
                  { label: 'Pass Rate', val: `${quizAnalytics.passRate}%` },
                  { label: 'Average Time', val: `${Math.round(quizAnalytics.averageTimeSeconds)}s` },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4 text-center">
                    <p className="text-xl font-extrabold text-purple-600 font-display">{s.val}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Assign Quiz SlidePanel */}
      <SlidePanel open={!!assigningQuiz} onClose={() => { setAssigningQuiz(null); setQuizAssignments([]) }} title="Assign Quiz" width="w-[460px]">
        {assigningQuiz && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{assigningQuiz.title}</h3>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Current Assignments</p>
              {quizAssignments.length === 0 ? (
                <p className="text-xs text-gray-400">Not assigned yet — visible to all students.</p>
              ) : (
                <div className="space-y-1.5">
                  {quizAssignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <span>
                        <span className="font-semibold text-gray-500 mr-1">{a.targetType}:</span>
                        {a.targetLabel}
                      </span>
                      <button onClick={() => removeAssignmentRow(a.id)} className="text-red-500 hover:text-red-700">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Add Batches</p>
              <div className="flex flex-wrap gap-1.5">
                {batches.map(b => (
                  <button key={b.id} onClick={() => addAssignment('BATCH', [b.id])}
                    className="text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full px-2.5 py-1">
                    + {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Add Courses</p>
              <div className="flex flex-wrap gap-1.5">
                {courses.map(c => (
                  <button key={c.id} onClick={() => addAssignment('COURSE', [c.id])}
                    className="text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full px-2.5 py-1">
                    + {c.title}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Individual-student assignment is supported by the API but not yet exposed here — assign by batch or course for now.
            </p>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
