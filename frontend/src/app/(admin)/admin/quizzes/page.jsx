'use client'
import { useState, useEffect } from 'react'
import { Plus, BarChart2, Trash2, ChevronUp, ChevronDown, Eye, Trophy, Star } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import SlidePanel from '@/components/admin/SlidePanel'
import { useRouter } from 'next/navigation'

const STEP_LABELS = ['Settings', 'Questions', 'Preview']

const TYPE_LABELS = { MCQ: 'MCQ', APTITUDE: 'Aptitude', CODING: 'Coding', INTERVIEW_PREP: 'Interview' }
const TYPE_STYLES = {
  MCQ:            'bg-purple-100 text-purple-700',
  APTITUDE:       'bg-blue-100 text-blue-700',
  CODING:         'bg-green-100 text-green-700',
  INTERVIEW_PREP: 'bg-yellow-100 text-yellow-700',
}

const emptyQuestion = () => ({
  text: '', type: 'MCQ', options: [
    { text: '', isCorrect: false }, { text: '', isCorrect: false },
    { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ], marks: 1, explanation: '', topic: '', difficulty: 'MEDIUM', codeSnippet: ''
})

export default function QuizzesPage() {
  const router = useRouter()
  const [quizzes, setQuizzes]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [courses, setCourses]       = useState([])
  const [batches, setBatches]       = useState([])
  const [panelOpen, setPanelOpen]   = useState(false)
  const [step, setStep]             = useState(0)
  const [resultsPanel, setResultsPanel] = useState(null)
  const [results, setResults]       = useState([])
  const [saving, setSaving]         = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', courseId: '', batchId: '',
    duration: 30, totalMarks: 10, passMark: 5, dueDate: '',
    quizType: 'MCQ', category: '', tags: '', isFeatured: false
  })
  const [questions, setQuestions] = useState([emptyQuestion()])

  const load = () => {
    setLoading(true)
    adminApi.getQuizzes().then(r => setQuizzes(r.data.data || [])).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminApi.getCourses().then(r => setCourses(r.data.data || [])).catch(() => {})
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  const handlePublish = async (id, current) => {
    try {
      if (!current) {
        await adminApi.publishQuiz(id)
        toast.success('Quiz published — students notified')
      } else {
        await adminApi.updateQuiz(id, { isPublished: false })
        toast.success('Quiz unpublished')
      }
      load()
    } catch { toast.error('Failed') }
  }

  const handleFeaturedToggle = async (id, current) => {
    try {
      await adminApi.updateQuiz(id, { isFeatured: !current })
      toast.success(current ? 'Removed from featured' : 'Marked as featured')
      load()
    } catch { toast.error('Failed') }
  }

  const loadResults = async (id) => {
    setResultsPanel(id)
    const r = await adminApi.getQuizResults(id)
    setResults(r.data.data || [])
  }

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }
  const updateOption = (qIdx, oIdx, field, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = q.options.map((o, j) => {
        if (j !== oIdx) return field === 'isCorrect' ? { ...o, isCorrect: false } : o
        return { ...o, [field]: value }
      })
      return { ...q, options: opts }
    }))
  }
  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx))
  const moveQuestion = (idx, dir) => {
    setQuestions(prev => {
      const arr = [...prev]
      const to = idx + dir
      if (to < 0 || to >= arr.length) return arr
      ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
      return arr
    })
  }

  const computedTotalMarks = questions.reduce((a, q) => a + Number(q.marks || 1), 0)

  const handleSave = async (publish = false) => {
    setSaving(true)
    try {
      const serialized = questions.map((q, i) => ({
        text: q.text, type: q.type || 'MCQ',
        options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
        marks: parseInt(q.marks) || 1, order: i, explanation: q.explanation || null,
        topic: q.topic || null, difficulty: q.difficulty || 'MEDIUM',
        codeSnippet: q.codeSnippet || null
      }))
      const quiz = await adminApi.createQuiz({
        ...form,
        totalMarks: computedTotalMarks,
        questions: serialized,
        isFeatured: form.isFeatured,
      })
      if (publish) await adminApi.publishQuiz(quiz.data.data.id)
      toast.success(publish ? 'Quiz published!' : 'Quiz saved as draft')
      setPanelOpen(false); setStep(0)
      setForm({ title: '', description: '', courseId: '', batchId: '', duration: 30, totalMarks: 10, passMark: 5, dueDate: '', quizType: 'MCQ', category: '', tags: '', isFeatured: false })
      setQuestions([emptyQuestion()])
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length) : 0
  const passRate = results.length ? Math.round(results.filter(r => r.passed).length / results.length * 100) : 0

  const filtered = typeFilter ? quizzes.filter(q => q.quizType === typeFilter) : quizzes

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Quizzes</h1>
        <button onClick={() => { setPanelOpen(true); setStep(0) }}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ['MCQ', 'MCQ'], ['APTITUDE', 'Aptitude'], ['CODING', 'Coding'], ['INTERVIEW_PREP', 'Interview Prep']].map(([val, label]) => (
          <button key={val} onClick={() => setTypeFilter(val)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${typeFilter === val ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Quiz Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100 dark:bg-purple-900/20 dark:border-purple-900/30">
                  {['Title', 'Type', 'Category', 'Questions', 'Duration', 'Due', 'Published', 'Attempts', 'Featured', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No quizzes</td></tr>
                ) : (
                  filtered.map(q => (
                    <tr key={q.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50/20 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="px-3 py-3 font-semibold text-gray-800 dark:text-white max-w-[160px] truncate">{q.title}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[q.quizType] || TYPE_STYLES.MCQ}`}>
                          {TYPE_LABELS[q.quizType] || q.quizType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{q.category || '—'}</td>
                      <td className="px-3 py-3"><span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{q._count?.questions || 0}</span></td>
                      <td className="px-3 py-3 text-xs text-gray-500">{q.duration}m</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{q.dueDate ? format(new Date(q.dueDate), 'dd MMM') : '—'}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => handlePublish(q.id, q.isPublished)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${q.isPublished ? 'bg-purple-500' : 'bg-gray-200'}`}>
                          <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow" style={{ transform: q.isPublished ? 'translateX(18px)' : 'translateX(2px)' }} />
                        </button>
                      </td>
                      <td className="px-3 py-3"><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{q._count?.attempts || 0}</span></td>
                      <td className="px-3 py-3">
                        <button onClick={() => handleFeaturedToggle(q.id, q.isFeatured)}
                          className={`text-gray-400 hover:text-yellow-500 transition-colors ${q.isFeatured ? 'text-yellow-500' : ''}`}>
                          <Star size={15} className={q.isFeatured ? 'fill-yellow-400' : ''} />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => loadResults(q.id)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center" title="Results">
                            <BarChart2 size={13} />
                          </button>
                          <button onClick={() => router.push(`/admin/quizzes/${q.id}/leaderboard`)} className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center" title="Leaderboard">
                            <Trophy size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quiz Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setStep(0) }} title="Create Quiz" width="w-[600px]">
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
                <select value={form.quizType} onChange={e => setForm(f => ({ ...f, quizType: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="MCQ">MCQ</option>
                  <option value="APTITUDE">Aptitude</option>
                  <option value="CODING">Coding</option>
                  <option value="INTERVIEW_PREP">Interview Prep</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Python, DSA, HR…"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course</label>
                <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
                <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (min)</label>
                <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pass Mark</label>
                <input type="number" value={form.passMark} onChange={e => setForm(f => ({ ...f, passMark: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="python, oop, interview"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
                className="w-4 h-4 rounded accent-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Mark as Featured</span>
              <span className="text-[10px] text-gray-400">(shown prominently on student hub)</span>
            </label>
            <button onClick={() => setStep(1)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold">
              Next: Add Questions →
            </button>
          </div>
        )}

        {/* Step 1: Questions */}
        {step === 1 && (
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-purple-600 uppercase">Q{qi + 1}</p>
                  <div className="flex gap-1">
                    <button onClick={() => moveQuestion(qi, -1)} className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center"><ChevronUp size={12} /></button>
                    <button onClick={() => moveQuestion(qi, 1)} className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center"><ChevronDown size={12} /></button>
                    <button onClick={() => removeQuestion(qi)} className="w-6 h-6 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12} /></button>
                  </div>
                </div>
                <textarea value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)} placeholder="Question text..." rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                <div className="grid grid-cols-3 gap-2">
                  <select value={q.type} onChange={e => updateQuestion(qi, 'type', e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="MCQ">MCQ</option>
                    <option value="TRUE_FALSE">True/False</option>
                  </select>
                  <select value={q.difficulty} onChange={e => updateQuestion(qi, 'difficulty', e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Marks</label>
                    <input type="number" min="1" value={q.marks} onChange={e => updateQuestion(qi, 'marks', e.target.value)}
                      className="w-14 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={q.topic} onChange={e => updateQuestion(qi, 'topic', e.target.value)} placeholder="Topic (optional)"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  <input value={q.codeSnippet || ''} onChange={e => updateQuestion(qi, 'codeSnippet', e.target.value)} placeholder="Code snippet (optional)"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                {q.type === 'MCQ' && (
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" checked={o.isCorrect} onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                          className="w-4 h-4 accent-purple-600" />
                        <input value={o.text} onChange={e => updateOption(qi, oi, 'text', e.target.value)} placeholder={`Option ${oi + 1}`}
                          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'TRUE_FALSE' && (
                  <div className="flex gap-3">
                    {['True', 'False'].map((label, oi) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={q.options[oi]?.isCorrect} onChange={() => updateOption(qi, oi, 'isCorrect', true)} className="accent-purple-600" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                )}
                <input value={q.explanation || ''} onChange={e => updateQuestion(qi, 'explanation', e.target.value)} placeholder="Explanation (shown after submission)"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            ))}
            <button onClick={() => setQuestions(prev => [...prev, emptyQuestion()])}
              className="w-full py-2 rounded-xl border-2 border-dashed border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-colors">
              + Add Question
            </button>
            <button onClick={() => setStep(2)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold">
              Preview & Publish →
            </button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[form.quizType] || TYPE_STYLES.MCQ}`}>
                  {TYPE_LABELS[form.quizType] || form.quizType}
                </span>
                {form.category && <span className="text-xs text-gray-500">{form.category}</span>}
                {form.isFeatured && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">★ Featured</span>}
              </div>
              <h3 className="font-display font-bold text-gray-800">{form.title || 'Untitled Quiz'}</h3>
              <p className="text-sm text-gray-500 mt-1">{form.description}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{questions.length} questions</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{form.duration} minutes</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Total: {computedTotalMarks} marks</span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pass: {form.passMark} marks</span>
              </div>
            </div>
            <div className="flex gap-3">
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

      {/* Results Panel */}
      <SlidePanel open={!!resultsPanel} onClose={() => setResultsPanel(null)} title="Quiz Results" width="w-[560px]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-xl font-extrabold text-purple-600 font-display">{results.length}</p>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Attempts</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xl font-extrabold text-blue-600 font-display">{avgScore}%</p>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Avg Score</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-xl font-extrabold text-green-600 font-display">{passRate}%</p>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Pass Rate</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Student', 'Score', 'Time', 'Result', 'Date'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-sm">No attempts yet</td></tr>
                ) : (
                  results.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-gray-800 text-xs">{r.name}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, background: r.percentage >= 70 ? '#22c55e' : '#f59e0b' }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{r.score}/{r.totalMarks}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{r.timeTaken ? `${Math.floor(r.timeTaken/60)}m ${r.timeTaken%60}s` : '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.passed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {r.passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{r.submittedAt ? format(new Date(r.submittedAt), 'dd MMM') : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}
