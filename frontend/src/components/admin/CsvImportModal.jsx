'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FileUp,
  FileDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Pagination from '@/components/ui/Pagination'

/**
 * Generic CSV import modal used by Admins, Trainers, Courses and Batches.
 *
 * - Step 1: download template + column instructions
 * - Step 2: upload CSV, client-side preview + required-column check
 * - Step 3: server result (imported / failed counts + per-row errors, downloadable)
 *
 * `submitFn(file, options)` must return the ApiResponse payload:
 *   { totalRows, importedCount, failedCount, imported[], errors[{rowNumber, entityLabel, reason}] }
 */
function parseCsv(text) {
  const lines = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false
  const cleanText = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i]
    if (ch === '"') {
      if (inQuotes && cleanText[i + 1] === '"') {
        currentField += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && cleanText[i + 1] === '\n') i++
      currentRow.push(currentField.trim())
      currentField = ''
      if (currentRow.some(c => c.length > 0)) lines.push(currentRow)
      currentRow = []
    } else {
      currentField += ch
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(c => c.length > 0)) lines.push(currentRow)
  }

  if (lines.length === 0) return { headers: [], rows: [] }

  const rawHeaders = lines[0]
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const rows = lines.slice(1).map((tokens, idx) => {
    const obj = { _rowNum: idx + 2 }
    headers.forEach((h, i) => {
      obj[h] = tokens[i] || ''
    })
    return obj
  })

  return { headers: rawHeaders, rows }
}

function downloadFile(content, filename, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function CsvImportModal({
  open,
  onClose,
  title,
  subtitle,
  entityLabel,
  entityLabelPlural,
  templateFilename,
  templateHeaders,
  templateRows = [],
  requiredColumns = [],
  submitFn,
  onSuccess,
  showPasswordField = false,
  passwordPlaceholder = '',
  helpLines = [],
}) {
  const plural = entityLabelPlural || `${entityLabel}s`

  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [defaultPassword, setDefaultPassword] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [previewPage, setPreviewPage] = useState(1)
  const fileInputRef = useRef(null)

  const mounted = useMemo(() => typeof window !== 'undefined', [])
  useEffect(() => {
    if (!open) {
      handleReset()
      setDefaultPassword('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPreviewPage(1)
  }, [parsedData])

  const missingColumns = useMemo(() => {
    if (!parsedData?.headers) return []
    const normalized = parsedData.headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
    return requiredColumns.filter(col => !normalized.includes(col))
  }, [parsedData, requiredColumns])

  const previewHeaders = useMemo(() => {
    if (!parsedData?.headers) return []
    return parsedData.headers.slice(0, 6)
  }, [parsedData])

  const previewMeta = useMemo(() => {
    if (!parsedData?.rows) return { total: 0 }
    return { total: parsedData.rows.length }
  }, [parsedData])

  const handleFileSelected = (selected) => {
    if (!selected) return
    if (!/\.csv$/i.test(selected.name)) {
      toast.error('Please upload a .csv file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCsv(String(e.target?.result || ''))
      if (parsed.headers.length === 0) {
        toast.error('The file appears to be empty or unreadable')
        return
      }
      setFile(selected)
      setParsedData(parsed)
      setImportResult(null)
    }
    reader.readAsText(selected)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelected(e.dataTransfer?.files?.[0])
  }

  const handleDownloadTemplate = () => {
    const headerRow = templateHeaders.map(h => h.includes(',') || h.includes('"') ? `"${h.replace(/"/g, '""')}"` : h).join(',')
    const bodyRows = templateRows.map(row =>
      row.map(cell => (typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
    )
    downloadFile([headerRow, ...bodyRows].join('\n'), templateFilename)
    toast.success('Template downloaded')
  }

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please choose a CSV file')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await submitFn(file, { defaultPassword: defaultPassword.trim() || undefined })
      const data = response?.data || response
      setImportResult(data)
      if (data?.importedCount > 0) {
        toast.success(`Successfully imported ${data.importedCount} ${plural}!`)
        if (onSuccess) onSuccess()
      } else if (data?.failedCount > 0) {
        toast.error(`Import failed: ${data.failedCount} row${data.failedCount > 1 ? 's' : ''} had errors.`)
      }
    } catch (err) {
      toast.error(err?.message || `Failed to import ${plural}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadErrors = () => {
    if (!importResult?.errors?.length) return
    const rows = [
      ['Row Number', 'Reason'],
      ...importResult.errors.map(e => [e.rowNumber, e.reason].map(v =>
        typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v
      )),
    ]
    downloadFile(
      rows.map(r => r.join(',')).join('\n'),
      `${templateFilename.replace('-template', '')}-errors.csv`
    )
  }

  const handleReset = () => {
    setFile(null)
    setParsedData(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDone = () => {
    handleReset()
    setDefaultPassword('')
    onClose()
  }

  const pageSize = 8
  const pageRows = parsedData?.rows?.slice((previewPage - 1) * pageSize, previewPage * pageSize) || []

  if (!mounted) return null
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-purple-100 dark:border-purple-900/40 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gradient-to-r from-purple-50/50 via-white to-violet-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-violet-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-600/30">
              <Users className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
          </div>
          <button onClick={handleDone} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {importResult ? (
            /* ---------- RESULT ---------- */
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col items-center text-center py-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${importResult.failedCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  {importResult.failedCount > 0
                    ? <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                    : <CheckCircle2 className="w-8 h-8 text-green-500 dark:text-green-400" />}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {importResult.failedCount === 0 ? 'Import Successful!' : 'Import Completed with Errors'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{plural.charAt(0).toUpperCase() + plural.slice(1)} import summary</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Rows</span>
                  <div className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{importResult.totalRows ?? 0}</div>
                </div>
                <div className="p-4 rounded-2xl border border-green-100 dark:border-green-900/30 bg-green-50/60 dark:bg-green-950/20">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Imported</span>
                  <div className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">{importResult.importedCount ?? 0}</div>
                </div>
                <div className={`p-4 rounded-2xl border ${importResult.failedCount > 0 ? 'border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60'}`}>
                  <span className={`text-xs font-medium ${importResult.failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>Failed Rows</span>
                  <div className={`text-2xl font-black mt-1 ${importResult.failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{importResult.failedCount ?? 0}</div>
                </div>
                <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">File</span>
                  <div className="text-sm font-bold mt-1 text-gray-900 dark:text-white truncate">{file?.name || '-'}</div>
                </div>
              </div>

              {importResult.failedCount === 0 ? (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
                  <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800 dark:text-green-300">
                    <span className="font-semibold">All {plural} imported.</span>
                    {importResult.imported?.length > 0 && ` ${importResult.imported.length} ${plural} created successfully.`}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                    <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">Partial Import Result:</span> {importResult.importedCount} succeeded, {importResult.failedCount} failed.
                      The following rows could not be imported — fix them in the CSV and re-import.
                    </div>
                  </div>
                  <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Row Errors ({importResult.errors?.length || 0})</span>
                      <button
                        onClick={handleDownloadErrors}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Download Errors CSV
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/20 text-xs">
                      {(importResult.errors || []).map((err, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 bg-red-50/50 dark:bg-red-950/10">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold text-[10px] whitespace-nowrap">Row {err.rowNumber}</span>
                          <span className="text-red-700 dark:text-red-300 break-words">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-1">
                <button onClick={handleReset} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Import Another File
                </button>
                <button onClick={handleDone} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 hover:from-purple-700 hover:to-violet-700 transition-all">
                  <CheckCircle2 className="w-4 h-4" /> Done
                </button>
              </div>
            </div>
          ) : (
            /* ---------- STEP 1: TEMPLATE ---------- */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">1</span>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Download Template</h3>
              </div>
              <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{templateFilename}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV format — headers: {templateHeaders.join(', ')}</p>
                  </div>
                </div>
                <button onClick={handleDownloadTemplate} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors whitespace-nowrap">
                  <FileDown className="w-4 h-4" /> Download Template
                </button>
              </div>
              {helpLines.length > 0 && (
                <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 space-y-1.5">
                  {helpLines.map((line, i) => (
                    <p key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {!importResult && (
            <>
              {/* ---------- STEP 2: UPLOAD ---------- */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Upload CSV File</h3>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
                    isDragging
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                      : file
                        ? 'border-green-300 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/10'
                        : 'border-purple-200 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFileSelected(e.target.files?.[0])} />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB • {previewMeta.total} data row{previewMeta.total === 1 ? '' : 's'}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <RefreshCw className="w-3 h-3" /> Click to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                        <FileUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Drag &amp; drop your CSV here, or click to browse</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Only .csv files are supported</p>
                    </div>
                  )}
                </div>

                {showPasswordField && (
                  <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                      Default Password <span className="font-normal text-gray-400">(optional — used when the Password column is blank)</span>
                    </label>
                    <input
                      type="text"
                      value={defaultPassword}
                      onChange={(e) => setDefaultPassword(e.target.value)}
                      placeholder={passwordPlaceholder}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
                    />
                  </div>
                )}

                {file && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-green-600 dark:text-green-400">— ready to import.</span>
                  </div>
                )}
              </div>

              {/* ---------- STEP 3: PREVIEW ---------- */}
              {parsedData && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">3</span>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Preview</h3>
                    <span className="text-xs text-gray-400">First {pageSize} of {previewMeta.total} rows</span>
                  </div>

                  {missingColumns.length > 0 && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-700 dark:text-red-300">
                        <span className="font-semibold">Missing required column{missingColumns.length > 1 ? 's' : ''}:</span>{' '}
                        {missingColumns.join(', ')}. Upload a file with the correct headers.
                      </div>
                    </div>
                  )}

                  <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-14">#</th>
                            {previewHeaders.map((h, i) => (
                              <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                          {pageRows.slice(0, pageSize).map((row) => (
                            <tr key={row._rowNum} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                              <td className="px-3 py-2 text-gray-400">{row._rowNum}</td>
                              {previewHeaders.map((h, i) => {
                                const key = h.toLowerCase().replace(/[^a-z0-9]/g, '')
                                return <td key={i} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[24ch] truncate">{row[key] || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                              })}
                            </tr>
                          ))}
                          {pageRows.length === 0 && (
                            <tr>
                              <td colSpan={previewHeaders.length + 1} className="px-3 py-6 text-center text-gray-400">No data rows found in this file.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2">
                <button onClick={handleDone} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || missingColumns.length > 0 || isSubmitting}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    !file || missingColumns.length > 0
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-600/30 hover:from-purple-700 hover:to-violet-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Importing {plural}...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" /> Import {plural.charAt(0).toUpperCase() + plural.slice(1)}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}