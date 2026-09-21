'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, Eye, BarChart3, Users, Send, X, ClipboardList, CheckCircle, AlertCircle, FileText, Pencil, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import SlidePanel from '@/components/admin/SlidePanel'
import QuestionBankPanel from '@/components/admin/QuestionBankPanel'
import QuestionForm from '@/components/admin/QuestionForm'
import BulkQuestionForm from '@/components/admin/BulkQuestionForm'
import CreatePdfQuizPanel from '@/components/admin/CreatePdfQuizPanel'
import DateTimePicker from '@/components/ui/DateTimePicker'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import Pagination from '@/components/ui/Pagination'

const STEP_LABELS = ['Basic Details', 'Questions', 'Preview']

const TYPE_LABELS = { MCQ: 'MCQ', APTITUDE: 'Aptitude', CODING: 'Coding', INTERVIEW_PREP: 'Interview', ADAPTIVE: 'Adaptive' }
const TYPE_STYLES = {
  MCQ:            'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40',
  APTITUDE:       'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  CODING:         'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  INTERVIEW_PREP: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  ADAPTIVE:       'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40',
}
const DIFFICULTY_STYLES = {
  EASY: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  HARD: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
}

const EMPTY_FORM = {
  title: '', description: '', type: '', difficulty: '',
  duration: '', passingScore: '', maxAttempts: '',
  courseId: '', batchId: '',
  randomQuestions: false, randomOptions: false, showExplanation: true,
  negativeMarking: false, resultVisibility: '',
  scheduledStart: '', scheduledEnd: '',
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${mm}m ${ss}s`
}

const STATUS_BADGE_STYLES = {
  DRAFT:     'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  SCHEDULED: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  LIVE:      'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  COMPLETED: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40',
  ARCHIVED:  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
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
  const [quizSearchInput, setQuizSearchInput] = useState('')
  const quizSearch = useDebouncedValue(quizSearchInput, 400)
  const quizzesAbortRef = useRef(null)
  const [activeTab, setActiveTab]   = useState('quizzes')
  const [questionSearch, setQuestionSearch] = useState('')
  const [pickerTopicFilter, setPickerTopicFilter] = useState('')
  const [pickerCourseFilter, setPickerCourseFilter] = useState('')
  const [pickerDifficultyFilter, setPickerDifficultyFilter] = useState('')
  const [pickerTypeFilter, setPickerTypeFilter] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [touched, setTouched] = useState({})
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
  const [deletingQuiz, setDeletingQuiz] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pdfPanelOpen, setPdfPanelOpen] = useState(false)
  const [attemptsQuiz, setAttemptsQuiz] = useState(null)
  const [quizAttempts, setQuizAttempts] = useState([])
  const [loadingAttempts, setLoadingAttempts] = useState(false)
  const [reviewingAttempt, setReviewingAttempt] = useState(null)
  const [attemptReview, setAttemptReview] = useState(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [reviewOpenIndex, setReviewOpenIndex] = useState({})
  const [editingQuizId, setEditingQuizId] = useState(null)
  const [originalQuestionIds, setOriginalQuestionIds] = useState([])
  const [originalStatus, setOriginalStatus] = useState('DRAFT')
  const [loadingEditQuiz, setLoadingEditQuiz] = useState(false)
  const [quizTotal, setQuizTotal] = useState(0)
  const [quizTotalPages, setQuizTotalPages] = useState(1)
  const [pdfQuizzes, setPdfQuizzes] = useState([])
  const [bankTotal, setBankTotal] = useState(0)
  const [bankTotalPages, setBankTotalPages] = useState(1)
  const bankQuestionCache = useRef(new Map())
  const pickerSearch = useDebouncedValue(questionSearch, 400)

  const cacheQuestions = (qs) => {
    qs.forEach(q => bankQuestionCache.current.set(q.id, q))
  }

  const fetchBankPage = () => {
    if (!panelOpen || step !== 1 || questionsView !== 'list' || editingQuizId) return
    quizService.listQuestions({
      active: true,
      search: pickerSearch.trim() || undefined,
      topicId: pickerTopicFilter || undefined,
      courseId: pickerCourseFilter || undefined,
      difficulty: pickerDifficultyFilter || undefined,
      questionType: pickerTypeFilter || undefined,
      page: pickerPage,
      limit: pickerPageSize,
    })
      .then(r => {
        const data = r.data
        const qs = data.questions || []
        setBankQuestions(qs)
        setBankTotal(data.total ?? 0)
        setBankTotalPages(data.totalPages ?? 1)
        cacheQuestions(qs)
      })
      .catch(() => {})
  }

  const loadPdfQuizzes = () => {
    quizService.listQuizzes({ sourcePdf: true, page: 1, limit: 100 })
      .then(r => setPdfQuizzes((r.data && r.data.quizzes) || []))
      .catch(() => {})
  }

  const load = () => {
    quizzesAbortRef.current?.abort()
    const controller = new AbortController()
    quizzesAbortRef.current = controller
    setLoading(true)
    quizService.listQuizzes({
      search: quizSearch.trim() || undefined,
      type: typeFilter || undefined,
      courseId: courseFilter || undefined,
      batchId: batchFilter || undefined,
      status: statusFilter || undefined,
      page: quizPage,
      limit: quizPageSize,
    }, { signal: controller.signal })
      .then(r => {
        const data = r.data
        setQuizzes((data && data.quizzes) || [])
        setQuizTotal((data && data.totalElements) ?? 0)
        setQuizTotalPages((data && data.totalPages) ?? 1)
      })
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return
        toast.error('Failed to load quizzes')
      })
      .finally(() => {
        if (quizzesAbortRef.current === controller) setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [quizSearch, typeFilter, courseFilter, batchFilter, statusFilter, quizPage, quizPageSize])

  useEffect(() => {
    fetchBankPage()
  }, [pickerSearch, pickerTopicFilter, pickerCourseFilter, pickerDifficultyFilter, pickerTypeFilter,
      pickerPage, pickerPageSize, panelOpen, step, questionsView, editingQuizId])

  useEffect(() => {
    loadPdfQuizzes()
    quizService.listTopics().then(r => setTopics(r.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
  }, [])

  const handleQuestionCreated = (newQuestion) => {
    setBankQuestions(prev => [newQuestion, ...prev])
    cacheQuestions([newQuestion])
    setSelectedQuestionIds(prev => [...prev, newQuestion.id])
    setQuestionsView('list')
  }

  const handleBulkQuestionsCreated = (newQuestions) => {
    setBankQuestions(prev => [...newQuestions, ...prev])
    cacheQuestions(newQuestions)
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
      loadPdfQuizzes()
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

  const handleViewAttempts = async (quiz) => {
    setAttemptsQuiz(quiz)
    setLoadingAttempts(true)
    try {
      const res = await quizService.getQuizAttempts(quiz.id)
      setQuizAttempts(res.data || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load results')
    } finally {
      setLoadingAttempts(false)
    }
  }

  const handleViewAttemptReview = async (attempt) => {
    if (!attemptsQuiz) return
    setReviewingAttempt(attempt)
    setReviewOpenIndex({})
    setLoadingReview(true)
    try {
      const res = await quizService.getAdminAttemptReview(attemptsQuiz.id, attempt.attemptId)
      setAttemptReview(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load review')
    } finally {
      setLoadingReview(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingQuiz) return
    setIsDeleting(true)
    try {
      await quizService.removeQuiz(deletingQuiz.id)
      toast.success('Quiz deleted')
      setDeletingQuiz(null)
      load()
      loadPdfQuizzes()
    } catch (err) {
      toast.error(err.message || 'Failed to delete quiz')
    } finally {
      setIsDeleting(false)
    }
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

  // Preserves selection/reorder order across server-paginated bank fetches (objects are cached by id).
  const selectedQuestions = selectedQuestionIds
    .map(id => bankQuestionCache.current.get(id))
    .filter(Boolean)
  const totalPoints = selectedQuestions.reduce((a, q) => a + (questionMarks[q.id] ?? q.points ?? 1), 0)

  const getFieldError = (field, val) => {
    if (field === 'title') {
      if (!val || !val.trim()) return 'Title is required'
      if (val.trim().length < 3) return 'Title must be at least 3 characters'
    }
    if (field === 'duration') {
      const num = Number(val)
      if (val === '' || val === null || val === undefined || isNaN(num) || num < 1) return 'Min 1 minute'
      if (num > 1440) return 'Max 1440 min'
    }
    if (field === 'passingScore') {
      const num = Number(val)
      if (val === '' || val === null || val === undefined || isNaN(num) || num < 0 || num > 100) return 'Between 0-100%'
    }
    if (field === 'maxAttempts') {
      const num = Number(val)
      if (val === '' || val === null || val === undefined || isNaN(num) || num < 1) return 'Min 1 attempt'
      if (num > 100) return 'Max 100 attempts'
    }
    if (field === 'scheduledEnd') {
      if (form.scheduledStart && val && new Date(form.scheduledStart) >= new Date(val)) {
        return 'End time must be after start time'
      }
    }
    return null
  }

  const isSettingsValid = Boolean(
    form.title?.trim() && form.title.trim().length >= 3 &&
    form.type && form.difficulty && form.resultVisibility &&
    form.duration !== '' && !isNaN(Number(form.duration)) && Number(form.duration) >= 1 && Number(form.duration) <= 1440 &&
    form.passingScore !== '' && !isNaN(Number(form.passingScore)) && Number(form.passingScore) >= 0 && Number(form.passingScore) <= 100 &&
    form.maxAttempts !== '' && !isNaN(Number(form.maxAttempts)) && Number(form.maxAttempts) >= 1 && Number(form.maxAttempts) <= 100 &&
    (!form.scheduledStart || !form.scheduledEnd || new Date(form.scheduledStart) < new Date(form.scheduledEnd))
  )
  const isAssignmentValid = Boolean(form.courseId || form.batchId || selectedBatchIds.length > 0 || selectedCourseIds.length > 0)
  const isDraftValid = isSettingsValid && selectedQuestionIds.length > 0
  const isPublishValid = isDraftValid && isAssignmentValid
  const isQuizFormDirty = Boolean(
    form.title || form.description || form.type || form.difficulty || form.resultVisibility ||
    form.duration || form.passingScore || form.maxAttempts ||
    form.courseId || form.batchId || selectedQuestionIds.length > 0
  )

  const validateSettings = () => {
    const errs = {}
    if (!form.title || !form.title.trim()) {
      errs.title = 'Title is required'
    } else if (form.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters'
    }

    if (!form.type) {
      errs.type = 'Quiz type is required'
    }

    if (!form.difficulty) {
      errs.difficulty = 'Difficulty is required'
    }

    if (!form.resultVisibility) {
      errs.resultVisibility = 'Result visibility is required'
    }

    const durationNum = Number(form.duration)
    if (form.duration === '' || form.duration === null || form.duration === undefined || isNaN(durationNum) || durationNum < 1) {
      errs.duration = 'Min 1 minute'
    } else if (durationNum > 1440) {
      errs.duration = 'Max 1440 min'
    }

    const scoreNum = Number(form.passingScore)
    if (form.passingScore === '' || form.passingScore === null || form.passingScore === undefined || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      errs.passingScore = 'Between 0-100%'
    }

    const attemptsNum = Number(form.maxAttempts)
    if (form.maxAttempts === '' || form.maxAttempts === null || form.maxAttempts === undefined || isNaN(attemptsNum) || attemptsNum < 1) {
      errs.maxAttempts = 'Min 1 attempt'
    } else if (attemptsNum > 100) {
      errs.maxAttempts = 'Max 100 attempts'
    }

    if (form.scheduledStart && form.scheduledEnd) {
      if (new Date(form.scheduledStart) >= new Date(form.scheduledEnd)) {
        errs.scheduledEnd = 'End time must be after start time'
      }
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingQuizId(null)
    setOriginalQuestionIds([])
    setOriginalStatus('DRAFT')
    setForm(EMPTY_FORM)
    setFormErrors({})
    setTouched({})
    setSelectedQuestionIds([])
    setQuestionMarks({})
    setSelectedBatchIds([])
    setSelectedCourseIds([])
    setPickerTopicFilter('')
    setPickerCourseFilter('')
    setPickerDifficultyFilter('')
    setPickerTypeFilter('')
    setQuestionSearch('')
    setPickerPage(1)
    setStep(0)
    setQuestionsView('list')
    setPanelOpen(true)
  }

  const openEdit = async (quiz) => {
    setLoadingEditQuiz(true)
    try {
      const res = await quizService.getQuiz(quiz.id)
      const full = res.data
      const qIds = (full.questions || []).map(qn => qn.id)
      const marks = {}
      ;(full.questions || []).forEach(qn => { marks[qn.id] = qn.points ?? 1 })

      setForm({
        title: full.title || '', description: full.description || '',
        type: full.type || '', difficulty: full.difficulty || '',
        duration: full.duration != null ? String(full.duration) : '',
        passingScore: full.passingScore != null ? String(full.passingScore) : '',
        maxAttempts: full.maxAttempts != null ? String(full.maxAttempts) : '',
        courseId: full.courseId != null ? String(full.courseId) : '',
        batchId: full.batchId != null ? String(full.batchId) : '',
        randomQuestions: !!full.randomQuestions, randomOptions: !!full.randomOptions,
        showExplanation: !!full.showExplanation, negativeMarking: !!full.negativeMarking,
        resultVisibility: full.resultVisibility || '',
        scheduledStart: full.scheduledStart || '', scheduledEnd: full.scheduledEnd || '',
      })
      setSelectedQuestionIds(qIds)
      setQuestionMarks(marks)
      setOriginalQuestionIds(qIds)
      setOriginalStatus(full.status || 'DRAFT')
      setEditingQuizId(full.id)
      setFormErrors({})
      setTouched({})
      setSelectedBatchIds([])
      setSelectedCourseIds([])
      setPickerTopicFilter('')
      setPickerCourseFilter('')
      setPickerDifficultyFilter('')
      setPickerTypeFilter('')
      setQuestionSearch('')
      setPickerPage(1)
      setStep(0)
      setQuestionsView('list')
      setPanelOpen(true)
      quizService.listQuestions({ active: true })
        .then(r => {
          const qs = r.data || []
          setBankQuestions(qs)
          cacheQuestions(qs)
        })
        .catch(() => {})
    } catch (err) {
      toast.error(err.message || 'Failed to load quiz for editing')
    } finally {
      setLoadingEditQuiz(false)
    }
  }

  const missingPublishRequirements = () => {
    const missing = []
    if (selectedQuestionIds.length === 0) missing.push('at least one question')
    if (!form.courseId && !form.batchId && !selectedBatchIds.length && !selectedCourseIds.length) {
      missing.push('an assignment to at least one batch or course')
    }
    return missing
  }

  const handleSave = async (publish = false) => {
    if (!validateSettings()) {
      setStep(0)
      toast.error('Please fix errors in quiz details')
      return
    }
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
        duration: Number(form.duration),
        passingScore: Number(form.passingScore),
        maxAttempts: Number(form.maxAttempts),
        courseId: form.courseId || null,
        batchId: form.batchId || null,
        scheduledStart: form.scheduledStart || null,
        scheduledEnd: form.scheduledEnd || null,
      }
      let quizId

      if (editingQuizId) {
        quizId = editingQuizId
        await quizService.updateQuiz(quizId, {
          ...payload,
          status: publish ? 'PUBLISHED' : originalStatus,
        })

        const removedIds = originalQuestionIds.filter(id => !selectedQuestionIds.includes(id))
        const addedIds = selectedQuestionIds.filter(id => !originalQuestionIds.includes(id))
        for (const id of removedIds) {
          await quizService.detachQuestion(quizId, id)
        }
        if (addedIds.length) {
          await quizService.attachQuestions(quizId, addedIds)
        }
        await quizService.reorderQuestions(quizId, selectedQuestionIds.map(id => ({
          questionId: id,
          marks: questionMarks[id] ?? null,
        })))
        // Batch/course assignment is managed separately via the "Assign" panel
        // (Users icon on each row) — intentionally not re-triggered here to
        // avoid creating duplicate assignment records.
      } else {
        const quiz = await quizService.createQuiz(payload)
        quizId = quiz.data.id
        await quizService.attachQuestions(quizId, selectedQuestionIds)
        await quizService.reorderQuestions(quizId, selectedQuestionIds.map(id => ({
          questionId: id,
          marks: questionMarks[id] ?? null,
        })))
        if (form.batchId) {
          await quizService.assignQuiz(quizId, { targetType: 'BATCH', targetIds: [Number(form.batchId)] })
        } else if (selectedBatchIds.length) {
          await quizService.assignQuiz(quizId, { targetType: 'BATCH', targetIds: selectedBatchIds })
        }
        if (form.courseId) {
          await quizService.assignQuiz(quizId, { targetType: 'COURSE', targetIds: [Number(form.courseId)] })
        } else if (selectedCourseIds.length) {
          await quizService.assignQuiz(quizId, { targetType: 'COURSE', targetIds: selectedCourseIds })
        }
        if (publish) {
          await quizService.updateQuiz(quizId, { ...payload, status: 'PUBLISHED' })
        }
      }

      toast.success(editingQuizId ? 'Quiz updated' : (publish ? 'Quiz published!' : 'Quiz saved as draft'))
      setPanelOpen(false); setStep(0)
      setEditingQuizId(null)
      setOriginalQuestionIds([])
      setOriginalStatus('DRAFT')
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
      loadPdfQuizzes()
    } catch (err) { toast.error(err.message || 'Failed to release results') }
  }

  // All filters/search/sort/pagination for the main table and the PDF list run through the
  // backend (see `load` and `loadPdfQuizzes`); no client-side re-filtering happens here.

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {panelOpen ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                <ClipboardList size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-display">
                  {editingQuizId ? 'Edit Quiz' : 'Create New Quiz'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Configure assessment parameters, select questions from the bank, and schedule publishing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setPanelOpen(false); setStep(0); setQuestionsView('list'); }}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold transition-colors"
            >
              ← Back to Quizzes
            </button>
          </div>

          {/* Steps Indicator */}
          <div className="flex gap-2 max-w-xl">
            {STEP_LABELS.map((l, i) => (
              <button
                key={l}
                type="button"
                onClick={() => setStep(i)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-center flex items-center justify-center gap-2 ${
                  step === i
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === i ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {i + 1}
                </span>
                {l}
              </button>
            ))}
          </div>

          {/* Step 0: Settings */}
          {step === 0 && (
            <div className="space-y-6">
              {/* Card 1: Basic Information */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  <FileText size={14} /> Basic Information
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onBlur={() => setTouched(t => ({ ...t, title: true }))}
                    onChange={e => {
                      setForm(f => ({ ...f, title: e.target.value }))
                      if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }))
                    }}
                    placeholder="Enter quiz title"
                    className={`w-full rounded-xl border bg-white dark:bg-gray-900 px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
                      (touched.title || formErrors.title) && getFieldError('title', form.title)
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500 text-gray-800 dark:text-white'
                    }`}
                  />
                  {(touched.title || formErrors.title) && getFieldError('title', form.title) && (
                    <p className="text-xs text-red-500 mt-1">{getFieldError('title', form.title)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Enter quiz description"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-800 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Quiz Type *</label>
                    <CustomSelect
                      value={form.type}
                      onChange={(val) => {
                        setForm(f => ({ ...f, type: val }))
                        if (formErrors.type) setFormErrors(prev => ({ ...prev, type: undefined }))
                      }}
                      placeholder="Select quiz type"
                      options={[
                        { value: 'MCQ', label: 'MCQ' },
                        { value: 'APTITUDE', label: 'Aptitude' },
                        { value: 'CODING', label: 'Coding' },
                        { value: 'INTERVIEW_PREP', label: 'Interview Prep' },
                        { value: 'ADAPTIVE', label: 'Adaptive' },
                      ]}
                    />
                    {formErrors.type && <p className="text-xs text-red-500 mt-1">{formErrors.type}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Difficulty *</label>
                    <CustomSelect
                      value={form.difficulty}
                      onChange={(val) => {
                        setForm(f => ({ ...f, difficulty: val }))
                        if (formErrors.difficulty) setFormErrors(prev => ({ ...prev, difficulty: undefined }))
                      }}
                      placeholder="Select difficulty"
                      options={[
                        { value: 'EASY', label: 'Easy' },
                        { value: 'MEDIUM', label: 'Medium' },
                        { value: 'HARD', label: 'Hard' },
                      ]}
                    />
                    {formErrors.difficulty && <p className="text-xs text-red-500 mt-1">{formErrors.difficulty}</p>}
                  </div>
                </div>
              </div>

              {/* Card 2: Course & Cohort Target */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  <Users size={14} /> Course & Cohort Target
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Course</label>
                    <CustomSelect
                      value={form.courseId}
                      onChange={(val) => {
                        setForm(f => {
                          const stillValid = f.batchId && batches.some(b => String(b.id) === String(f.batchId) && String(b.course?.id) === String(val))
                          return { ...f, courseId: val, batchId: stillValid ? f.batchId : '' }
                        })
                      }}
                      options={courses.map(c => ({ value: c.id, label: c.title || c.name }))}
                      placeholder="All courses"
                      searchable
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Batch</label>
                    <CustomSelect
                      value={form.batchId}
                      onChange={(val) => setForm(f => ({ ...f, batchId: val }))}
                      options={batches
                        .filter(b => !form.courseId || String(b.course?.id) === String(form.courseId))
                        .map(b => ({ value: b.id, label: b.name }))}
                      placeholder="All batches"
                      searchable
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Duration & Score Criteria */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  <BarChart3 size={14} /> Duration & Scoring Parameters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Duration (min) *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter duration (min)"
                      value={form.duration}
                      onBlur={() => setTouched(t => ({ ...t, duration: true }))}
                      onKeyDown={e => {
                        if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault()
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        setForm(f => ({ ...f, duration: val }))
                        if (formErrors.duration) setFormErrors(prev => ({ ...prev, duration: undefined }))
                      }}
                      className={`w-full rounded-xl border bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
                        (touched.duration || formErrors.duration) && getFieldError('duration', form.duration)
                          ? 'border-red-500 focus:ring-red-400'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500 text-gray-800 dark:text-white'
                      }`}
                    />
                    {(touched.duration || formErrors.duration) && getFieldError('duration', form.duration) && (
                      <p className="text-xs text-red-500 mt-1">{getFieldError('duration', form.duration)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Passing Score (%) *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 60"
                      value={form.passingScore}
                      onBlur={() => setTouched(t => ({ ...t, passingScore: true }))}
                      onKeyDown={e => {
                        if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault()
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        setForm(f => ({ ...f, passingScore: val }))
                        if (formErrors.passingScore) setFormErrors(prev => ({ ...prev, passingScore: undefined }))
                      }}
                      className={`w-full rounded-xl border bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
                        (touched.passingScore || formErrors.passingScore) && getFieldError('passingScore', form.passingScore)
                          ? 'border-red-500 focus:ring-red-400'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500 text-gray-800 dark:text-white'
                      }`}
                    />
                    {(touched.passingScore || formErrors.passingScore) && getFieldError('passingScore', form.passingScore) && (
                      <p className="text-xs text-red-500 mt-1">{getFieldError('passingScore', form.passingScore)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Max Attempts *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 1"
                      value={form.maxAttempts}
                      onBlur={() => setTouched(t => ({ ...t, maxAttempts: true }))}
                      onKeyDown={e => {
                        if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault()
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        setForm(f => ({ ...f, maxAttempts: val }))
                        if (formErrors.maxAttempts) setFormErrors(prev => ({ ...prev, maxAttempts: undefined }))
                      }}
                      className={`w-full rounded-xl border bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
                        (touched.maxAttempts || formErrors.maxAttempts) && getFieldError('maxAttempts', form.maxAttempts)
                          ? 'border-red-500 focus:ring-red-400'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500 text-gray-800 dark:text-white'
                      }`}
                    />
                    {(touched.maxAttempts || formErrors.maxAttempts) && getFieldError('maxAttempts', form.maxAttempts) && (
                      <p className="text-xs text-red-500 mt-1">{getFieldError('maxAttempts', form.maxAttempts)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 4: Schedule & Policies */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  <CheckCircle size={14} /> Schedule & Examination Policies
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Start Date/Time</label>
                    <DateTimePicker
                      value={form.scheduledStart}
                      onChange={val => setForm(f => ({ ...f, scheduledStart: val }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">End Date/Time</label>
                    <DateTimePicker
                      value={form.scheduledEnd}
                      onChange={val => setForm(f => ({ ...f, scheduledEnd: val }))}
                    />
                    {form.scheduledStart && form.scheduledEnd && new Date(form.scheduledStart) >= new Date(form.scheduledEnd) && (
                      <p className="text-xs text-red-500 mt-1">End time must be after start time</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Result Visibility *</label>
                  <CustomSelect
                    value={form.resultVisibility}
                    onChange={(val) => {
                      setForm(f => ({ ...f, resultVisibility: val }))
                      if (formErrors.resultVisibility) setFormErrors(prev => ({ ...prev, resultVisibility: undefined }))
                    }}
                    placeholder="Select result visibility"
                    options={[
                      { value: 'IMMEDIATE', label: 'Show result immediately' },
                      { value: 'AFTER_CLOSE', label: 'Show result after quiz closes' },
                      { value: 'MANUAL', label: 'Release result manually' },
                    ]}
                  />
                  {formErrors.resultVisibility && <p className="text-xs text-red-500 mt-1">{formErrors.resultVisibility}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <input type="checkbox" checked={form.randomQuestions} onChange={e => setForm(f => ({ ...f, randomQuestions: e.target.checked }))}
                      className="w-4 h-4 rounded accent-purple-600" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Randomize question order</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <input type="checkbox" checked={form.randomOptions} onChange={e => setForm(f => ({ ...f, randomOptions: e.target.checked }))}
                      className="w-4 h-4 rounded accent-purple-600" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Randomize option order</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <input type="checkbox" checked={form.negativeMarking} onChange={e => setForm(f => ({ ...f, negativeMarking: e.target.checked }))}
                      className="w-4 h-4 rounded accent-purple-600" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Negative marking</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <input type="checkbox" checked={form.showExplanation} onChange={e => setForm(f => ({ ...f, showExplanation: e.target.checked }))}
                      className="w-4 h-4 rounded accent-purple-600" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Show explanations after submit</span>
                  </label>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => { setPanelOpen(false); setStep(0); setQuestionsView('list'); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-md shadow-purple-500/20 transition-all"
                >
                  Next: Add Questions →
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Questions (from the Question Bank) */}
          {step === 1 && questionsView === 'list' && editingQuizId && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                <span className="mt-0.5 shrink-0">ℹ️</span>
                <span>Questions cannot be changed while editing an existing quiz. To change which questions are included, create a new quiz.</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedQuestionIds.length} question{selectedQuestionIds.length === 1 ? '' : 's'}</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {selectedQuestionIds.map((id, idx) => {
                  const q = bankQuestions.find(bq => bq.id === id)
                  const pts = questionMarks[id] ?? q?.points ?? 1
                  return (
                    <div key={id} className="p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white break-words">{q?.questionText || `Question #${id}`}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                        {pts} pt{pts > 1 ? 's' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold transition-colors"
                >
                  ← Back to Settings
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-md shadow-purple-500/20 transition-all"
                >
                  Preview & Review →
                </button>
              </div>
            </div>
          )}

          {step === 1 && questionsView === 'list' && !editingQuizId && (() => {
            const totalPickerPages = Math.max(1, bankTotalPages)
            const validPickerPage = Math.min(pickerPage, totalPickerPages)
            const pickerStartIndex = (validPickerPage - 1) * pickerPageSize
            const pickerEndIndex = pickerStartIndex + bankQuestions.length
            const paginatedPickerQuestions = bankQuestions

            const pageIds = paginatedPickerQuestions.map(q => q.id)
            const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedQuestionIds.includes(id))

            const selectPageAll = () => {
              setSelectedQuestionIds(prev => {
                const newIds = pageIds.filter(id => !prev.includes(id))
                return [...prev, ...newIds]
              })
            }
            const deselectPageAll = () => {
              setSelectedQuestionIds(prev => prev.filter(id => !pageIds.includes(id)))
            }
            const deselectAll = () => {
              setSelectedQuestionIds([])
            }

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedQuestionIds.length} questions selected</p>
                  <div className="flex items-center gap-2">
                    {selectedQuestionIds.length > 0 && (
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 dark:border-red-900 rounded-lg px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        Deselect All
                      </button>
                    )}
                    {bankQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={allPageSelected ? deselectPageAll : selectPageAll}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors border ${
                          allPageSelected
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {allPageSelected ? 'Deselect This Page' : `Select Page (${bankQuestions.length})`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setQuestionsView('create')}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 border border-purple-200 dark:border-purple-800 rounded-lg px-2.5 py-1 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                    >
                      + New Question
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionsView('bulkCreate')}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 border border-purple-200 dark:border-purple-800 rounded-lg px-2.5 py-1 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                    >
                      + Bulk Add
                    </button>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={questionSearch}
                      onChange={e => { setQuestionSearch(e.target.value); setPickerPage(1); }}
                      placeholder="Search questions..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <CustomSelect
                    value={pickerTopicFilter}
                    onChange={v => { setPickerTopicFilter(v); setPickerPage(1); }}
                    options={[{ value: '', label: 'All Topics' }, ...topics.map(t => ({ value: t.id, label: t.name }))]}
                    placeholder="All Topics"
                  />
                  <CustomSelect
                    value={pickerCourseFilter}
                    onChange={v => { setPickerCourseFilter(v); setPickerPage(1); }}
                    options={[{ value: '', label: 'All Courses' }, ...courses.map(c => ({ value: c.id, label: c.title || c.name }))]}
                    placeholder="All Courses"
                  />
                  <CustomSelect
                    value={pickerDifficultyFilter}
                    onChange={v => { setPickerDifficultyFilter(v); setPickerPage(1); }}
                    options={[{ value: '', label: 'All Difficulties' }, { value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]}
                    placeholder="All Difficulties"
                  />
                  <CustomSelect
                    value={pickerTypeFilter}
                    onChange={v => { setPickerTypeFilter(v); setPickerPage(1); }}
                    options={[{ value: '', label: 'All Types' }, { value: 'MCQ', label: 'MCQ' }, { value: 'APTITUDE', label: 'Aptitude' }, { value: 'CODING', label: 'Coding' }, { value: 'INTERVIEW_PREP', label: 'Interview' }, { value: 'ADAPTIVE', label: 'Adaptive' }]}
                    placeholder="All Types"
                  />
                </div>

                {/* Questions List */}
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {paginatedPickerQuestions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                      No questions match the selected filters.
                    </div>
                  ) : (
                    paginatedPickerQuestions.map(q => {
                      const isSelected = selectedQuestionIds.includes(q.id)
                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestion(q.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isSelected
                              ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-purple-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded accent-purple-600 shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white break-words">{q.questionText}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                              {q.topic && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-medium">{q.topic}</span>}
                              {q.difficulty && <span className={`px-2 py-0.5 rounded-md font-medium ${DIFFICULTY_STYLES[q.difficulty] || ''}`}>{q.difficulty}</span>}
                              {q.type && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">{q.type}</span>}
                              <span className="text-gray-400">{q.points ?? 1} pt(s)</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2">
                  <span>Showing {pickerStartIndex + 1}–{pickerEndIndex} of {bankTotal}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerPage(p => Math.max(1, p - 1))}
                      disabled={validPickerPage <= 1}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="font-bold px-1.5 text-gray-700 dark:text-gray-200">{validPickerPage} / {totalPickerPages}</span>
                    <button
                      type="button"
                      onClick={() => setPickerPage(p => Math.min(totalPickerPages, p + 1))}
                      disabled={validPickerPage >= totalPickerPages}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold transition-colors"
                  >
                    ← Back to Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-md shadow-purple-500/20 transition-all"
                  >
                    Preview & Publish →
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Step 1: Questions — inline single question creation view */}
          {step === 1 && questionsView === 'create' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setQuestionsView('list')}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
              >
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
              <button
                type="button"
                onClick={() => setQuestionsView('list')}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
              >
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
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_STYLES[form.type] || TYPE_STYLES.MCQ}`}>
                    {TYPE_LABELS[form.type] || form.type}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[form.difficulty] || ''}`}>{form.difficulty}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-gray-800 dark:text-white">{form.title || 'Untitled Quiz'}</h3>
                {form.description && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{form.description}</p>}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full font-semibold">{selectedQuestionIds.length} questions</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-semibold">{form.duration} minutes</span>
                  <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-semibold">Total: {totalPoints} pts</span>
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2.5 py-1 rounded-full font-semibold">Pass: {form.passingScore}%</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-semibold">Max attempts: {form.maxAttempts}</span>
                </div>
              </div>

              {/* Questions Preview List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-purple-600" /> Questions Preview ({selectedQuestions.length})
                </h4>

                {selectedQuestions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    No questions selected. Go back to Step 2 to select questions.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {selectedQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white">{q.questionText}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={1}
                              value={questionMarks[q.id] ?? q.points ?? 1}
                              onChange={e => setQuestionMark(q.id, e.target.value)}
                              className="w-14 text-xs font-bold text-center rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 py-1"
                            />
                            <button
                              type="button"
                              onClick={() => moveQuestion(q.id, -1)}
                              disabled={idx === 0}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 flex items-center justify-center text-xs"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(q.id, 1)}
                              disabled={idx === selectedQuestions.length - 1}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 flex items-center justify-center text-xs"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleQuestion(q.id)}
                              className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center text-sm font-bold"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pl-8">
                            {q.options.map((o, oIdx) => (
                              <div key={o.id || oIdx} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${o.correct ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 font-medium' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800'}`}>
                                <span>{o.correct ? '✓' : '•'}</span>
                                <span className="break-words">{o.optionText}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold transition-colors"
                >
                  ← Back to Questions
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving || !isDraftValid}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? 'Saving...' : (editingQuizId ? 'Save Changes' : 'Save Draft')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving || !isPublishValid}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? 'Publishing...' : (editingQuizId ? 'Save & Publish' : 'Publish Quiz')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
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
        {activeTab === 'pdf-quiz' && (
          <button onClick={() => setPdfPanelOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus size={16} /> Create Quiz from PDF
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {[
          { id: 'quizzes', label: 'Quizzes' },
          { id: 'question-bank', label: 'Question Bank' },
          { id: 'pdf-quiz', label: 'Quiz' },
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

      {activeTab === 'question-bank' && <QuestionBankPanel onChange={fetchBankPage} />}

      {activeTab === 'pdf-quiz' && (
        pdfQuizzes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Build a quiz from an uploaded PDF — the backend extracts the questions, you review and edit them,
              then save as a draft or publish. The original PDF is kept private and is never shown to students.
            </p>
            <button onClick={() => setPdfPanelOpen(true)}
              className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={16} /> Create Quiz from PDF
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pdfQuizzes.map(q => {
              const published = q.status === 'PUBLISHED'
              return (
                <div key={q.id} className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                    <FileText size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-gray-800 dark:text-white break-words">{q.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE_STYLES[q.effectiveStatus] || STATUS_BADGE_STYLES.DRAFT}`}>
                        {q.effectiveStatus || (published ? 'LIVE' : 'DRAFT')}
                      </span>
                    </div>
                    {q.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{q.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <ClipboardList size={12} className="text-purple-500" /> {q.totalQuestions} questions
                      </span>
                      {q.duration != null && (
                        <span className="inline-flex items-center gap-1">
                          🕒 {q.duration}m
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[q.type] || TYPE_STYLES.MCQ}`}>
                        {TYPE_LABELS[q.type] || q.type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[q.difficulty]}`}>{q.difficulty}</span>
                      <span className="inline-flex items-center gap-1">
                        📅 {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    {published ? (
                      <button onClick={() => handleViewAttempts(q)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 text-xs font-semibold transition-colors" title="View Results">
                        <ClipboardList size={13} /> Results
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600 px-1">Publish to see results</span>
                    )}
                    <button onClick={() => handleViewQuiz(q)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 text-xs font-semibold transition-colors" title="View">
                      <Eye size={13} /> View
                    </button>
                    <button onClick={() => openEdit(q)} disabled={loadingEditQuiz}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 text-xs font-semibold transition-colors disabled:opacity-50" title="Edit Quiz">
                      {loadingEditQuiz ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />} Edit
                    </button>
                    {q.resultVisibility === 'MANUAL' && !q.resultsReleased && (
                      <button onClick={() => handleReleaseResults(q)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 text-xs font-semibold transition-colors" title="Release Results">
                        <Send size={13} /> Release Results
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {activeTab === 'quizzes' && (
      <>
      {/* Search + Filters Toolbar Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={quizSearchInput}
              onChange={e => { setQuizSearchInput(e.target.value); setQuizPage(1); }}
              placeholder="Search quizzes by title..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <CustomSelect
              value={courseFilter}
              onChange={(val) => { setCourseFilter(val); setQuizPage(1); }}
              options={courses.map(c => ({ value: c.id, label: c.title }))}
              placeholder="All Courses"
              searchable
              compact
            />
            <CustomSelect
              value={batchFilter}
              onChange={(val) => { setBatchFilter(val); setQuizPage(1); }}
              options={batches.map(b => ({ value: b.id, label: b.name }))}
              placeholder="All Batches"
              searchable
              compact
            />
            <CustomSelect
              value={typeFilter}
              onChange={(val) => { setTypeFilter(val); setQuizPage(1); }}
              options={[
                { value: 'MCQ', label: 'MCQ' },
                { value: 'APTITUDE', label: 'Aptitude' },
                { value: 'CODING', label: 'Coding' },
                { value: 'INTERVIEW_PREP', label: 'Interview Prep' },
              ]}
              placeholder="All Types"
              compact
            />
            <CustomSelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setQuizPage(1); }}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'LIVE', label: 'Live' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              placeholder="All Statuses"
              compact
            />
          </div>
        </div>
      </div>


      {/* Quiz Table */}
      {(() => {
        // The current page's rows come straight from the backend response; server returns
        // the matching page for the active filters. No client-side slicing here.
        const paginatedQuizzes = quizzes

        return (
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
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
                            <td className="px-3 py-3 font-semibold text-gray-800 dark:text-white break-words">{q.title}</td>
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
                                   {q.courseName && <span className="break-words">{q.courseName}</span>}
                                   {q.batchName && <span className="text-gray-400 break-words">{q.batchName}</span>}
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
                                <button onClick={() => openEdit(q)} disabled={loadingEditQuiz} className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 flex items-center justify-center transition-colors disabled:opacity-50" title="Edit Quiz">
                                  {loadingEditQuiz ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
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
                                <button onClick={() => setDeletingQuiz(q)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
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

                <Pagination
                  data={quizzes}
                  total={quizTotal}
                  totalPages={quizTotalPages}
                  page={quizPage}
                  pageSize={quizPageSize}
                  onPageChange={setQuizPage}
                  onPageSizeChange={(v) => { setQuizPageSize(v); setQuizPage(1); }}
                  pageSizeOptions={[10, 25, 50]}
                  label="quizzes"
                />
              </div>
            )}
          </div>
        )
      })()}
      </>
      )}

      {/* Quiz Details View SlidePanel */}
      <SlidePanel open={!!viewingQuiz} onClose={() => setViewingQuiz(null)} title="Quiz Details" width="w-[600px]" variant="modal">
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

            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Settings</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Course</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{viewingQuiz.courseName || 'All courses'}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Batch</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{viewingQuiz.batchName || 'All batches'}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Result Visibility</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">
                    {{ IMMEDIATE: 'Immediately', AFTER_CLOSE: 'After quiz closes', MANUAL: 'Manual release' }[viewingQuiz.resultVisibility] || viewingQuiz.resultVisibility || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Results Released</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{viewingQuiz.resultsReleased ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Start Date/Time</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{viewingQuiz.scheduledStart ? new Date(viewingQuiz.scheduledStart).toLocaleString() : 'Not scheduled'}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">End Date/Time</p>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{viewingQuiz.scheduledEnd ? new Date(viewingQuiz.scheduledEnd).toLocaleString() : 'Not scheduled'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { flag: viewingQuiz.randomQuestions, label: 'Randomize questions' },
                  { flag: viewingQuiz.randomOptions, label: 'Randomize options' },
                  { flag: viewingQuiz.showExplanation, label: 'Show explanations' },
                  { flag: viewingQuiz.negativeMarking, label: 'Negative marking' },
                ].filter(s => s.flag).map(s => (
                  <span key={s.label} className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                    ✓ {s.label}
                  </span>
                ))}
                {![viewingQuiz.randomQuestions, viewingQuiz.randomOptions, viewingQuiz.showExplanation, viewingQuiz.negativeMarking].some(Boolean) && (
                  <span className="text-[10px] text-gray-400">No optional settings enabled</span>
                )}
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
      <SlidePanel open={!!analyticsQuiz} onClose={() => { setAnalyticsQuiz(null); setQuizAnalytics(null) }} title="Quiz Analytics" width="w-[420px]" variant="modal">
        {analyticsQuiz && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{analyticsQuiz.title}</h3>
            {loadingAnalytics ? (
              <div className="space-y-3">{[0,1].map(i => <div key={i} className="h-16 glass-card animate-pulse" />)}</div>
            ) : quizAnalytics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Quiz Results SlidePanel — list of submitted attempts for a Published PDF quiz */}
      <SlidePanel open={!!attemptsQuiz} onClose={() => { setAttemptsQuiz(null); setQuizAttempts([]) }} title="Results" width="w-[560px]" variant="modal">
        {attemptsQuiz && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{attemptsQuiz.title}</h3>
            {loadingAttempts ? (
              <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 glass-card animate-pulse" />)}</div>
            ) : quizAttempts.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 border border-dashed rounded-xl">No submissions yet.</div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {quizAttempts.map(a => (
                  <div key={a.attemptId} className="glass-card p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{a.studentName}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Attempt #{a.attemptNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {a.passed ? 'PASS' : 'FAIL'}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatDuration(a.timeTaken)}</span>
                        <span className="text-[10px] text-gray-400">
                          {a.completedAt ? new Date(a.completedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold text-purple-600">{a.score}/{a.totalScore}</span>
                      <button onClick={() => handleViewAttemptReview(a)}
                        className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 text-xs font-semibold transition-colors">
                        View Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Attempt Review SlidePanel — per-question answer review for one student's attempt */}
      <SlidePanel open={!!reviewingAttempt} onClose={() => { setReviewingAttempt(null); setAttemptReview(null) }}
        title={reviewingAttempt ? `Review — ${reviewingAttempt.studentName}` : 'Review'}
        subtitle={reviewingAttempt ? `Attempt #${reviewingAttempt.attemptNumber}` : undefined} width="w-[560px]" variant="modal">
        {loadingReview ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 glass-card animate-pulse" />)}</div>
        ) : attemptReview ? (
          <div className="space-y-4">
            <div className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-xl font-extrabold text-purple-600 font-display">{attemptReview.score}/{attemptReview.totalScore}</p>
                <p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">Total Score</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${attemptReview.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {attemptReview.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>

            <div className="space-y-2">
              {attemptReview.review?.map((b, i) => {
                const ungraded = b.correct === null || b.correct === undefined
                return (
                  <div key={b.questionId} className={`rounded-xl border overflow-hidden ${
                    ungraded ? 'border-gray-200 dark:border-gray-700' : b.correct ? 'border-green-200 dark:border-green-800/50' : 'border-red-200 dark:border-red-800/50'
                  }`}>
                    <button onClick={() => setReviewOpenIndex(prev => ({ ...prev, [i]: !prev[i] }))}
                      className={`w-full text-left px-3.5 py-3 flex items-center gap-3 ${
                        ungraded ? 'bg-gray-50 dark:bg-gray-800/50' : b.correct ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
                      }`}>
                      {ungraded
                        ? <FileText size={15} className="text-gray-400 shrink-0" />
                        : b.correct
                          ? <CheckCircle size={15} className="text-green-500 shrink-0" />
                          : <AlertCircle size={15} className="text-red-500 shrink-0" />
                      }
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 flex-1 line-clamp-1">
                        Q{i + 1}. {b.questionText}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 shrink-0">{b.pointsEarned}/{b.points ?? 1}</span>
                      <ChevronRight size={14} className={`text-gray-400 transition-transform shrink-0 ${reviewOpenIndex[i] ? 'rotate-90' : ''}`} />
                    </button>
                    {reviewOpenIndex[i] && (
                      <div className="px-3.5 py-3 space-y-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <p className="text-[10px] text-gray-400 font-semibold mb-0.5">Student's Answer</p>
                          <p className="text-xs text-gray-700 dark:text-gray-200">
                            {b.yourAnswers?.length > 0 ? b.yourAnswers.join(', ') : '(no answer)'}
                          </p>
                        </div>
                        {b.correctAnswers?.length > 0 && (
                          <div className="rounded-lg px-3 py-2 border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10">
                            <p className="text-[10px] text-green-600 font-semibold mb-0.5">Correct Answer</p>
                            <p className="text-xs text-gray-700 dark:text-gray-200">{b.correctAnswers.join(', ')}</p>
                          </div>
                        )}
                        {b.explanation && <p className="text-[11px] text-gray-400 italic">{b.explanation}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No data</p>
        )}
      </SlidePanel>

      {/* Assign Quiz SlidePanel */}
      <SlidePanel open={!!assigningQuiz} onClose={() => { setAssigningQuiz(null); setQuizAssignments([]) }} title="Assign Quiz" width="w-[460px]" variant="modal">
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

      <DeleteConfirmModal
        isOpen={Boolean(deletingQuiz)}
        onClose={() => setDeletingQuiz(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Quiz?"
        itemName={deletingQuiz?.title}
        loading={isDeleting}
      />

      {/* Create Quiz from PDF SlidePanel — fully separate from the Quizzes-tab wizard above */}
      <SlidePanel open={pdfPanelOpen} onClose={() => setPdfPanelOpen(false)} title="Create Quiz from PDF" width="w-[680px]" variant="modal">
        <CreatePdfQuizPanel
          topics={topics}
          courses={courses}
          batches={batches}
          onTopicsChange={setTopics}
          onCreated={() => { load(); loadPdfQuizzes() }}
          onClose={() => setPdfPanelOpen(false)}
        />
      </SlidePanel>
      </>
      )}
    </div>
  )
}
