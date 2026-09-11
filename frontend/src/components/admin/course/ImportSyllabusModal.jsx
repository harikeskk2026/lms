'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import courseContentService from '@/services/courseContentService'
import api from '@/lib/api'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXT = ['csv', 'xlsx', 'xls']

function getExtension(name) {
  if (!name) return ''
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}

export default function ImportSyllabusModal({ courseId, open, onClose, onImported }) {
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [expandedModules, setExpandedModules] = useState({})
  const inputRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  function reset() {
    setFile(null)
    setPreview(null)
    setExpandedModules({})
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !importLoading) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, importLoading])

  if (!open || !mounted) return null

  async function downloadTemplate(format) {
    try {
      // Try backend template endpoint first
      const response = await api.get(`/courses/${courseId}/modules/import/template`, {
        params: { format },
        responseType: 'blob',
      })
      const blob = new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'csv' ? 'syllabus_template.csv' : 'syllabus_template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} template downloaded`)
    } catch (err) {
      // Fallback: generate client-side CSV
      const headers = ['Module','Module Description','Module Duration','Duration Unit','Module Status','Topic','Topic Description','Topic Duration (Hours)','Topic Status']
      const rows = [
        ['Module 1','Introduction to Web Development','10','HOURS','PUBLISHED','HTML Basics','Introduction to HTML','3','PUBLISHED'],
        ['Module 1','Introduction to Web Development','10','HOURS','PUBLISHED','HTML Tags','Common HTML tags','4','PUBLISHED'],
        ['Module 1','Introduction to Web Development','10','HOURS','PUBLISHED','HTML Forms','Creating forms','3','DRAFT'],
        ['Module 2','CSS Fundamentals','2','DAYS','DRAFT','CSS Basics','Introduction to CSS','8','DRAFT'],
      ]
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
      if (format === 'csv') {
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'syllabus_template.csv'
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // For xlsx fallback, we still give csv with xlsx extension note, or generate simple csv with xlsx name
        // Create a blob as csv but name xlsx - will still open in Excel
        const blob = new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'syllabus_template.xlsx'
        a.click()
        URL.revokeObjectURL(url)
        toast('Excel template downloaded as CSV-compatible file (open in Excel)', { icon: 'ℹ️' })
      }
    }
  }

  function validateFile(f) {
    if (!f) return 'No file selected'
    const ext = getExtension(f.name)
    if (!ALLOWED_EXT.includes(ext)) return 'Unsupported file format. Supported: .xlsx, .xls, .csv'
    if (f.size > MAX_SIZE) return 'File size exceeds 5 MB limit'
    return null
  }

  function handleFileSelected(f) {
    const err = validateFile(f)
    if (err) {
      toast.error(err)
      return
    }
    setFile(f)
    setPreview(null)
    doPreview(f)
  }

  async function doPreview(f) {
    setPreviewLoading(true)
    try {
      const res = await courseContentService.previewImportSyllabus(courseId, f)
      // apiCall returns ApiResponse envelope: {success, message, data}
      const data = res.data || res
      setPreview(data)
      // expand all modules by default
      if (data.modules) {
        const exp = {}
        data.modules.forEach((m, idx) => { exp[idx] = true })
        setExpandedModules(exp)
      }
      if (data.valid) toast.success('Preview validated successfully')
      else toast.error(`Validation failed: ${data.errors?.length || 0} error(s)`)
    } catch (e) {
      toast.error(e.message || 'Failed to preview file')
      // also set preview with errors if available via e.errors?
      if (e.errors) {
        setPreview({ valid: false, errors: e.errors.map(msg => ({ message: msg, field: '', rowNumber: 0 })), totalModules:0, totalTopics:0, totalDurationHours:0, modules: [] })
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleConfirmImport() {
    if (!file || !preview?.valid) return
    setImportLoading(true)
    try {
      await courseContentService.confirmImportSyllabus(courseId, file)
      toast.success('Syllabus imported successfully')
      handleClose()
      onImported?.()
    } catch (e) {
      toast.error(e.message || 'Import failed')
    } finally {
      setImportLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelected(f)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !importLoading) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">Import Syllabus</h2>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-3.5 sm:px-6 py-3.5 sm:py-5 space-y-4 sm:space-y-5">
          {/* Step 1: Download Template */}
          <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 sm:p-4">
            <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Step 1 — Download Template</p>
            <p className="text-[11px] sm:text-xs text-gray-500 mb-3">Use the template to format your syllabus correctly. Includes example rows.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('xlsx')}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
              >
                <Download size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Download Excel Template</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate('csv')}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
              >
                <Download size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Download CSV Template</span>
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-400 mt-2 leading-relaxed">
              Columns: Module, Module Description, Module Duration, Duration Unit, Module Status, Topic, Topic Description, Topic Duration (Hours), Topic Status
            </p>
          </div>

          {/* Step 2: Upload */}
          <div>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1.5">Step 2 — Upload</p>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true)}}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <Upload size={24} className="mx-auto text-purple-500 mb-2 sm:size-7" />
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 break-words px-2">
                {file ? file.name : 'Drag & drop or click to browse'}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-1">Supported: Excel (.xlsx, .xls) and CSV (.csv) — Maximum 5 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelected(f)
                  e.target.value = ''
                }}
              />
              {file && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium max-w-full truncate">
                  <FileSpreadsheet size={13} className="shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-[11px] opacity-75">({(file.size/1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Preview */}
          {previewLoading && (
            <div className="text-center py-6 text-xs sm:text-sm text-gray-500 animate-pulse flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Validating and generating preview...</span>
            </div>
          )}

          {preview && !previewLoading && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 bg-gray-50/50 dark:bg-gray-800/30">
                <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2.5">Step 3 — Preview Summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 sm:p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{preview.totalModules}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-semibold">Modules</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 sm:p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{preview.totalTopics}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-semibold">Topics</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 sm:p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{preview.totalDurationHours}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-semibold">Total Hours</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 sm:p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center min-h-[58px]">
                    {preview.valid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                        <CheckCircle size={15} /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm">
                        <AlertTriangle size={15} /> Invalid
                      </span>
                    )}
                    <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-semibold mt-0.5">Status</p>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {!preview.valid && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 mb-2">
                    Import cannot continue. {preview.errors?.length || 0} validation error(s) found:
                  </p>
                  <div className="space-y-2 max-h-52 sm:max-h-60 overflow-y-auto pr-1">
                    {preview.errors?.map((err, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg p-2.5 sm:p-3 border border-red-100 dark:border-red-900/30 text-xs">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          Row {err.rowNumber}
                          {err.moduleName ? ` — Module: ${err.moduleName}` : ''}
                          {err.topicName ? ` — Topic: ${err.topicName}` : ''}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                          <span className="font-medium text-red-600 dark:text-red-400">{err.field ? `${err.field}: ` : ''}</span>
                          {err.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hierarchy */}
              {preview.modules && preview.modules.length > 0 && (
                <div className="space-y-2.5 sm:space-y-3">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Syllabus Hierarchy Preview
                  </p>
                  {preview.modules.map((m, mi) => (
                    <div key={mi} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedModules(prev => ({ ...prev, [mi]: !prev[mi] }))}
                        className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800/80 text-left hover:bg-gray-100/70 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-gray-400 shrink-0">
                            {expandedModules[mi] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 break-words">
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${
                            m.status === 'DRAFT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}>
                            {m.status}
                          </span>
                          {m.durationValue && (
                            <span className="text-[11px] sm:text-xs text-gray-400 hidden xs:inline-flex items-center gap-1">
                              <Clock size={11}/>{m.durationValue} {m.durationUnit?.toLowerCase()}
                            </span>
                          )}
                          <span className="text-[11px] sm:text-xs text-gray-400">
                            ({m.topics?.length || 0})
                          </span>
                        </div>
                      </button>
                      {m.description && (
                        <p className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 break-words">
                          {m.description}
                        </p>
                      )}
                      {expandedModules[mi] && (
                        <div className="px-2.5 sm:px-4 py-2.5 sm:py-3 space-y-1.5 sm:space-y-2 bg-gray-50/40 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
                          {(m.topics || []).map((t, ti) => (
                            <div key={ti} className="p-2 sm:p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-gray-900">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                  {ti + 1}. {t.title}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  t.status === 'DRAFT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                }`}>
                                  {t.status}
                                </span>
                                {t.durationHours && (
                                  <span className="text-[10px] sm:text-[11px] text-gray-400 inline-flex items-center gap-0.5">
                                    <Clock size={10}/> {t.durationHours}h
                                  </span>
                                )}
                              </div>
                              {t.description && (
                                <p className="text-[11px] text-gray-500 mt-1 break-words">{t.description}</p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-0.5">Row {t.rowNumber}</p>
                            </div>
                          ))}
                          {(!m.topics || m.topics.length === 0) && (
                            <p className="text-xs text-gray-400 italic">No topics</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!preview?.valid || importLoading || previewLoading}
            onClick={handleConfirmImport}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-colors text-center shadow-sm"
          >
            {importLoading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
