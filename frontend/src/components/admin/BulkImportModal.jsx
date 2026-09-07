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
  Users,
  GraduationCap,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import studentService from '@/services/studentService'
import { isValidEmail, isValidPhone, isValidPassword } from '@/utilities/validators'

/**
 * Parses a simple CSV string on the client side for instant preview and validation.
 */
function parseClientCsv(text) {
  const lines = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false

  // Strip BOM if present
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
      if (ch === '\r' && cleanText[i + 1] === '\n') {
        i++
      }
      currentRow.push(currentField.trim())
      currentField = ''
      if (currentRow.some(c => c.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
    } else {
      currentField += ch
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(c => c.length > 0)) {
      lines.push(currentRow)
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const rawHeaders = lines[0]

  const rows = lines.slice(1).map((rowTokens, idx) => {
    const rowObj = { _rowNum: idx + 2 }
    headers.forEach((h, i) => {
      rowObj[h] = rowTokens[i] || ''
    })
    rowObj.name = rowObj.name || rowObj.studentname || rowObj.fullname || ''
    rowObj.email = rowObj.email || rowObj.studentemail || rowObj.emailaddress || ''
    rowObj.phone = rowObj.phone || rowObj.mobile || rowObj.phonenumber || ''
    rowObj.password = rowObj.password || ''
    rowObj.course = rowObj.course || rowObj.coursetitle || rowObj.coursename || ''
    rowObj.batch = rowObj.batch || rowObj.batchname || ''
    rowObj.placementStatus = rowObj.placementstatus || rowObj.placement || rowObj.status || 'SEEKING'
    return rowObj
  })

  return { headers: rawHeaders, rows }
}

export default function BulkImportModal({ open, onClose, courses = [], batches = [], onSuccess }) {
  const [enrollMode, setEnrollMode] = useState(false) // default: false (Create Students Only)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')

  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [importResult, setImportResult] = useState(null)

  const fileInputRef = useRef(null)

  // Filter only PUBLISHED courses
  const publishedCourses = useMemo(() => {
    return courses.filter(c => c.status === 'PUBLISHED')
  }, [courses])

  // Filter batches matching selectedCourseId
  const batchesForCourse = useMemo(() => {
    if (!selectedCourseId) return []
    return batches.filter(b => String(b.course?.id) === String(selectedCourseId))
  }, [batches, selectedCourseId])

  // Pre-validate rows client side (must be at top level before any early returns)
  const clientValidation = useMemo(() => {
    if (!parsedData?.rows) return { validRows: 0, invalidRows: 0, rowIssues: {} }
    const rowIssues = {}
    let validCount = 0
    const seenEmails = new Set()

    parsedData.rows.forEach(r => {
      const issues = []
      if (!r.name || r.name.trim().length < 2) {
        issues.push('Name required (min 2 chars)')
      }
      if (!r.email) {
        issues.push('Email required')
      } else if (!isValidEmail(r.email)) {
        issues.push('Invalid email format')
      } else if (seenEmails.has(r.email.toLowerCase())) {
        issues.push('Duplicate email in file')
      } else {
        seenEmails.add(r.email.toLowerCase())
      }

      if (r.phone && !isValidPhone(r.phone)) {
        issues.push('Phone must be 10 digits starting with 6-9')
      }

      if (r.password && !isValidPassword(r.password)) {
        issues.push('Password must be 8+ chars (Upper, lower, digit, special)')
      }

      if (enrollMode) {
        if (!r.course && !selectedCourseId) {
          issues.push('Course required (or select default course)')
        }
      }

      if (issues.length > 0) {
        rowIssues[r._rowNum] = issues
      } else {
        validCount++
      }
    })

    return {
      validRows: validCount,
      invalidRows: parsedData.rows.length - validCount,
      rowIssues,
    }
  }, [parsedData, enrollMode, selectedCourseId])

  if (!open) return null

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId)
    setSelectedBatchId('')
  }

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    setFile(selectedFile)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const parsed = parseClientCsv(text)
        setParsedData(parsed)
      } catch (err) {
        toast.error('Failed to parse CSV preview: ' + err.message)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const downloadSampleTemplate = () => {
    let headers, rows, filename
    if (!enrollMode) {
      headers = 'Name,Email,Phone,Password,Placement Status'
      rows = [
        `"Aarav Sharma","aarav.sharma@example.com","9876543210","Student@123","SEEKING"`,
        `"Diya Patel","diya.patel@example.com","9876543211","","SEEKING"`,
        `"Rohan Verma","rohan.verma@example.com","9876543212","Student@123","INTERVIEWING"`,
      ]
      filename = 'students_create_only_template.csv'
    } else {
      const sampleCourse = (selectedCourseId && publishedCourses.find(c => String(c.id) === String(selectedCourseId))?.title)
        || publishedCourses[0]?.title
        || 'Full Stack Java'
      const sampleBatch = (selectedBatchId && batchesForCourse.find(b => String(b.id) === String(selectedBatchId))?.name)
        || batchesForCourse[0]?.name
        || 'Morning Batch A'
      headers = 'Name,Email,Phone,Password,Course,Batch,Placement Status'
      rows = [
        `"Aarav Sharma","aarav.sharma@example.com","9876543210","Student@123","${sampleCourse}","${sampleBatch}","SEEKING"`,
        `"Diya Patel","diya.patel@example.com","9876543211","","${sampleCourse}","","SEEKING"`,
        `"Rohan Verma","rohan.verma@example.com","9876543212","Student@123","","","INTERVIEWING"`,
      ]
      filename = 'students_and_enrollment_template.csv'
    }

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadErrorReport = () => {
    if (!importResult?.errors || importResult.errors.length === 0) return

    const headers = ['Row Number', 'Name', 'Email', 'Error Reason']
    const rows = importResult.errors.map(err => [
      err.rowNumber || '',
      `"${(err.name || '').replace(/"/g, '""')}"`,
      `"${(err.email || '').replace(/"/g, '""')}"`,
      `"${(err.reason || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `import_errors_${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSubmitImport = async () => {
    if (!file) {
      toast.error('Please choose a CSV file first')
      return
    }

    if (enrollMode && !selectedCourseId) {
      // Check if any row in CSV lacks course
      const hasRowWithoutCourse = parsedData?.rows?.some(r => !r.course)
      if (hasRowWithoutCourse) {
        toast.error('Please select a Default Course for rows without course specified in CSV')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await studentService.bulkImport({
        file,
        enrollImportedStudents: enrollMode,
        defaultCourseId: selectedCourseId ? Number(selectedCourseId) : null,
        defaultBatchId: selectedBatchId ? Number(selectedBatchId) : null,
      })

      const data = response?.data || response
      setImportResult(data)

      if (data.importedCount > 0) {
        toast.success(`Successfully imported ${data.importedCount} student${data.importedCount > 1 ? 's' : ''}!`)
        if (onSuccess) onSuccess()
      } else if (data.failedCount > 0) {
        toast.error(`Import failed: ${data.failedCount} row${data.failedCount > 1 ? 's' : ''} had errors.`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to import students')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleReset = () => {
    setFile(null)
    setParsedData(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDone = () => {
    handleReset()
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-purple-100 dark:border-purple-900/40 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-50/50 via-white to-violet-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-violet-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Import Students</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Upload a CSV file to onboard multiple students seamlessly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800/40"
              title="Download formatted sample CSV file"
            >
              <FileDown size={14} /> {enrollMode ? 'Download Enrollment Template' : 'Download Template (Students Only)'}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Result View (shown after import completes) */}
          {importResult ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500">Total Rows</span>
                  <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{importResult.totalRows}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Successfully Imported</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{importResult.importedCount}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Enrolled in Course</span>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{importResult.enrolledCount}</div>
                </div>
                <div className={`p-4 rounded-2xl border ${importResult.failedCount > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-800'}`}>
                  <span className={`text-xs font-medium ${importResult.failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>Failed Rows</span>
                  <div className={`text-2xl font-black mt-1 ${importResult.failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{importResult.failedCount}</div>
                </div>
              </div>

              {/* Status Banner */}
              {importResult.failedCount === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">All {importResult.importedCount} students were imported successfully!</span>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Account credentials have been generated and saved.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-sm">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Partial Import Result:</span> {importResult.importedCount} succeeded, {importResult.failedCount} failed.
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">Review the failure details below or download the error report to correct the CSV.</p>
                      </div>
                    </div>
                    <button
                      onClick={downloadErrorReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 transition-colors whitespace-nowrap"
                    >
                      <FileDown size={14} /> Download Error CSV
                    </button>
                  </div>

                  {/* Errors Detail Table */}
                  <div className="rounded-2xl border border-red-200 dark:border-red-900/40 overflow-hidden">
                    <div className="bg-red-50/50 dark:bg-red-950/20 px-4 py-2.5 text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider border-b border-red-100 dark:border-red-900/30">
                      Failed Rows Breakdown ({importResult.errors.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/20 text-xs">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md font-mono bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold">
                              Row {err.rowNumber}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{err.name || '—'}</span>
                            <span className="text-gray-500 dark:text-gray-400">({err.email || 'No email'})</span>
                          </div>
                          <div className="text-red-600 dark:text-red-400 font-medium">
                            {err.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Upload & Configuration Form */
            <div className="space-y-6">
              {/* Mode Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  1. Enrollment Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setEnrollMode(false)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      !enrollMode
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-sm shadow-purple-500/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 ${!enrollMode ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        <Users size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">Create Students Only</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Default</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Creates student accounts without enrolling them into a course. Courses/batches can be assigned later.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setEnrollMode(true)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      enrollMode
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-sm shadow-purple-500/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 ${enrollMode ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">Create & Enroll Students</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Enrolls students into a specified published course and optional batch upon account creation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course & Batch Selectors (When Enrollment Mode is Enabled) */}
              {enrollMode && (
                <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                    <GraduationCap size={14} /> Course & Batch Assignment Defaults
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Course * <span className="text-gray-400 font-normal">(Only Published)</span>
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="">Select Published Course...</option>
                        {publishedCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Applied when row's Course column is empty in CSV.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Batch <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        disabled={!selectedCourseId}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        <option value="">No Batch / Direct Course Enrollment</option>
                        {batchesForCourse.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (Max {b.maxStudents})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Filtered strictly to batches of the selected course.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  2. Upload CSV File
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 scale-[1.01]'
                      : file
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileText size={24} />
                      </div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB &bull; {parsedData?.rows?.length || 0} student rows detected
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReset()
                        }}
                        className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-700 underline"
                      >
                        Choose a different file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">
                        Drag and drop your student CSV file here
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                        {enrollMode
                          ? 'Accepts CSV with headers: Name, Email, Phone, Password, Course, Batch, Placement Status (Course/Batch can also be defaulted above).'
                          : 'Accepts CSV with headers: Name, Email, Phone, Password, Placement Status (no course or batch assignment required).'}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                        Browse Files
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview Table */}
              {parsedData?.rows && parsedData.rows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      3. Data Preview & Pre-validation ({parsedData.rows.length} rows)
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {clientValidation.validRows} Ready
                      </span>
                      {clientValidation.invalidRows > 0 && (
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          {clientValidation.invalidRows} Warnings/Issues
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="max-h-56 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 sticky top-0 font-semibold border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-3 py-2">Row</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Phone</th>
                            {enrollMode && <th className="px-3 py-2">Course</th>}
                            {enrollMode && <th className="px-3 py-2">Batch</th>}
                            <th className="px-3 py-2">Placement</th>
                            <th className="px-3 py-2">Status / Issues</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {parsedData.rows.slice(0, 10).map((r) => {
                            const issues = clientValidation.rowIssues[r._rowNum]
                            return (
                              <tr key={r._rowNum} className={issues ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                                <td className="px-3 py-2 font-mono text-gray-400">#{r._rowNum}</td>
                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{r.name || '—'}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.email || '—'}</td>
                                <td className="px-3 py-2 text-gray-500">{r.phone || '—'}</td>
                                {enrollMode && (
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                    {r.course || (selectedCourseId ? publishedCourses.find(c => String(c.id) === String(selectedCourseId))?.title : '—')}
                                  </td>
                                )}
                                {enrollMode && (
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                    {r.batch || (selectedBatchId ? batchesForCourse.find(b => String(b.id) === String(selectedBatchId))?.name : '—')}
                                  </td>
                                )}
                                <td className="px-3 py-2 text-gray-500">{r.placementStatus || 'SEEKING'}</td>
                                <td className="px-3 py-2">
                                  {issues ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                      <AlertCircle size={12} /> {issues[0]}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                      <CheckCircle2 size={12} /> Valid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.rows.length > 10 && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-2 text-center text-xs text-gray-500">
                        Showing first 10 of {parsedData.rows.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          {importResult ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={15} /> Import Another File
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitImport}
                disabled={!file || isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Importing Students...
                  </>
                ) : (
                  <>
                    <FileUp size={16} /> Import {parsedData?.rows?.length ? `${parsedData.rows.length} Students` : 'Students'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
