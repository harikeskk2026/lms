'use client'
import { useState, useRef } from 'react'
import { FileText, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'
import courseService from '@/services/courseService'

const SAMPLE_TEXT = `Q1. Which keyword is used to inherit a class in Java?
Type: MCQ
Difficulty: EASY
Points: 1
Topic: Java Basics
Course: Java Full Stack
A) extends
B) implements
C) inherits
D) super
Answer: A
Explanation: extends is used for class inheritance.

Q2. Which of the following are Java collection interfaces?
Type: MULTIPLE_CORRECT
Difficulty: MEDIUM
Points: 2
Topic: Java Collections
Course: Java Full Stack
A) List
B) Set
C) Map
D) String
Answer: A, B, C
Explanation: List, Set, Map are interfaces in java.util.

Q3. In Java, a class can extend multiple classes.
Type: TRUE_FALSE
Difficulty: EASY
Points: 1
Topic: Java Basics
Course: Java Full Stack
A) True
B) False
Answer: B
Explanation: Java supports single class inheritance only.
`

const QSTART_RE = /^(?:Q(?:uestion)?\s*\d*[.):]?)\s+(.+)$/i
const OPTION_RE = /^([A-Da-d])[.)\-:]\s*(.+)$/
const TYPE_RE = /^Type\s*[:\-]\s*(.+)$/i
const DIFF_RE = /^Difficulty\s*[:\-]\s*(.+)$/i
const POINTS_RE = /^Points?\s*[:\-]\s*(.+)$/i
const TOPIC_RE = /^Topic\s*[:\-]\s*(.+)$/i
const COURSE_RE = /^(?:Course|Courses)\s*[:\-]\s*(.+)$/i
const ANSWER_RE = /^(?:Answer|Correct(?:\s*Answer)?)\s*[:\-]\s*(.+)$/i
const EXPLAIN_RE = /^Explanation\s*[:\-]\s*(.+)$/i
const VALID_TYPES = ['MCQ', 'MULTIPLE_CORRECT', 'TRUE_FALSE', 'CODE_OUTPUT', 'DEBUGGING', 'SCENARIO', 'SQL', 'INTERVIEW']

// Validates that a string is a valid positive integer (no decimals, no exponent, no leading +, no leading zeros)
function isValidIntegerString(s) {
  if (s == null) return false
  const t = String(s).trim()
  if (t.length === 0) return false
  // Reject exponent notation, leading +, leading -, decimal points
  if (t.match(/[eE]/) || t.startsWith('+') || t.startsWith('-') || t.includes('.')) {
    return false
  }
  return /^[1-9]\d*$/.test(t)
}

// Reconstructs readable lines from pdf.js's flat, position-only text items by
// grouping items that share a Y coordinate (same visual line) and ordering
// them left-to-right. Works well for single-column, text-based PDFs; complex
// multi-column layouts or scanned/image PDFs won't extract cleanly.
async function extractPdfLines(pdf) {
  const lines = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const rows = new Map()
    content.items.forEach(item => {
      if (!item.str || !item.str.trim()) return
      const y = Math.round(item.transform[5])
      const x = item.transform[4]
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y).push({ x, str: item.str })
    })
    Array.from(rows.keys())
      .sort((a, b) => b - a)
      .forEach(y => {
        const lineText = rows.get(y)
          .sort((a, b) => a.x - b.x)
          .map(r => r.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (lineText) lines.push(lineText)
      })
  }
  return lines
}

function parseQuestionsFromLines(lines) {
  const questions = []
  let current = null

  function pushCurrent() {
    if (!current) return
    const answerTokens = current.rawAnswer.split(/[,/]/).map(s => s.trim().toLowerCase()).filter(Boolean)
    current.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx).toLowerCase()
      const textLower = opt.optionText.trim().toLowerCase()
      opt.correct = answerTokens.includes(letter) || answerTokens.includes(textLower)
    })
    if (!current.options.some(o => o.correct) && current.options.length > 0) {
      current.options[0].correct = true
    }
    if (current.questionText.trim() && current.options.length >= 2) {
      questions.push({ ...current, id: questions.length + 1, isValid: true })
    }
    current = null
  }

  lines.forEach(rawLine => {
    const line = rawLine.trim()
    if (!line) return

    const qMatch = line.match(QSTART_RE)
    if (qMatch) {
      pushCurrent()
      current = { questionText: qMatch[1].trim(), questionType: 'MCQ', difficulty: 'MEDIUM', points: 1, topicName: '', courseName: '', options: [], explanation: '', rawAnswer: '' }
      return
    }
    if (!current) return

    let m
    if ((m = line.match(TYPE_RE))) {
      const t = m[1].trim().toUpperCase().replace(/\s+/g, '_')
      current.questionType = VALID_TYPES.includes(t) ? t : 'MCQ'
      return
    }
    if ((m = line.match(DIFF_RE))) {
      const d = m[1].trim().toUpperCase()
      current.difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(d) ? d : 'MEDIUM'
      return
    }
    if ((m = line.match(POINTS_RE))) {
      const raw = m[1].trim()
      if (!isValidIntegerString(raw)) {
        current.points = 1 // default to 1 for invalid
      } else {
        current.points = Number(raw) || 1
      }
      return
    }
    if ((m = line.match(TOPIC_RE))) {
      current.topicName = m[1].trim()
      return
    }
    if ((m = line.match(COURSE_RE))) {
      current.courseName = m[1].trim()
      return
    }
    if ((m = line.match(ANSWER_RE))) {
      current.rawAnswer = m[1].trim()
      return
    }
    if ((m = line.match(EXPLAIN_RE))) {
      current.explanation = m[1].trim()
      return
    }
    if ((m = line.match(OPTION_RE))) {
      current.options.push({ optionText: m[2].trim(), correct: false })
      return
    }
    // Not a recognized field — treat as a wrapped continuation of the question text.
    current.questionText += ' ' + line
  })
  pushCurrent()
  return questions
}

export default function PdfQuestionImporter({ onImported, onCancel, topics = [], courses = [] }) {
  const [file, setFile] = useState(null)
  const [extracted, setExtracted] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const previewPageSize = 5
  const fileInputRef = useRef(null)

  function downloadSample() {
    const blob = new Blob([SAMPLE_TEXT], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_quiz_questions_format.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Sample format downloaded — type/paste this into a document and export it as a PDF')
  }

  function handleFileSelect(e) {
    const selected = e.target.files?.[0]
    if (selected) processFile(selected)
  }

  function handleDrop(e) {
    e.preventDefault()
    const selected = e.dataTransfer.files?.[0]
    if (selected) processFile(selected)
  }

  async function processFile(selectedFile) {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a .pdf file')
      return
    }
    setFile(selectedFile)
    setLoading(true)
    setPreviewPage(1)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

      const buffer = await selectedFile.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const lines = await extractPdfLines(pdf)
      const questions = parseQuestionsFromLines(lines)

      if (questions.length === 0) {
        toast.error('No questions found — make sure the PDF follows the Q1./Type/Options/Answer format below')
      } else {
        toast.success(`Extracted ${questions.length} questions from ${selectedFile.name}`)
      }
      setExtracted(questions)
    } catch (err) {
      console.error(err)
      toast.error('Failed to read PDF. It may be scanned/image-based, encrypted, or not text-based.')
    } finally {
      setLoading(false)
    }
  }

  function removeExtracted(id) {
    setExtracted(prev => prev.filter(q => q.id !== id))
  }

  async function handleImportAll() {
    if (extracted.length === 0) {
      toast.error('No questions extracted to import')
      return
    }
    setImporting(true)
    try {
      // 1. Fetch latest topics and courses from API or use props
      let currentTopics = topics || []
      let currentCourses = courses || []
      try {
        const [tRes, cRes] = await Promise.all([
          quizService.listTopics(),
          courseService.list()
        ])
        if (tRes.data) currentTopics = tRes.data
        if (cRes.data) currentCourses = cRes.data
      } catch (_) {}

      // 2. Map existing topics and courses by lowercased name
      const topicMap = new Map()
      currentTopics.forEach(t => {
        if (t.name) topicMap.set(t.name.trim().toLowerCase(), t.id)
      })

      const courseMap = new Map()
      currentCourses.forEach(c => {
        const cName = c.title || c.name
        if (cName) courseMap.set(cName.trim().toLowerCase(), c.id)
      })

      // 3. Find unique topic names from PDF that need creation
      const uniqueTopicNames = Array.from(
        new Set(
          extracted
            .map(q => q.topicName?.trim())
            .filter(Boolean)
        )
      )

      for (const name of uniqueTopicNames) {
        const lower = name.toLowerCase()
        if (!topicMap.has(lower)) {
          try {
            const created = await quizService.createTopic({ name })
            if (created.data?.id) {
              topicMap.set(lower, created.data.id)
            }
          } catch (err) {
            console.error('Failed to create topic:', name, err)
          }
        }
      }

      // 4. Build question payloads with resolved topicId and courseId
      const payloads = extracted.map(q => {
        const trimmedTopic = q.topicName?.trim()
        const topicId = trimmedTopic ? topicMap.get(trimmedTopic.toLowerCase()) : null
        const trimmedCourse = q.courseName?.trim()
        let courseId = null
        if (trimmedCourse) {
          const lower = trimmedCourse.toLowerCase()
          if (courseMap.has(lower)) {
            courseId = courseMap.get(lower)
          } else {
            const match = currentCourses.find(c => {
              const name = (c.title || c.name || '').trim().toLowerCase()
              return name && (name === lower || name.includes(lower) || lower.includes(name))
            })
            if (match) courseId = match.id
          }
        }

        return {
          questionText: q.questionText,
          questionType: q.questionType,
          difficulty: q.difficulty,
          points: q.points,
          explanation: q.explanation || '',
          options: q.options.map(o => ({ optionText: o.optionText, correct: o.correct })),
          topicId: topicId ?? null,
          courseId: courseId ?? null,
        }
      })

      const results = await Promise.all(payloads.map(p => quizService.createQuestion(p)))
      const saved = results.map(r => r.data)
      toast.success(`Imported ${saved.length} questions successfully!`)
      onImported?.(saved)
    } catch (err) {
      toast.error(err.message || 'Failed to import questions')
    } finally {
      setImporting(false)
    }
  }

  const totalPages = Math.ceil(extracted.length / previewPageSize) || 1
  const validPage = Math.min(previewPage, totalPages)
  const startIdx = (validPage - 1) * previewPageSize
  const endIdx = Math.min(startIdx + previewPageSize, extracted.length)
  const paginated = extracted.slice(startIdx, endIdx)

  return (
    <div className="space-y-5">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-500 rounded-2xl p-6 bg-purple-50/50 dark:bg-purple-900/10 text-center transition-colors cursor-pointer"
      >
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mx-auto mb-3">
          <FileText size={24} />
        </div>
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
          {file ? file.name : 'Upload a PDF (.pdf) file'}
        </p>
        <p className="text-xs text-gray-500 mb-3">Drag and drop your file here, or click to browse</p>
        <button type="button" onClick={e => { e.stopPropagation(); downloadSample() }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
          <Download size={14} /> Download Sample Content Format (.txt)
        </button>
      </div>

      <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 space-y-2">
        <p className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">Required PDF Content Format:</p>
        <pre className="text-[11px] leading-relaxed bg-white dark:bg-gray-800 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
{`Q1. <question text>
Type: MCQ | MULTIPLE_CORRECT | TRUE_FALSE | ...
Difficulty: EASY | MEDIUM | HARD
Points: 1
Topic: <topic name>  (optional)
Course: <course name>  (required)
A) <option>
B) <option>
Answer: A            (comma-separated for MULTIPLE_CORRECT, e.g. "A, C")
Explanation: <optional>`}
        </pre>
        <p className="text-[11px] text-gray-500">
          Course is required. Type/Difficulty/Points/Topic/Explanation are optional. Works best on
          text-based PDFs (exported from Word/Google Docs) — scanned or image-only PDFs can't be read this way.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-gray-500 animate-pulse">Reading and extracting questions from PDF...</div>
      ) : extracted.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Extracted Questions
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">{extracted.length} Ready</span>
            </h3>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="max-h-[300px] overflow-x-auto overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold">Question Text</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Difficulty</th>
                    <th className="px-3 py-2.5 font-semibold">Topic</th>
                    <th className="px-3 py-2.5 font-semibold">Course</th>
                    <th className="px-3 py-2.5 font-semibold">Options</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginated.map((q, idx) => (
                    <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-400 font-bold">{startIdx + idx + 1}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-100 font-medium break-words">{q.questionText}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">{q.questionType}</span></td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold text-[10px]">{q.difficulty}</span></td>
                      <td className="px-3 py-2">
                        {q.topicName
                          ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-[10px]">{q.topicName}</span>
                          : <span className="text-gray-300 text-[10px]">—</span>
                        }
                      </td>
                      <td className="px-3 py-2">
                        {q.courseName
                          ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px]">{q.courseName}</span>
                          : <span className="text-gray-300 text-[10px]">—</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-gray-500 break-words">
                        {q.options.map(o => (o.correct ? `✓ ${o.optionText}` : o.optionText)).join(' | ')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeExtracted(q.id)} className="text-gray-400 hover:text-red-500 p-1" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 bg-gray-50/50 dark:bg-gray-800/40">
              <span>Showing {extracted.length > 0 ? startIdx + 1 : 0}–{endIdx} of {extracted.length}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={validPage === 1}
                  className="p-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronLeft size={13} /></button>
                <span className="font-bold px-1">{validPage} / {totalPages}</span>
                <button type="button" onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} disabled={validPage >= totalPages}
                  className="p-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronRight size={13} /></button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportAll}
              disabled={importing || extracted.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold shadow-md hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
            >
              {importing ? 'Importing...' : `Import All ${extracted.length} Questions →`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
