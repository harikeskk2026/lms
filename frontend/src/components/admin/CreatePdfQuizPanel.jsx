'use client'
import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, ChevronUp, ChevronDown, Pencil, Plus, Download, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import QuestionForm from '@/components/admin/QuestionForm'
import DateTimePicker from '@/components/ui/DateTimePicker'
import CustomSelect from '@/components/ui/CustomSelect'
import { PDF_QUESTION_TYPES } from '@/validations/questionValidation'

const STEP_LABELS = ['Quiz Details', 'Upload PDF', 'Review Questions']

const EMPTY_QUIZ_FORM = {
  title: '', description: '', type: 'MCQ', difficulty: '',
  duration: '', passingScore: '', maxAttempts: '',
  courseId: '', batchId: '',
  randomQuestions: false, randomOptions: false, showExplanation: true,
  negativeMarking: false, resultVisibility: '',
  scheduledStart: '', scheduledEnd: '',
}

const SAMPLE_TEMPLATE = `Q1
Type: MCQ
Question: Which keyword is used to inherit a class in Java?
Difficulty: EASY
Points: 1
Topic: Java Basics
Course: Java Full Stack
Options:
A) extends
B) implements
C) inherits
D) super
Answer: A
Explanation: extends is used for class inheritance.

Q2
Type: MULTIPLE_CORRECT
Question: Which of the following are Java collection interfaces?
Difficulty: MEDIUM
Points: 2
Topic: Java Collections
Course: Java Full Stack
Options:
A) List
B) Set
C) Map
D) String
Answer: A, B, C
Explanation: List, Set, Map are interfaces in java.util.

Q3
Type: TRUE_FALSE
Question: In Java, a class can extend multiple classes.
Difficulty: EASY
Points: 1
Course: Java Full Stack
Options:
A) True
B) False
Answer: B
Explanation: Java supports single class inheritance only.

Q4
Type: SHORT_ANSWER
Question: What does JVM stand for?
Difficulty: EASY
Points: 1
Course: Java Full Stack
Answer: Java Virtual Machine
Explanation: JVM executes Java bytecode.
`

// Builds a minimal, dependency-free PDF (base-14 Courier font, paginated) from
// plain text — the frontend has no PDF-generation library installed, and the
// sample template is fixed ASCII content, so hand-rolling the PDF byte stream
// avoids pulling in a new dependency just for this one download button.
function buildTemplatePdf(text) {
  const fontSize = 10
  const lineHeight = 14
  const margin = 50
  const pageWidth = 595.28
  const pageHeight = 841.89
  const linesPerPage = Math.max(1, Math.floor((pageHeight - margin * 2) / lineHeight))

  const allLines = text.replace(/\r\n/g, '\n').split('\n')
  const pages = []
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage))
  }
  if (pages.length === 0) pages.push([''])

  const escapePdfText = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const byteLength = (s) => new TextEncoder().encode(s).length

  const fontObjNum = 3 + pages.length * 2
  const pageObjNums = pages.map((_, i) => 3 + i * 2)
  const contentObjNums = pages.map((_, i) => 4 + i * 2)
  const totalObjs = fontObjNum

  const objects = new Array(totalObjs + 1)
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`

  pages.forEach((pageLines, idx) => {
    const pageObjNum = pageObjNums[idx]
    const contentObjNum = contentObjNums[idx]
    objects[pageObjNum] = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`

    let stream = `BT\n/F1 ${fontSize} Tf\n1 0 0 1 ${margin} ${pageHeight - margin} Tm\n`
    pageLines.forEach((line, i) => {
      stream += `(${escapePdfText(line)}) Tj\n`
      if (i < pageLines.length - 1) stream += `0 -${lineHeight} Td\n`
    })
    stream += `ET`
    objects[contentObjNum] = `${contentObjNum} 0 obj\n<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`
  })

  objects[fontObjNum] = `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let n = 1; n <= totalObjs; n++) {
    offsets[n] = byteLength(pdf)
    pdf += objects[n]
  }
  const xrefStart = byteLength(pdf)
  pdf += `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= totalObjs; n++) {
    pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return pdf
}

let draftCounter = 0
function nextDraftKey() {
  draftCounter += 1
  return `draft-${draftCounter}`
}

function emptyDraft(overrides = {}) {
  return {
    _key: nextDraftKey(),
    savedId: null,
    saveError: null,
    courseId: '', questionText: '', questionType: 'MCQ', answerMode: 'OPTIONS',
    difficulty: 'MEDIUM', explanation: '', codeSnippet: '', correctAnswerText: '', referenceAnswer: '', answerLanguage: '',
    points: 1,
    options: [{ optionText: '', correct: true }, { optionText: '', correct: false }],
    ...overrides,
  }
}

// Topic is deliberately never carried over from extraction — the PDF quiz
// review flow doesn't show or require a Topic (see CreatePdfQuizPanel below).
function draftFromExtracted(d) {
  return emptyDraft({
    courseId: d.resolvedCourseId ?? '',
    questionText: d.questionText || '',
    questionType: d.questionType || 'MCQ',
    answerMode: d.answerMode || 'OPTIONS',
    difficulty: d.difficulty || 'MEDIUM',
    explanation: d.explanation || '',
    codeSnippet: d.codeSnippet || '',
    correctAnswerText: d.correctAnswerText || '',
    referenceAnswer: d.referenceAnswer || '',
    answerLanguage: d.answerLanguage || '',
    points: d.points || 1,
    options: d.options && d.options.length
      ? d.options
      : [{ optionText: '', correct: true }, { optionText: '', correct: false }],
  })
}

// Shared by the auto-save-on-extract pass and the Confirm-time fallback, so a
// question is always sent to the backend the exact same way regardless of when.
function buildQuestionPayload(draft, defaultCourseId) {
  const isFreeText = draft.answerMode === 'FREE_TEXT'
  return {
    topicId: null,
    courseId: Number(draft.courseId || defaultCourseId),
    questionText: draft.questionText,
    questionType: draft.questionType,
    answerMode: draft.answerMode,
    difficulty: draft.difficulty,
    explanation: draft.explanation || '',
    codeSnippet: draft.codeSnippet || '',
    correctAnswerText: isFreeText ? draft.correctAnswerText : null,
    referenceAnswer: null,
    answerLanguage: null,
    points: Number(draft.points) || 1,
    options: isFreeText ? [] : draft.options,
  }
}

function draftToFormValues(draft) {
  return {
    courseId: draft.courseId ?? '',
    questionText: draft.questionText,
    questionType: draft.questionType,
    answerMode: draft.answerMode,
    difficulty: draft.difficulty,
    explanation: draft.explanation,
    codeSnippet: draft.codeSnippet,
    correctAnswerText: draft.correctAnswerText,
    referenceAnswer: draft.referenceAnswer,
    answerLanguage: draft.answerLanguage,
    points: draft.points,
    options: draft.options,
  }
}

// Standalone "create quiz from an uploaded PDF" wizard. Deliberately does NOT
// share state or the create->attach->reorder->assign->publish call sequence
// with the existing Quizzes-tab wizard in page.jsx — kept fully separate so
// this feature can never affect that already-working flow.
export default function CreatePdfQuizPanel({ topics, courses, batches, onTopicsChange, onCreated, onClose }) {
  const [step, setStep] = useState(0) // 0 details, 1 upload, 2 review
  const [form, setForm] = useState(EMPTY_QUIZ_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [pdfFile, setPdfFile] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [drafts, setDrafts] = useState([])
  const [globalWarnings, setGlobalWarnings] = useState([])
  const [expandedKey, setExpandedKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  function validateDetails() {
    const errs = {}
    if (!form.title || !form.title.trim()) {
      errs.title = 'Title is required'
    } else if (form.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters'
    }
    if (!form.difficulty) {
      errs.difficulty = 'Difficulty is required'
    }
    if (!form.resultVisibility) {
      errs.resultVisibility = 'Result visibility is required'
    }
    const durationNum = Number(form.duration)
    if (form.duration === '' || isNaN(durationNum) || durationNum < 1) {
      errs.duration = 'Min 1 minute'
    } else if (durationNum > 1440) {
      errs.duration = 'Max 1440 min'
    }
    const scoreNum = Number(form.passingScore)
    if (form.passingScore === '' || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      errs.passingScore = 'Between 0-100%'
    }
    const attemptsNum = Number(form.maxAttempts)
    if (form.maxAttempts === '' || isNaN(attemptsNum) || attemptsNum < 1) {
      errs.maxAttempts = 'Min 1 attempt'
    } else if (attemptsNum > 100) {
      errs.maxAttempts = 'Max 100 attempts'
    }
    if (form.scheduledStart && form.scheduledEnd && new Date(form.scheduledStart) >= new Date(form.scheduledEnd)) {
      errs.scheduledEnd = 'End time must be after start time'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNextFromDetails() {
    if (!validateDetails()) {
      toast.error('Please fix errors in quiz details')
      return
    }
    setStep(1)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please choose a PDF file')
      return
    }
    setPdfFile(file)
  }

  function downloadSample() {
    const blob = new Blob([buildTemplatePdf(SAMPLE_TEMPLATE)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz-pdf-template.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Saves one extracted draft to the Question Bank immediately, so the admin
  // never has to manually click "Create Question" for questions that came out
  // of the PDF correctly — only editing (and re-saving) is needed for mistakes.
  async function autoSaveDraft(draft) {
    if (!draft.courseId && !form.courseId) {
      return { ...draft, saveError: 'No course — set one in Quiz Details, or edit this question.' }
    }
    try {
      const res = await quizService.createQuestion(buildQuestionPayload(draft, form.courseId))
      return { ...draft, savedId: res.data.id, saveError: null }
    } catch (err) {
      return { ...draft, saveError: err.message || 'Could not save automatically — edit to fix.' }
    }
  }

  async function handleExtract() {
    if (!pdfFile) {
      toast.error('Choose a PDF file first')
      return
    }
    setExtracting(true)
    try {
      const res = await quizService.extractQuestionsFromPdf(pdfFile)
      const data = res.data
      if (!data.questions?.length) {
        toast.error('No questions could be extracted — check the PDF matches the template')
        setDrafts([])
        setGlobalWarnings(data.globalWarnings || [])
        return
      }
      const extracted = data.questions.map(draftFromExtracted)
      setDrafts(extracted)
      setGlobalWarnings(data.globalWarnings || [])
      setStep(2)

      setAutoSaving(true)
      const saved = []
      for (const draft of extracted) {
        saved.push(await autoSaveDraft(draft))
      }
      setDrafts(saved)
      const failedCount = saved.filter(d => d.saveError).length
      if (failedCount > 0) {
        toast.error(`${failedCount} question${failedCount === 1 ? '' : 's'} need attention — see below.`)
      } else {
        toast.success('All questions saved — edit any that need correcting.')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to extract questions from PDF')
    } finally {
      setExtracting(false)
      setAutoSaving(false)
    }
  }

  function removeDraft(key) {
    setDrafts(prev => prev.filter(d => d._key !== key))
    if (expandedKey === key) setExpandedKey(null)
  }

  function addManualDraft() {
    const draft = emptyDraft({ courseId: form.courseId || '' })
    setDrafts(prev => [...prev, draft])
    setExpandedKey(draft._key)
  }

  function moveDraft(key, direction) {
    setDrafts(prev => {
      const idx = prev.findIndex(d => d._key === key)
      const newIdx = idx + direction
      if (idx < 0 || newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }

  function handleDraftSaved(key, saved) {
    setDrafts(prev => prev.map(d => d._key === key ? {
      ...d,
      savedId: saved.id,
      saveError: null,
      courseId: saved.courseId ?? '',
      questionText: saved.questionText,
      questionType: saved.questionType,
      answerMode: saved.answerMode || 'OPTIONS',
      difficulty: saved.difficulty,
      explanation: saved.explanation || '',
      codeSnippet: saved.codeSnippet || '',
      correctAnswerText: saved.correctAnswerText || '',
      referenceAnswer: saved.referenceAnswer || '',
      answerLanguage: saved.answerLanguage || '',
      points: saved.points,
      options: (saved.options || []).map(o => ({ optionText: o.optionText, correct: o.correct })),
    } : d))
    setExpandedKey(null)
    toast.success('Question saved')
  }

  function resetAll() {
    setStep(0)
    setForm(EMPTY_QUIZ_FORM)
    setFormErrors({})
    setPdfFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setDrafts([])
    setGlobalWarnings([])
    setExpandedKey(null)
  }

  async function handleConfirm(publish) {
    if (!validateDetails()) {
      setStep(0)
      toast.error('Please fix errors in quiz details')
      return
    }
    if (drafts.length === 0) {
      toast.error('Add at least one question')
      return
    }
    const missingCourse = drafts.some(d => !d.savedId && !d.courseId && !form.courseId)
    if (missingCourse) {
      toast.error('Every question needs a Course — go back to Quiz Details and pick one.')
      return
    }
    if (publish && !form.batchId && !form.courseId) {
      toast.error('Quiz cannot be published. Complete: an assignment to a batch or course.')
      return
    }

    setSaving(true)
    try {
      const finalIds = []
      const marksMap = {}
      for (const draft of drafts) {
        let id = draft.savedId
        if (!id) {
          const res = await quizService.createQuestion(buildQuestionPayload(draft, form.courseId))
          id = res.data.id
        }
        finalIds.push(id)
        marksMap[id] = Number(draft.points) || 1
      }

      const quizPayload = {
        ...form,
        duration: Number(form.duration),
        passingScore: Number(form.passingScore),
        maxAttempts: Number(form.maxAttempts),
        courseId: form.courseId || null,
        batchId: form.batchId || null,
        scheduledStart: form.scheduledStart || null,
        scheduledEnd: form.scheduledEnd || null,
      }
      const quiz = await quizService.createQuiz(quizPayload)
      const quizId = quiz.data.id
      await quizService.attachQuestions(quizId, finalIds)
      await quizService.reorderQuestions(quizId, finalIds.map(id => ({ questionId: id, marks: marksMap[id] ?? null })))
      if (form.batchId) {
        await quizService.assignQuiz(quizId, { targetType: 'BATCH', targetIds: [Number(form.batchId)] })
      }
      if (form.courseId) {
        await quizService.assignQuiz(quizId, { targetType: 'COURSE', targetIds: [Number(form.courseId)] })
      }
      if (pdfFile) {
        await quizService.uploadSourcePdf(quizId, pdfFile)
      }
      if (publish) {
        await quizService.updateQuiz(quizId, { ...quizPayload, status: 'PUBLISHED' })
      }

      toast.success(publish ? 'Quiz published!' : 'Quiz saved as draft')
      resetAll()
      onCreated?.()
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Failed to save quiz')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {STEP_LABELS.map((l, i) => (
          <button key={l} onClick={() => i < step && setStep(i)} disabled={i > step}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all break-words text-center ${
              step === i ? 'bg-purple-600 text-white shadow-sm' : i < step ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-gray-100 text-gray-400'
            }`}>
            {i + 1}. {l}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined })) }}
              placeholder="Java Fundamentals Quiz"
              className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 ${formErrors.title ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`}
            />
            {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              placeholder="Enter quiz description"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty *</label>
              <CustomSelect
                value={form.difficulty}
                onChange={(val) => { setForm(f => ({ ...f, difficulty: val })); if (formErrors.difficulty) setFormErrors(prev => ({ ...prev, difficulty: undefined })) }}
                placeholder="Select difficulty"
                options={[{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]}
              />
              {formErrors.difficulty && <p className="text-xs text-red-500 mt-1">{formErrors.difficulty}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Result Visibility *</label>
              <CustomSelect
                value={form.resultVisibility}
                onChange={(val) => { setForm(f => ({ ...f, resultVisibility: val })); if (formErrors.resultVisibility) setFormErrors(prev => ({ ...prev, resultVisibility: undefined })) }}
                placeholder="Select result visibility"
                options={[
                  { value: 'IMMEDIATE', label: 'Show result immediately' },
                  { value: 'AFTER_CLOSE', label: 'Show result after quiz closes' },
                  { value: 'MANUAL', label: 'Release result manually' },
                ]}
              />
              {formErrors.resultVisibility && <p className="text-xs text-red-500 mt-1">{formErrors.resultVisibility}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Course</label>
              <CustomSelect
                value={form.courseId}
                onChange={(val) => setForm(f => {
                  const stillValid = f.batchId && batches.some(b => String(b.id) === String(f.batchId) && String(b.course?.id) === String(val))
                  return { ...f, courseId: val, batchId: stillValid ? f.batchId : '' }
                })}
                options={courses.map(c => ({ value: c.id, label: c.title || c.name }))}
                placeholder="Select course"
                searchable
              />
              <p className="text-xs text-gray-400 mt-1">Used as the default Course for extracted questions that don't specify one.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
              <CustomSelect
                value={form.batchId}
                onChange={(val) => setForm(f => ({ ...f, batchId: val }))}
                options={batches.filter(b => !form.courseId || String(b.course?.id) === String(form.courseId)).map(b => ({ value: b.id, label: b.name }))}
                placeholder="All batches"
                searchable
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duration *</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input type="text" inputMode="numeric" placeholder="Hrs"
                    value={form.duration === '' ? '' : String(Math.floor(Number(form.duration) / 60))}
                    onChange={e => {
                      const h = e.target.value.replace(/\D/g, '')
                      const mins = form.duration === '' ? 0 : Number(form.duration) % 60
                      const totalMin = (h === '' ? 0 : Number(h)) * 60 + mins
                      setForm(f => ({ ...f, duration: (h === '' && mins === 0) ? '' : String(totalMin) }))
                      if (formErrors.duration) setFormErrors(prev => ({ ...prev, duration: undefined }))
                    }}
                    className={`w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm text-center outline-none focus:ring-2 ${formErrors.duration ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`} />
                  <p className="text-[10px] text-gray-400 mt-0.5 text-center">hrs</p>
                </div>
                <div className="flex-1">
                  <input type="text" inputMode="numeric" placeholder="Mins"
                    value={form.duration === '' ? '' : String(Number(form.duration) % 60)}
                    onChange={e => {
                      let m = e.target.value.replace(/\D/g, '')
                      if (m !== '' && Number(m) > 59) m = '59'
                      const hrs = form.duration === '' ? 0 : Math.floor(Number(form.duration) / 60)
                      const totalMin = hrs * 60 + (m === '' ? 0 : Number(m))
                      setForm(f => ({ ...f, duration: (hrs === 0 && m === '') ? '' : String(totalMin) }))
                      if (formErrors.duration) setFormErrors(prev => ({ ...prev, duration: undefined }))
                    }}
                    className={`w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm text-center outline-none focus:ring-2 ${formErrors.duration ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`} />
                  <p className="text-[10px] text-gray-400 mt-0.5 text-center">mins</p>
                </div>
              </div>
              {formErrors.duration && <p className="text-xs text-red-500 mt-1">{formErrors.duration}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Passing Score (%) *</label>
              <input type="text" inputMode="numeric" placeholder="Enter passing %" value={form.passingScore}
                onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val !== '' && Number(val) > 100) val = '100'; setForm(f => ({ ...f, passingScore: val })); if (formErrors.passingScore) setFormErrors(prev => ({ ...prev, passingScore: undefined })) }}
                className={`w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${formErrors.passingScore ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`} />
              {formErrors.passingScore && <p className="text-xs text-red-500 mt-1">{formErrors.passingScore}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Attempts *</label>
              <input type="text" inputMode="numeric" placeholder="Enter max attempts" value={form.maxAttempts}
                onChange={e => { const val = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, maxAttempts: val })); if (formErrors.maxAttempts) setFormErrors(prev => ({ ...prev, maxAttempts: undefined })) }}
                className={`w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${formErrors.maxAttempts ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 focus:ring-purple-500'}`} />
              {formErrors.maxAttempts && <p className="text-xs text-red-500 mt-1">{formErrors.maxAttempts}</p>}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date/Time</label>
              <DateTimePicker
                value={form.scheduledStart}
                onChange={val => { setForm(f => ({ ...f, scheduledStart: val })); if (formErrors.scheduledEnd) setFormErrors(prev => ({ ...prev, scheduledEnd: undefined })) }}
                requireExplicitTime
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date/Time</label>
              <DateTimePicker
                value={form.scheduledEnd}
                onChange={val => { setForm(f => ({ ...f, scheduledEnd: val })); if (formErrors.scheduledEnd) setFormErrors(prev => ({ ...prev, scheduledEnd: undefined })) }}
                minDate={form.scheduledStart ? form.scheduledStart.split('T')[0] : undefined}
                requireExplicitTime
                hasError={!!formErrors.scheduledEnd}
              />
              {formErrors.scheduledEnd && <p className="text-xs text-red-500 mt-1">{formErrors.scheduledEnd}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.randomQuestions} onChange={e => setForm(f => ({ ...f, randomQuestions: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Randomize question order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.randomOptions} onChange={e => setForm(f => ({ ...f, randomOptions: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Randomize option order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.negativeMarking} onChange={e => setForm(f => ({ ...f, negativeMarking: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Negative marking (wrong answers deduct full marks)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.showExplanation} onChange={e => setForm(f => ({ ...f, showExplanation: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Show explanations after submission</span>
            </label>
          </div>
          <button onClick={handleNextFromDetails} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all">
            Next: Upload PDF →
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <Upload size={28} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-3">Upload a PDF formatted to the quiz question template.</p>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" id="pdf-quiz-file" />
            <label htmlFor="pdf-quiz-file" className="inline-block px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold cursor-pointer hover:bg-purple-700 transition-colors">
              Choose PDF
            </label>
            {pdfFile && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-700">
                <FileText size={14} /> {pdfFile.name}
              </div>
            )}
          </div>
          <button type="button" onClick={downloadSample} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700">
            <Download size={12} /> Download sample template (.pdf)
          </button>
          <p className="text-xs text-gray-400">
            The PDF is stored privately for your reference and is never shown to students. Supports MCQ, Multiple Correct,
            True/False, and Short Answer questions — see the sample template for the exact format each type expects.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">← Back</button>
            <button onClick={handleExtract} disabled={extracting || !pdfFile}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {extracting ? <><Loader2 size={16} className="animate-spin" /> Extracting…</> : 'Extract Questions →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {globalWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 space-y-1">
              {globalWarnings.map((w, i) => <p key={i} className="text-xs text-amber-700">{w}</p>)}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{drafts.length} question{drafts.length === 1 ? '' : 's'} extracted</p>
            <button onClick={addManualDraft} className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
              <Plus size={12} /> Add Question
            </button>
          </div>

          {autoSaving ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
              <p className="text-xs text-gray-400 text-center">Saving extracted questions…</p>
            </div>
          ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {drafts.map((draft, idx) => (
              <div key={draft._key} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
                  <div className="flex flex-col">
                    <button onClick={() => moveDraft(draft._key, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => moveDraft(draft._key, 1)} disabled={idx === drafts.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{idx + 1}. {draft.questionText || '(empty question)'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{draft.questionType}</span>
                      {draft.saveError && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700" title={draft.saveError}>
                          Needs attention
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpandedKey(k => k === draft._key ? null : draft._key)}
                    className={`p-1 ${expandedKey === draft._key ? 'text-purple-600' : 'text-gray-400 hover:text-purple-600'}`} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeDraft(draft._key)} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>

                {expandedKey === draft._key ? (
                  <div className="p-4 border-t border-gray-200">
                    <QuestionForm
                      courses={courses}
                      showTopic={false}
                      showCodeSnippet={false}
                      showCourse={false}
                      showDifficulty={false}
                      typeOptions={PDF_QUESTION_TYPES}
                      defaultValues={draftToFormValues({ ...draft, courseId: draft.courseId || form.courseId })}
                      editingId={draft.savedId || undefined}
                      onSaved={(saved) => handleDraftSaved(draft._key, saved)}
                      onCancel={() => setExpandedKey(null)}
                    />
                  </div>
                ) : (
                  // Read-only preview of everything extracted — the admin only needs
                  // to click Edit if something here is actually wrong.
                  <div className="px-4 py-3 border-t border-gray-100 bg-white space-y-2.5">
                    <p className="text-sm text-gray-700">{draft.questionText || '(empty question)'}</p>
                    {draft.codeSnippet && (
                      <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-2.5 overflow-x-auto font-mono">{draft.codeSnippet}</pre>
                    )}
                    {draft.answerMode === 'FREE_TEXT' ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-green-700 mb-0.5">Correct Answer</p>
                        <p className="text-xs text-gray-700">{draft.correctAnswerText || '(not set — click Edit to add one)'}</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {draft.options.map((o, i) => (
                          <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 border ${
                            o.correct ? 'border-green-300 bg-green-50 text-green-700 font-semibold' : 'border-gray-200 text-gray-600'
                          }`}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white border border-current shrink-0">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1 break-words">{o.optionText || '(empty option)'}</span>
                            {o.correct && <CheckCircle size={13} className="shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                    {draft.explanation && <p className="text-[11px] text-gray-400 italic">{draft.explanation}</p>}
                    <p className="text-[10px] text-gray-400">{draft.points} point{draft.points > 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
            ))}
            {drafts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No questions yet — extract from a PDF or add one manually.</p>
            )}
          </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">← Back</button>
            <button onClick={() => handleConfirm(false)} disabled={saving || autoSaving} className="flex-1 py-2.5 rounded-xl border border-purple-300 text-purple-700 text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => handleConfirm(true)} disabled={saving || autoSaving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Publishing…' : 'Publish Quiz'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
