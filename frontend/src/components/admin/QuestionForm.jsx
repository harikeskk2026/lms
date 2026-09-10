'use client'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import { questionSchema, QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/validations/questionValidation'

const SINGLE_CORRECT_TYPES = ['MCQ', 'TRUE_FALSE']

const EMPTY_FORM = {
  topicId: '',
  courseId: '',
  questionText: '',
  questionType: 'MCQ',
  difficulty: 'MEDIUM',
  explanation: '',
  codeSnippet: '',
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
}

// Shared create/edit question form. Used both by the Question Bank tab and by
// "Quick Add Question" inside the Quiz Builder, so a new question (or a new
// topic) can be created without losing whatever the caller was already doing.
export default function QuestionForm({ topics = [], courses = [], onTopicsChange, defaultValues, editingId, onSaved, onCancel }) {
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
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(questionSchema), defaultValues: defaultValues || EMPTY_FORM })

  useEffect(() => {
    reset(defaultValues || EMPTY_FORM)
  }, [defaultValues, reset])

  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const questionType = watch('questionType')
  const options = watch('options')
  const isSingleCorrect = SINGLE_CORRECT_TYPES.includes(questionType)

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
        topicId: data.topicId === '' ? null : Number(data.topicId),
        courseId: data.courseId === '' ? null : Number(data.courseId),
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
          <select {...register('questionType')}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            {QUESTION_TYPES.map(t => <option key={t} value={t}>{TYPE_DISPLAY_NAMES[t] || t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty *</label>
          <select {...register('difficulty')}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            {QUESTION_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <select {...register('topicId')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">No topic</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Course *</label>
          <select {...register('courseId')}
            className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 ${
              errors.courseId ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'
            }`}>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title || c.name}</option>)}
          </select>
          {errors.courseId && <span className="text-xs text-red-500 mt-1 block">{errors.courseId.message}</span>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Points *</label>
        <input type="number" min={1} {...register('points')}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        {errors.points && <span className="text-xs text-red-500 mt-1 block">{errors.points.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Code Snippet</label>
        <textarea {...register('codeSnippet')} rows={2} placeholder="Optional"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
      </div>

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

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Explanation</label>
        <textarea {...register('explanation')} rows={2} placeholder="Shown to students after they submit"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
          Cancel
        </button>
        <button type="submit" disabled={saving || isSubmitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
          {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Question'}
        </button>
      </div>
    </form>
  )
}
