'use client'
import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Trash2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import quizService from '@/services/quizService'

const SAMPLE_CSV = `Question,Type,Difficulty,Points,Option 1,Option 2,Option 3,Option 4,Correct Options,Explanation
"Which keyword is used to inherit a class in Java?",MCQ,EASY,1,extends,implements,inherits,super,extends,"extends is used for class inheritance"
"Which of the following are Java collection interfaces?",MULTIPLE_CORRECT,MEDIUM,2,List,Set,Map,String,"List, Set, Map","List, Set, Map are interfaces"
"In Java, a class can extend multiple classes.",TRUE_FALSE,EASY,1,True,False,, ,False,"Java supports single class inheritance"
`

// Native pure-JS XLSX (Zip+XML) sheet reader without third-party dependencies
async function parseXLSX(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const bytes = new Uint8Array(arrayBuffer)
  const files = {}
  let pos = 0

  while (pos < bytes.length - 30) {
    const sig = view.getUint32(pos, true)
    if (sig !== 0x04034b50) {
      pos++
      continue
    }
    const compression = view.getUint16(pos + 8, true)
    const compressedSize = view.getUint32(pos + 18, true)
    const fileNameLen = view.getUint16(pos + 26, true)
    const extraLen = view.getUint16(pos + 28, true)

    const fileNameBytes = bytes.subarray(pos + 30, pos + 30 + fileNameLen)
    const fileName = new TextDecoder().decode(fileNameBytes)
    const dataStart = pos + 30 + fileNameLen + extraLen
    const compressedData = bytes.subarray(dataStart, dataStart + compressedSize)

    let uncompressedData
    if (compression === 0) {
      uncompressedData = compressedData
    } else if (compression === 8 && typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(compressedData)
            controller.close()
          }
        })
        const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'))
        const decompressedBuffer = await new Response(decompressedStream).arrayBuffer()
        uncompressedData = new Uint8Array(decompressedBuffer)
      } catch (e) {
        // Skip entry if decompression fails
      }
    }

    if (uncompressedData) {
      files[fileName] = new TextDecoder('utf-8').decode(uncompressedData)
    }

    pos = dataStart + compressedSize
  }

  // Extract shared strings
  const sharedStrings = []
  if (files['xl/sharedStrings.xml']) {
    const xmlDoc = new DOMParser().parseFromString(files['xl/sharedStrings.xml'], 'text/xml')
    const stringNodes = xmlDoc.querySelectorAll('si')
    stringNodes.forEach(si => {
      let str = ''
      const tNodes = si.querySelectorAll('t')
      tNodes.forEach(t => { str += t.textContent })
      sharedStrings.push(str)
    })
  }

  // Extract sheet 1
  const sheetXmlKey = files['xl/worksheets/sheet1.xml'] ? 'xl/worksheets/sheet1.xml' : Object.keys(files).find(k => k.startsWith('xl/worksheets/sheet'))
  if (!sheetXmlKey || !files[sheetXmlKey]) {
    throw new Error('No worksheet data found in XLSX file')
  }

  const xmlDoc = new DOMParser().parseFromString(files[sheetXmlKey], 'text/xml')
  const rowNodes = xmlDoc.querySelectorAll('row')
  const rows = []

  rowNodes.forEach(rowNode => {
    const cellNodes = rowNode.querySelectorAll('c')
    const rowData = []
    cellNodes.forEach(c => {
      const ref = c.getAttribute('r')
      const type = c.getAttribute('t')
      const valNode = c.querySelector('v')
      let val = valNode ? valNode.textContent : ''

      if (type === 's' && val !== '') {
        const strIdx = parseInt(val, 10)
        val = sharedStrings[strIdx] !== undefined ? sharedStrings[strIdx] : val
      } else if (type === 'inlineStr') {
        const tNode = c.querySelector('t')
        if (tNode) val = tNode.textContent
      }

      let colIdx = 0
      if (ref) {
        const colLetters = ref.replace(/[0-9]/g, '')
        let idx = 0
        for (let i = 0; i < colLetters.length; i++) {
          idx = idx * 26 + (colLetters.charCodeAt(i) - 64)
        }
        colIdx = idx - 1
      } else {
        colIdx = rowData.length
      }

      while (rowData.length < colIdx) {
        rowData.push('')
      }
      rowData[colIdx] = val || ''
    })
    if (rowData.some(v => String(v).trim() !== '')) {
      rows.push(rowData)
    }
  })

  return rows
}

// Robust CSV parser supporting quotes, commas, newlines inside quotes
function parseCSV(text) {
  const lines = []
  let row = []
  let entry = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]

    if (c === '"') {
      if (inQuotes && next === '"') {
        entry += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      row.push(entry.trim())
      entry = ''
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++
      row.push(entry.trim())
      if (row.some(r => r.length > 0)) {
        lines.push(row)
      }
      row = []
      entry = ''
    } else {
      entry += c
    }
  }
  if (entry.length > 0 || row.length > 0) {
    row.push(entry.trim())
    if (row.some(r => r.length > 0)) {
      lines.push(row)
    }
  }
  return lines
}

export default function ExcelCsvImporter({ onImported, onCancel }) {
  const [file, setFile] = useState(null)
  const [extractedQuestions, setExtractedQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [previewPageSize, setPreviewPageSize] = useState(5)
  const fileInputRef = useRef(null)

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_quiz_questions.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Sample CSV downloaded')
  }

  function handleFileSelect(e) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  function handleDrop(e) {
    e.preventDefault()
    const selectedFile = e.dataTransfer.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  async function processFile(selectedFile) {
    setFile(selectedFile)
    setLoading(true)
    setPreviewPage(1)

    try {
      let rows = []
      const isXlsx = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')

      if (isXlsx) {
        const buffer = await selectedFile.arrayBuffer()
        rows = await parseXLSX(buffer)
      } else {
        const text = await selectedFile.text()
        rows = parseCSV(text)
      }

      if (!rows || rows.length < 2) {
        toast.error('File contains no valid question rows')
        setLoading(false)
        return
      }

      const header = rows[0].map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''))
      const dataRows = rows.slice(1)

      const questions = []

      dataRows.forEach((row, idx) => {
        if (!row || row.length < 2) return

        const getVal = (name, fallbackIdx) => {
          const hIdx = header.findIndex(h => h.includes(name))
          if (hIdx !== -1 && row[hIdx] !== undefined) return String(row[hIdx]).trim()
          if (row[fallbackIdx] !== undefined) return String(row[fallbackIdx]).trim()
          return ''
        }

        const qText = getVal('question', 0)
        if (!qText) return

        let type = getVal('type', 1).toUpperCase()
        if (!['MCQ', 'MULTIPLE_CORRECT', 'TRUE_FALSE', 'CODE_OUTPUT', 'DEBUGGING', 'SCENARIO', 'SQL', 'INTERVIEW'].includes(type)) {
          type = 'MCQ'
        }

        let difficulty = getVal('difficulty', 2).toUpperCase()
        if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
          difficulty = 'MEDIUM'
        }

        const points = Number(getVal('points', 3)) || 1
        const opt1 = getVal('option1', 4) || getVal('opt1', 4)
        const opt2 = getVal('option2', 5) || getVal('opt2', 5)
        const opt3 = getVal('option3', 6) || getVal('opt3', 6)
        const opt4 = getVal('option4', 7) || getVal('opt4', 7)

        const rawCorrect = getVal('correct', 8).toLowerCase()
        const explanation = getVal('explanation', 9)

        const rawOptions = [opt1, opt2, opt3, opt4].filter(Boolean)
        if (rawOptions.length < 2 && type === 'TRUE_FALSE') {
          rawOptions.push('True', 'False')
        }

        const correctList = rawCorrect.split(',').map(s => s.trim().toLowerCase())

        const options = rawOptions.map((optText, oIdx) => {
          const cleanOpt = optText.trim().toLowerCase()
          let isCorrect = false

          if (correctList.includes(cleanOpt) || correctList.includes(`option ${oIdx + 1}`) || correctList.includes(`opt ${oIdx + 1}`) || correctList.includes(String(oIdx + 1))) {
            isCorrect = true
          }
          return { optionText: optText, correct: isCorrect }
        })

        if (!options.some(o => o.correct) && options.length > 0) {
          options[0].correct = true
        }

        questions.push({
          id: idx + 1,
          questionText: qText,
          questionType: type,
          difficulty: difficulty,
          points: points,
          explanation: explanation,
          options: options,
          isValid: qText.trim().length > 0 && options.length >= 2,
        })
      })

      setExtractedQuestions(questions)
      toast.success(`Extracted ${questions.length} questions from ${selectedFile.name}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to extract questions. Please ensure file matches CSV/Excel format.')
    } finally {
      setLoading(false)
    }
  }

  function removeExtracted(id) {
    setExtractedQuestions(prev => prev.filter(q => q.id !== id))
  }

  async function handleImportAll() {
    if (extractedQuestions.length === 0) {
      toast.error('No questions extracted to import')
      return
    }

    setImporting(true)
    try {
      const payloads = extractedQuestions.map(q => ({
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty,
        points: q.points,
        explanation: q.explanation || '',
        options: q.options.map(o => ({ optionText: o.optionText, correct: o.correct })),
      }))

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

  const totalPreviewPages = Math.ceil(extractedQuestions.length / previewPageSize) || 1
  const validPreviewPage = Math.min(previewPage, totalPreviewPages)
  const previewStartIndex = (validPreviewPage - 1) * previewPageSize
  const previewEndIndex = Math.min(previewStartIndex + previewPageSize, extractedQuestions.length)
  const paginatedExtracted = extractedQuestions.slice(previewStartIndex, previewEndIndex)

  return (
    <div className="space-y-5">
      {/* File Dropzone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-500 rounded-2xl p-6 bg-purple-50/50 dark:bg-purple-900/10 text-center transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mx-auto mb-3">
          <FileSpreadsheet size={24} />
        </div>
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
          {file ? file.name : 'Upload Excel (.xlsx) or CSV (.csv) file'}
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Drag and drop your file here, or click to browse
        </p>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); downloadSample() }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
        >
          <Download size={14} /> Download CSV Sample Template
        </button>
      </div>

      {/* CSV / Excel Column Format Guide */}
      <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 space-y-2">
        <p className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
          Required Excel / CSV Column Format:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <span className="font-bold text-gray-800 dark:text-gray-200">1. Question</span>
            <p className="text-[11px] text-gray-500">Question statement</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <span className="font-bold text-gray-800 dark:text-gray-200">2. Type</span>
            <p className="text-[11px] text-gray-500">MCQ / MULTIPLE_CORRECT / TRUE_FALSE</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <span className="font-bold text-gray-800 dark:text-gray-200">3. Difficulty</span>
            <p className="text-[11px] text-gray-500">EASY / MEDIUM / HARD</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <span className="font-bold text-gray-800 dark:text-gray-200">4. Points</span>
            <p className="text-[11px] text-gray-500">Points number (e.g. 1, 2)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <span className="font-bold text-gray-800 dark:text-gray-200">5-8. Option 1..4</span>
            <p className="text-[11px] text-gray-500">Option choice texts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <span className="font-bold text-gray-800 dark:text-gray-200">9. Correct Options</span>
            <p className="text-[11px] text-gray-500">Text of correct option(s)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-purple-100 dark:border-purple-900 col-span-2">
            <span className="font-bold text-gray-800 dark:text-gray-200">10. Explanation</span>
            <p className="text-[11px] text-gray-500">Answer explanation (optional)</p>
          </div>
        </div>
      </div>

      {/* Extracted Data Preview Table */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-500 animate-pulse">
          Parsing and extracting questions...
        </div>
      ) : extractedQuestions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Extracted Questions Data
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                {extractedQuestions.length} Ready
              </span>
            </h3>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold">Question Text</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Difficulty</th>
                    <th className="px-3 py-2.5 font-semibold">Options</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedExtracted.map((q, idx) => (
                    <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-400 font-bold">{previewStartIndex + idx + 1}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-100 font-medium max-w-xs truncate">
                        {q.questionText}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                          {q.questionType}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold text-[10px]">
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-xs text-gray-500 truncate">
                        {q.options.map(o => (o.correct ? `✓ ${o.optionText}` : o.optionText)).join(' | ')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removeExtracted(q.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Preview Pagination Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={previewPageSize}
                  onChange={e => { setPreviewPageSize(Number(e.target.value)); setPreviewPage(1); }}
                  className="rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-1 py-0.5 text-[11px]"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span className="ml-1">Showing {extractedQuestions.length > 0 ? previewStartIndex + 1 : 0}–{previewEndIndex} of {extractedQuestions.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                  disabled={validPreviewPage === 1}
                  className="p-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="font-bold px-1">{validPreviewPage} / {totalPreviewPages}</span>
                <button
                  type="button"
                  onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                  disabled={validPreviewPage >= totalPreviewPages}
                  className="p-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportAll}
              disabled={importing}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold shadow-md hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {importing ? 'Importing...' : `Import All ${extractedQuestions.length} Questions →`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
