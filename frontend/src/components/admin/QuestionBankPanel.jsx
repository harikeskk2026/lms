'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Eye, Search, Upload, FileText, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import courseService from '@/services/courseService'
import { QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/validations/questionValidation'
import SlidePanel from '@/components/admin/SlidePanel'
import QuestionForm from '@/components/admin/QuestionForm'
import BulkQuestionForm from '@/components/admin/BulkQuestionForm'
import ExcelCsvImporter from '@/components/admin/ExcelCsvImporter'
import PdfQuestionImporter from '@/components/admin/PdfQuestionImporter'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
}

const TYPE_BADGES = {
  MCQ: 'bg-purple-100 text-purple-700',
  MULTIPLE_CORRECT: 'bg-indigo-100 text-indigo-700 font-bold',
  TRUE_FALSE: 'bg-blue-100 text-blue-700',
  CODE_OUTPUT: 'bg-emerald-100 text-emerald-700',
  DEBUGGING: 'bg-amber-100 text-amber-700',
  SCENARIO: 'bg-rose-100 text-rose-700',
  SQL: 'bg-cyan-100 text-cyan-700',
  INTERVIEW: 'bg-yellow-100 text-yellow-700',
}

// Question Bank management, embedded as a tab inside the Quizzes page (not a
// separate sidebar module) — questions created here are reusable across quizzes.
export default function QuestionBankPanel({ onChange }) {
  const [questions, setQuestions] = useState([])
  const [topics, setTopics] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false)
  const [importPanelOpen, setImportPanelOpen] = useState(false)
  const [pdfImportPanelOpen, setPdfImportPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingDefaults, setEditingDefaults] = useState(null)
  const [previewing, setPreviewing] = useState(null)
  const [analyticsQuestion, setAnalyticsQuestion] = useState(null)
  const [questionAnalytics, setQuestionAnalytics] = useState(null)
  const [loadingQAnalytics, setLoadingQAnalytics] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkActioning, setBulkActioning] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteModal, setDeleteModal] = useState({ open: false, question: null, isBulk: false, loading: false })

  const [filters, setFilters] = useState({ topicId: '', courseId: '', difficulty: '', questionType: '', active: '', search: '' })

  const load = useCallback(() => {
    setLoading(true)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    quizService.listQuestions(query)
      .then(r => {
        setQuestions(r.data || [])
        setSelectedIds([])
      })
      .catch(err => toast.error(err.message || 'Failed to load questions'))
      .finally(() => setLoading(false))
  }, [filters])

  const loadTopics = useCallback(() => {
    quizService.listTopics().then(r => setTopics(r.data || [])).catch(() => {})
  }, [])

  const loadCourses = useCallback(() => {
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadTopics() }, [loadTopics])
  useEffect(() => { loadCourses() }, [loadCourses])

  function openCreate() {
    setEditingId(null)
    setEditingDefaults(null)
    setPanelOpen(true)
  }

  function handleBulkSaved() {
    setBulkPanelOpen(false)
    load()
    onChange?.()
  }

  function openEdit(question) {
    setEditingId(question.id)
    setEditingDefaults({
      topicId: question.topicId ?? '',
      courseId: question.courseId ?? '',
      questionText: question.questionText,
      questionType: question.questionType,
      difficulty: question.difficulty,
      explanation: question.explanation || '',
      codeSnippet: question.codeSnippet || '',
      points: question.points,
      options: question.options.map(o => ({ optionText: o.optionText, correct: o.correct })),
    })
    setPanelOpen(true)
  }

  function handleSaved() {
    setPanelOpen(false)
    load()
    onChange?.()
  }

  async function handleViewQuestionAnalytics(question) {
    setAnalyticsQuestion(question)
    setLoadingQAnalytics(true)
    try {
      const res = await quizService.getAdminQuestionAnalytics(question.id)
      setQuestionAnalytics(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load analytics')
    } finally {
      setLoadingQAnalytics(false)
    }
  }

  async function handleDelete(question) {
    setDeleteModal({ open: true, question, isBulk: false, loading: false })
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    setDeleteModal({ open: true, question: null, isBulk: true, loading: false })
  }

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      if (deleteModal.isBulk) {
        setBulkActioning(true)
        await Promise.all(selectedIds.map(id => quizService.deleteQuestion(id)))
        toast.success(`${selectedIds.length} questions deleted`)
        setSelectedIds([])
      } else {
        await quizService.deleteQuestion(deleteModal.question.id)
        toast.success('Question deleted')
      }
      load()
      onChange?.()
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setBulkActioning(false)
      setDeleteModal({ open: false, question: null, isBulk: false, loading: false })
    }
  }

  const totalPages = Math.ceil(questions.length / pageSize) || 1
  const validCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (validCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, questions.length)
  const paginatedQuestions = questions.slice(startIndex, endIndex)

  const toggleSelectAll = () => {
    const pageIds = paginatedQuestions.map(q => q.id)
    const allPageSelected = pageIds.every(id => selectedIds.includes(id))
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500">Reusable quiz questions, shared across quizzes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportPanelOpen(true)}
            className="flex items-center gap-1.5 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-purple-100 transition-colors"
          >
            <Upload size={15} /> Upload CSV / Excel
          </button>
          <button
            onClick={() => setPdfImportPanelOpen(true)}
            className="flex items-center gap-1.5 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-purple-100 transition-colors"
          >
            <FileText size={15} /> Upload PDF
          </button>
          <button
            onClick={() => setBulkPanelOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-sm"
          >
            <Plus size={16} /> Add Question
          </button>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search question text..."
            value={filters.search}
            onChange={e => {
              setFilters(f => ({ ...f, search: e.target.value }))
              setCurrentPage(1)
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select value={filters.topicId} onChange={e => { setFilters(f => ({ ...f, topicId: e.target.value })); setCurrentPage(1); }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Topics</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filters.courseId} onChange={e => { setFilters(f => ({ ...f, courseId: e.target.value })); setCurrentPage(1); }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title || c.name}</option>)}
        </select>
        <select value={filters.difficulty} onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value })); setCurrentPage(1); }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Difficulties</option>
          {QUESTION_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.questionType} onChange={e => { setFilters(f => ({ ...f, questionType: e.target.value })); setCurrentPage(1); }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Types</option>
          {QUESTION_TYPES.map(t => <option key={t} value={t}>{t === 'MULTIPLE_CORRECT' ? 'MULTIPLE_CORRECT (Multi-Select)' : t}</option>)}
        </select>
        <select value={filters.active} onChange={e => { setFilters(f => ({ ...f, active: e.target.value })); setCurrentPage(1); }}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-900 dark:text-purple-200 animate-fadeIn">
          <span className="font-semibold">
            {selectedIds.length} question{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={bulkActioning}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              {bulkActioning ? 'Deleting...' : `Bulk Delete (${selectedIds.length})`}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-semibold"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 glass-card animate-pulse" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-card p-8 sm:p-16 text-center text-gray-400">No questions match these filters.</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 font-semibold w-10">
                    <input
                      type="checkbox"
                      checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedIds.includes(q.id))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Difficulty</th>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Points</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuestions.map(q => (
                  <tr key={q.id} className={`border-b border-gray-50 dark:border-gray-800/50 ${selectedIds.includes(q.id) ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={() => toggleSelectOne(q.id)}
                        className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-800 dark:text-gray-100 font-medium">{q.questionText}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGES[q.questionType] || 'bg-gray-100 text-gray-600'}`}>
                        {q.questionType === 'MULTIPLE_CORRECT' ? 'Multi-Select' : q.questionType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{q.topicName || '—'}</td>
                    <td className="px-4 py-3">
                      {q.courseName ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          {q.courseName}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{q.points}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {q.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setPreviewing(q)} title="Preview"
                          className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center"><Eye size={14} /></button>
                        <button onClick={() => openEdit(q)} title="Edit"
                          className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center"><Pencil size={14} /></button>
                        <button onClick={() => handleViewQuestionAnalytics(q)} title="Analytics"
                          className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center"><BarChart3 size={14} /></button>
                        <button onClick={() => handleDelete(q)} title="Delete"
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:ring-2 focus:ring-purple-500 text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-white font-semibold"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2 font-medium">
                Showing {questions.length > 0 ? startIndex + 1 : 0}–{endIndex} of {questions.length} questions
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                        validCurrentPage === p
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center transition-colors"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Question' : 'Add Question'} width="w-full sm:w-[480px] lg:w-[560px]">
        <QuestionForm
          topics={topics}
          courses={courses}
          onTopicsChange={setTopics}
          defaultValues={editingDefaults}
          editingId={editingId}
          onSaved={handleSaved}
          onCancel={() => setPanelOpen(false)}
        />
      </SlidePanel>

      <SlidePanel open={bulkPanelOpen} onClose={() => setBulkPanelOpen(false)} title="Batch Add Questions" width="w-full sm:w-[480px] lg:w-[680px]">
        <BulkQuestionForm
          topics={topics}
          courses={courses}
          onSaved={handleBulkSaved}
          onCancel={() => setBulkPanelOpen(false)}
        />
      </SlidePanel>

      <SlidePanel open={importPanelOpen} onClose={() => setImportPanelOpen(false)} title="Upload Questions (CSV / Excel)" width="w-full sm:w-[480px] lg:w-[680px]">
        <ExcelCsvImporter
          topics={topics}
          courses={courses}
          onImported={() => {
            setImportPanelOpen(false)
            load()
            loadTopics()
            loadCourses()
            onChange?.()
          }}
          onCancel={() => setImportPanelOpen(false)}
        />
      </SlidePanel>

      <SlidePanel open={pdfImportPanelOpen} onClose={() => setPdfImportPanelOpen(false)} title="Upload Questions (PDF)" width="w-full sm:w-[480px] lg:w-[680px]">
        <PdfQuestionImporter
          topics={topics}
          courses={courses}
          onImported={() => {
            setPdfImportPanelOpen(false)
            load()
            loadTopics()
            loadCourses()
            onChange?.()
          }}
          onCancel={() => setPdfImportPanelOpen(false)}
        />
      </SlidePanel>

      <SlidePanel open={!!previewing} onClose={() => setPreviewing(null)} title="Preview" width="w-full sm:w-[480px]">
        {previewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGES[previewing.questionType] || 'bg-gray-100 text-gray-600'}`}>
                {previewing.questionType === 'MULTIPLE_CORRECT' ? 'Multi-Select' : previewing.questionType}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[previewing.difficulty]}`}>{previewing.difficulty}</span>
              {previewing.courseName && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {previewing.courseName}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{previewing.questionText}</p>
            {previewing.codeSnippet && (
              <pre className="text-xs bg-gray-900 text-gray-100 rounded-xl p-3 overflow-x-auto font-mono">{previewing.codeSnippet}</pre>
            )}
            <div className="space-y-1.5">
              {previewing.options.map(o => (
                <div key={o.id} className={`text-sm rounded-xl px-3 py-2 border flex items-center justify-between ${o.correct ? 'border-green-300 bg-green-50 text-green-700 font-semibold' : 'border-gray-200 text-gray-600'}`}>
                  <span>{o.optionText}</span>
                  {o.correct && <span className="text-xs text-green-600">✓ Correct</span>}
                </div>
              ))}
            </div>
            {previewing.explanation && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{previewing.explanation}</div>
            )}
          </div>
        )}
      </SlidePanel>

      <SlidePanel open={!!analyticsQuestion} onClose={() => { setAnalyticsQuestion(null); setQuestionAnalytics(null) }} title="Question Analytics" width="w-full sm:w-[380px]">
        {analyticsQuestion && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{analyticsQuestion.questionText}</p>
            {loadingQAnalytics ? (
              <div className="space-y-3">{[0,1].map(i => <div key={i} className="h-16 glass-card animate-pulse" />)}</div>
            ) : questionAnalytics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Attempts', val: questionAnalytics.attempts },
                  { label: 'Correct', val: questionAnalytics.correct },
                  { label: 'Wrong', val: questionAnalytics.wrong },
                  { label: 'Accuracy', val: `${questionAnalytics.accuracy}%` },
                  { label: 'Avg Time', val: `${Math.round(questionAnalytics.averageTimeSeconds)}s` },
                ].map(s => (
                  <div key={s.label} className="glass-card p-3 text-center">
                    <p className="text-lg font-extrabold text-indigo-600 font-display">{s.val}</p>
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

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => !deleteModal.loading && setDeleteModal({ open: false, question: null, isBulk: false, loading: false })}
        onConfirm={confirmDelete}
        loading={deleteModal.loading}
        title={deleteModal.isBulk ? `Delete ${selectedIds.length} Questions?` : 'Delete Question?'}
        message={
          deleteModal.isBulk
            ? `You are about to permanently delete ${selectedIds.length} selected question(s). This action cannot be undone.`
            : deleteModal.question
              ? `Are you sure you want to delete "${deleteModal.question.questionText.slice(0, 80)}${deleteModal.question.questionText.length > 80 ? '...' : ''}"? This action cannot be undone.`
              : undefined
        }
        confirmLabel={deleteModal.isBulk ? `Delete ${selectedIds.length} Questions` : 'Delete Question'}
      />
    </div>
  )
}

