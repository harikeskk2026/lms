'use client'
import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import { QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/validations/questionValidation'

const SINGLE_CORRECT_TYPES = ['MCQ', 'TRUE_FALSE']

const TYPE_DISPLAY_NAMES = {
  MCQ: 'MCQ (Single Choice)',
  MULTIPLE_CORRECT: 'MULTIPLE_CORRECT (Multi-Select)',
  TRUE_FALSE: 'TRUE_FALSE (True/False)',
  CODE_OUTPUT: 'CODE_OUTPUT',
  DEBUGGING: 'DEBUGGING',
  SCENARIO: 'SCENARIO',
  SQL: 'SQL',
  INTERVIEW: 'INTERVIEW',
}

function createEmptyQuestion(index = 1) {
  return {
    tempId: Date.now() + Math.random(),
    questionText: '',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    topicId: '',
    points: 1,
    codeSnippet: '',
    explanation: '',
    isCollapsed: false,
    options: [
      { optionText: '', correct: true },
      { optionText: '', correct: false },
      { optionText: '', correct: false },
      { optionText: '', correct: false },
    ],
  }
}

export default function BulkQuestionForm({ topics = [], onSaved, onCancel }) {
  const [questions, setQuestions] = useState([
    createEmptyQuestion(1),
    createEmptyQuestion(2),
  ])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function updateQuestion(index, field, value) {
    setQuestions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Reset radio vs checkbox option correctness if switching to single-correct
      if (field === 'questionType' && SINGLE_CORRECT_TYPES.includes(value)) {
        let foundOne = false
        next[index].options = next[index].options.map(opt => {
          if (opt.correct && !foundOne) {
            foundOne = true
            return opt
          }
          return { ...opt, correct: false }
        })
        if (!foundOne && next[index].options.length > 0) {
          next[index].options[0].correct = true
        }
      }
      return next
    })
  }

  function updateOption(qIndex, oIndex, field, value) {
    setQuestions(prev => {
      const next = [...prev]
      const q = { ...next[qIndex] }
      const isSingle = SINGLE_CORRECT_TYPES.includes(q.questionType)
      const opts = q.options.map((opt, i) => {
        if (i === oIndex) {
          return { ...opt, [field]: value }
        }
        if (field === 'correct' && value === true && isSingle) {
          return { ...opt, correct: false }
        }
        return opt
      })
      q.options = opts
      next[qIndex] = q
      return next
    })
  }

  function addOption(qIndex) {
    setQuestions(prev => {
      const next = [...prev]
      const q = { ...next[qIndex] }
      q.options = [...q.options, { optionText: '', correct: false }]
      next[qIndex] = q
      return next
    })
  }

  function removeOption(qIndex, oIndex) {
    setQuestions(prev => {
      const next = [...prev]
      const q = { ...next[qIndex] }
      if (q.options.length <= 1) return prev
      q.options = q.options.filter((_, i) => i !== oIndex)
      next[qIndex] = q
      return next
    })
  }

  function addQuestionCard() {
    setQuestions(prev => [...prev, createEmptyQuestion(prev.length + 1)])
  }

  function removeQuestionCard(index) {
    if (questions.length <= 1) {
      toast.error('At least one question is required')
      return
    }
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  function toggleCollapse(index) {
    setQuestions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], isCollapsed: !next[index].isCollapsed }
      return next
    })
  }

  function validate() {
    const errMap = {}
    let isValid = true

    questions.forEach((q, qIdx) => {
      const qErrs = {}
      if (!q.questionText.trim()) {
        qErrs.questionText = 'Question text is required'
        isValid = false
      }
      if (!q.points || q.points < 1) {
        qErrs.points = 'Points must be at least 1'
        isValid = false
      }
      if (!q.options || q.options.length < 1) {
        qErrs.options = 'At least one option is required'
        isValid = false
      } else {
        const emptyOpt = q.options.some(o => !o.optionText.trim())
        if (emptyOpt) {
          qErrs.options = 'All option texts must be filled out'
          isValid = false
        }
        const correctCount = q.options.filter(o => o.correct).length
        const isSingle = SINGLE_CORRECT_TYPES.includes(q.questionType)
        if (isSingle && correctCount !== 1) {
          qErrs.options = 'Single choice questions must have exactly 1 correct option'
          isValid = false
        } else if (!isSingle && correctCount < 1) {
          qErrs.options = 'Multi-select questions must have at least 1 correct option'
          isValid = false
        }
      }
      if (Object.keys(qErrs).length > 0) {
        errMap[qIdx] = qErrs
      }
    })

    setErrors(errMap)
    return isValid
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix validation errors before saving')
      // Auto expand questions with errors
      setQuestions(prev => prev.map((q, i) => errors[i] ? { ...q, isCollapsed: false } : q))
      return
    }

    setSaving(true)
    try {
      const payloads = questions.map(q => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        difficulty: q.difficulty,
        topicId: q.topicId === '' ? null : Number(q.topicId),
        points: Number(q.points),
        codeSnippet: q.codeSnippet || '',
        explanation: q.explanation || '',
        options: q.options.map(o => ({ optionText: o.optionText.trim(), correct: !!o.correct })),
      }))

      const results = await Promise.all(payloads.map(p => quizService.createQuestion(p)))
      const createdQuestions = results.map(r => r.data)

      toast.success(`${createdQuestions.length} questions created successfully!`)
      onSaved?.(createdQuestions)
    } catch (err) {
      toast.error(err.message || 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">Add Questions</h2>
        <p className="text-xs text-gray-500">Add one or more questions in a single form.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
        {questions.map((q, qIndex) => {
          const qErrs = errors[qIndex] || {}
          const isSingle = SINGLE_CORRECT_TYPES.includes(q.questionType)

          return (
            <div
              key={q.tempId}
              className={`rounded-2xl border transition-all ${
                qErrs.questionText || qErrs.options
                  ? 'border-red-300 bg-red-50/20'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
              } p-4 space-y-3`}
            >
              {/* Question Header Card */}
              <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => toggleCollapse(qIndex)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {qIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {q.questionText || `Untitled Question ${qIndex + 1}`}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                    {q.questionType}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(qIndex)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    {q.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestionCard(qIndex)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Remove question"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Form Card Body */}
              {!q.isCollapsed && (
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      rows={2}
                      value={q.questionText}
                      onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                      placeholder="Enter question statement..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none dark:text-white"
                    />
                    {qErrs.questionText && <span className="text-xs text-red-500 mt-0.5 block">{qErrs.questionText}</span>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                      <select
                        value={q.questionType}
                        onChange={e => updateQuestion(qIndex, 'questionType', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                      >
                        {QUESTION_TYPES.map(t => (
                          <option key={t} value={t}>{TYPE_DISPLAY_NAMES[t] || t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty *</label>
                      <select
                        value={q.difficulty}
                        onChange={e => updateQuestion(qIndex, 'difficulty', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                      >
                        {QUESTION_DIFFICULTIES.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Points *</label>
                      <input
                        type="number"
                        min={1}
                        value={q.points}
                        onChange={e => updateQuestion(qIndex, 'points', Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Options List */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Options *</label>
                      <button
                        type="button"
                        onClick={() => addOption(qIndex)}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                      >
                        + Add Option
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">
                      {isSingle ? 'Select the single correct option.' : 'Check all options that are correct (multi-select).'}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type={isSingle ? 'radio' : 'checkbox'}
                            name={`q_${q.tempId}_options`}
                            checked={!!opt.correct}
                            onChange={e => updateOption(qIndex, oIndex, 'correct', isSingle ? true : e.target.checked)}
                            className="w-4 h-4 accent-purple-600 shrink-0 cursor-pointer"
                          />
                          <input
                            placeholder={`Option ${oIndex + 1}`}
                            value={opt.optionText}
                            onChange={e => updateOption(qIndex, oIndex, 'optionText', e.target.value)}
                            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                          />
                          {q.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, oIndex)}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {qErrs.options && <span className="text-xs text-red-500 mt-1 block">{qErrs.options}</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={addQuestionCard}
          className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <Plus size={14} /> Add Another Question
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-semibold shadow-md hover:from-purple-700 hover:to-violet-700 disabled:opacity-60"
          >
            {saving ? 'Saving Questions...' : `Save All ${questions.length} Questions`}
          </button>
        </div>
      </div>
    </form>
    </div>
  )
}
