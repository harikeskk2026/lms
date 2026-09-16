'use client'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import { questionSchema, QUESTION_TYPES, QUESTION_DIFFICULTIES, FORCE_FREE_TEXT_TYPES } from '@/validations/questionValidation'
import CustomSelect from '@/components/ui/CustomSelect'

const SINGLE_CORRECT_TYPES = ['MCQ', 'TRUE_FALSE']

const EMPTY_FORM = {
  topicId: '',
  courseId: '',
  questionText: '',
  questionType: 'MCQ',
  answerMode: 'OPTIONS',
  difficulty: 'MEDIUM',
  explanation: '',
  codeSnippet: '',
  correctAnswerText: '',
  referenceAnswer: '',
  answerLanguage: '',
  points: 1,
  options: [
    { optionText: '', correct: true },
    { optionText: '', correct: false },
  ],
}

const TYPE_DISPLAY_NAMES = {
  MCQ: 'MCQ (Single Choice)',
  MULTIPLE_CORRECT: 'MULTIPLE_CORRECT (Multi-Select)',
  TRUE_FALSE: 'TRUE_FALSE (True/False)',
  CODE_OUTPUT: 'CODE_OUTPUT',
  DEBUGGING: 'DEBUGGING',
  SCENARIO: 'SCENARIO',
  SQL: 'SQL',
  INTERVIEW: 'INTERVIEW',
  SHORT_ANSWER: 'SHORT_ANSWER (Text Input)',
}

// Shared create/edit question form. Used both by the Question Bank tab and by
// "Quick Add Question" inside the Quiz Builder, so a new question (or a new
// topic) can be created without losing whatever the caller was already doing.
export default function QuestionForm({
  topics = [], courses = [], onTopicsChange, defaultValues, editingId, onSaved, onCancel,
  showTopic = true, showCodeSnippet = true, showCourse = true, showDifficulty = true, typeOptions = QUESTION_TYPES,
}) {
  const [saving, setSaving] = useState(false)
  const [newTopicOpen, setNewTopicOpen] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [creatingTopic, setCreatingTopic] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm({ resolver: zodResolver(questionSchema), defaultValues: defaultValues || EMPTY_FORM, mode: 'onChange' })

  useEffect(() => {
    reset(defaultValues || EMPTY_FORM)
  }, [defaultValues, reset])

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'options' })
  const questionType = watch('questionType')
  const answerMode = watch('answerMode')
  const options = watch('options')
  const isSingleCorrect = SINGLE_CORRECT_TYPES.includes(questionType)
  const isFreeText = answerMode === 'FREE_TEXT'

  // Question type dictates the answer mode — keep them in sync so switching
  // type never leaves a stale/impossible combination. SHORT_ANSWER is the
  // only FREE_TEXT type; every other type (including SQL) is always OPTIONS.
  useEffect(() => {
    setValue('answerMode', FORCE_FREE_TEXT_TYPES.includes(questionType) ? 'FREE_TEXT' : 'OPTIONS')
  }, [questionType, setValue])

  // The options array always carries validation rules (every option needs
  // non-empty text), even while the Options section is hidden for a free-text
  // question. Leftover blank options from a previous OPTIONS-mode edit (or the
  // 2 blanks every new question starts with) would silently fail that hidden
  // validation and block submit with no visible error. Clearing them out when
  // entering FREE_TEXT — and restoring 2 blanks when returning to OPTIONS with
  // none left — keeps the (always-active) options validation in sync with what
  // the admin can actually see and edit.
  useEffect(() => {
    if (isFreeText) {
      if (options?.length) {
        replace([])
      }
    } else if (!options?.length) {
      replace([{ optionText: '', correct: true }, { optionText: '', correct: false }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeText])

  function selectSingleCorrect(index) {
    options.forEach((_, i) => setValue(`options.${i}.correct`, i === index))
  }

  async function handleCreateTopic() {
    if (!newTopicName.trim()) return
    setCreatingTopic(true)
    try {
      const res = await quizService.createTopic({ name: newTopicName.trim() })
      const topic = res.data
      onTopicsChange?.([...topics, topic])
      setValue('topicId', topic.id)
      setNewTopicName('')
      setNewTopicOpen(false)
      toast.success('Topic created')
    } catch (err) {
      toast.error(err.message || 'Failed to create topic')
    } finally {
      setCreatingTopic(false)
    }
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      const payload = {
        ...data,
        topicId: data.topicId === '' || data.topicId === undefined || data.topicId === null ? null : Number(data.topicId),
        courseId: data.courseId === '' ? null : Number(data.courseId),
        options: data.answerMode === 'FREE_TEXT' ? [] : data.options,
        correctAnswerText: data.answerMode === 'FREE_TEXT' ? data.correctAnswerText : null,
        referenceAnswer: null,
        answerLanguage: null,
      }
      let saved
      if (editingId) {
        saved = await quizService.updateQuestion(editingId, { ...payload, active: true })
        toast.success('Question updated')
      } else {
        saved = await quizService.createQuestion(payload)
        toast.success('Question created')
      }
      onSaved?.(saved.data)
    } catch (err) {
      toast.error(err.message || 'Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Question Text *</label>
        <textarea {...register('questionText')} rows={3}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        {errors.questionText && <span className="text-xs text-red-500 mt-1 block">{errors.questionText.message}</span>}
      </div>

      <div className={showDifficulty ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
          <CustomSelect
            value={watch('questionType')}
            onChange={(val) => setValue('questionType', val)}
            options={typeOptions.map(t => ({ value: t, label: TYPE_DISPLAY_NAMES[t] || t }))}
          />
        </div>
        {showDifficulty && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty *</label>
            <CustomSelect
              value={watch('difficulty')}
              onChange={(val) => setValue('difficulty', val)}
              options={QUESTION_DIFFICULTIES.map(d => ({ value: d, label: d }))}
            />
          </div>
        )}
      </div>

      {(showTopic || showCourse) && (
      <div className={showTopic && showCourse ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
        {showTopic && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-700">Topic</label>
              <button type="button" onClick={() => setNewTopicOpen(o => !o)}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-0.5">
                <Plus size={12} /> New
              </button>
            </div>
            {newTopicOpen ? (
              <div className="flex items-center gap-1.5">
                <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Topic name"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                <button type="button" onClick={handleCreateTopic} disabled={creatingTopic || !newTopicName.trim()}
                  className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold disabled:opacity-50">
                  Add
                </button>
              </div>
            ) : (
              <CustomSelect
                value={watch('topicId')}
                onChange={(val) => setValue('topicId', val)}
                options={topics.map(t => ({ value: t.id, label: t.name }))}
                placeholder="No topic"
              />
            )}
          </div>
        )}
        {showCourse && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Course *</label>
            <CustomSelect
              value={watch('courseId')}
              onChange={(val) => setValue('courseId', val)}
              options={courses.map(c => ({ value: c.id, label: c.title || c.name }))}
              placeholder="Select Course"
            />
            {errors.courseId && <span className="text-xs text-red-500 mt-1 block">{errors.courseId.message}</span>}
          </div>
        )}
      </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Points *</label>
        <input type="number" min={1} {...register('points')}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        {errors.points && <span className="text-xs text-red-500 mt-1 block">{errors.points.message}</span>}
      </div>

      {showCodeSnippet && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Code Snippet</label>
          <textarea {...register('codeSnippet')} rows={2} placeholder="Optional"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        </div>
      )}

      {isFreeText ? (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Correct Answer *</label>
          <input {...register('correctAnswerText')} placeholder="Expected answer (matched case/whitespace-insensitively)"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          {errors.correctAnswerText && <span className="text-xs text-red-500 mt-1 block">{errors.correctAnswerText.message}</span>}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-semibold text-gray-700">Options *</label>
            <button type="button" onClick={() => append({ optionText: '', correct: false })}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700">+ Add Option</button>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            {isSingleCorrect ? 'Select the one correct option.' : 'Check every correct option.'}
          </p>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type={isSingleCorrect ? 'radio' : 'checkbox'}
                  checked={!!options?.[index]?.correct}
                  onChange={() => isSingleCorrect ? selectSingleCorrect(index) : setValue(`options.${index}.correct`, !options?.[index]?.correct)}
                  className="w-4 h-4 accent-purple-600 shrink-0"
                />
                <input {...register(`options.${index}.optionText`)} placeholder={`Option ${index + 1}`}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                )}
              </div>
            ))}
          </div>
          {errors.options?.message && <span className="text-xs text-red-500 mt-1 block">{errors.options.message}</span>}
          {errors.options?.root?.message && <span className="text-xs text-red-500 mt-1 block">{errors.options.root.message}</span>}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Explanation</label>
        <textarea {...register('explanation')} rows={2} placeholder="Shown to students after they submit"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || isSubmitting || !isValid}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20"
        >
          {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Question'}
        </button>
      </div>
    </form>
  )
}
