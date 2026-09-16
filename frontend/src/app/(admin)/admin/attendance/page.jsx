'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  CheckSquare, Save, BarChart2, Bell, Users, BookOpen,
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  FileDown, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Calendar, ClipboardList,
  Copy, FileEdit, XCircle, History, Paperclip, Upload, FileText, X,
  Video, MapPin, Clock, User, Eye, ArrowRight, ExternalLink, Sparkles, CheckCircle2, Laptop,
  Search, LayoutGrid, ListFilter, Trash2
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import assignmentService from '@/services/assignmentService'

import { format } from 'date-fns'
import AttendanceMatrix from '@/components/admin/AttendanceMatrix'
import AttendanceHeatmap from '@/components/admin/AttendanceHeatmap'
import HistoryTab from './HistoryTab'
import CustomSelect from '@/components/ui/CustomSelect'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'

// recharts is a heavy dependency - load it only for the trend charts below,
// and only on the client (SSR doesn't need it).
import {
  AttendanceDailyTrendChart,
  WeeklyAttendanceRateChart,
  MonthlyAttendanceBreakdownChart
} from '@/components/admin/attendance/AttendanceTrendCharts'

// ─── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PRESENT: { label: 'P',  color: 'bg-green-500 text-white',  hover: 'hover:bg-green-100 hover:text-green-700' },
  ABSENT:  { label: 'A',  color: 'bg-red-500 text-white',    hover: 'hover:bg-red-100 hover:text-red-700' },
}



function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, iconColor = 'text-purple-600' }) {
  return (
    <GlassCard className="p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center ${iconColor}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-yellow-600 font-semibold mt-0.5">{sub}</p>}
      </div>
    </GlassCard>
  )
}

function Skeleton({ className = 'h-32' }) {
  return <div className={`rounded-2xl bg-purple-50 dark:bg-purple-900/20 animate-pulse ${className}`} />
}

function PctBar({ pct }) {
  const color =
    pct >= 85 ? 'bg-green-500' :
    pct >= 75 ? 'bg-yellow-400' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-9 text-right">{pct}%</span>
    </div>
  )
}

// ─── TAB 1: Mark Attendance ────────────────────────────────────────────────────

function getClassDateStr(dateVal) {
  if (!dateVal) return ''
  try {
    if (Array.isArray(dateVal)) {
      const [yr, mo, dy] = dateVal
      return `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`
    }
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return ''
    const yr = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const dy = String(d.getDate()).padStart(2, '0')
    return `${yr}-${mo}-${dy}`
  } catch {
    return ''
  }
}

function formatClassOptionLabel(c) {
  if (!c) return 'Select class'
  let datePart = ''
  if (c.date) {
    try {
      if (Array.isArray(c.date)) {
        const [yr, mo, dy] = c.date
        const d = new Date(yr, mo - 1, dy)
        datePart = d.toLocaleDateString('en-IN')
      } else {
        const d = new Date(c.date)
        if (!isNaN(d.getTime())) {
          datePart = d.toLocaleDateString('en-IN')
        }
      }
    } catch {}
  }
  const titlePart = c.title || `Class #${c.id}`
  return datePart ? `${datePart} — ${titlePart}` : titlePart
}

function MarkAttendanceTab({ onAttendanceSaved, initialBatchId, initialClassId, refreshKey = 0 }) {
  const [batches, setBatches]             = useState([])
  const [classes, setClasses]             = useState([])
  const [selectedBatch, setSelectedBatch] = useState(initialBatchId ? String(initialBatchId) : '')
  const [selectedClass, setSelectedClass] = useState(initialClassId ? String(initialClassId) : '')
  const [sheet, setSheet]                 = useState(null)
  const [batchDetail, setBatchDetail]     = useState(null)
  const [statuses, setStatuses]           = useState({})
  const [remarks, setRemarks]             = useState({})
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saveResult, setSaveResult]       = useState(null)
  const [classNotes, setClassNotes]       = useState('')
  const [attachments, setAttachments]     = useState([])
  const [uploading, setUploading]         = useState(false)
  const [copying, setCopying]             = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedIds, setSelectedIds]     = useState([])
  const [bulkStatus, setBulkStatus]       = useState('PRESENT')
  const [history, setHistory]             = useState([])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(studentSearch), 400)
    return () => clearTimeout(timer)
  }, [studentSearch])

  useEffect(() => {
    if (!selectedClass || !sheet) return
    let isCancelled = false
    adminApi.getAttendanceSheet(selectedClass, debouncedSearch)
      .then(res => {
        if (isCancelled) return
        const rawSheet = res.data?.data
        const studentList = Array.isArray(rawSheet) ? rawSheet : (rawSheet?.students || [])
        setSheet(prev => prev ? { ...prev, students: studentList } : prev)
      })
      .catch(err => console.error('Failed to search students via API:', err))
    return () => { isCancelled = true }
  }, [debouncedSearch, selectedClass])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await assignmentService.upload(file)
      const fileUrl = res.data?.url || res.data?.fileUrl || (typeof res.data === 'string' ? res.data : '')
      const fileName = res.data?.fileName || res.data?.originalName || file.name
      const newAttachment = {
        name: fileName,
        url: fileUrl,
        size: (file.size / 1024).toFixed(1) + ' KB'
      }
      setAttachments(prev => [...prev, newAttachment])
      toast.success(`Attached ${file.name}`)
    } catch (err) {
      console.error('Attachment upload failed:', err)
      toast.error(err?.response?.data?.message || err?.message || `Failed to upload ${file.name}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const syncUrlParams = (bId, cId) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'mark')
      if (bId) url.searchParams.set('batchId', String(bId))
      else url.searchParams.delete('batchId')
      if (cId) url.searchParams.set('classId', String(cId))
      else url.searchParams.delete('classId')
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch {}
  }

  const fetchAttendanceSheet = async (classId, batchId, classList = classes, batchList = batches) => {
    if (!classId) return toast.error('Select a class')
    setLoading(true)
    setSaveResult(null)
    try {
      const targetBatchId = batchId || selectedBatch
      const [sheetRes, detailRes] = await Promise.allSettled([
        adminApi.getAttendanceSheet(classId),
        targetBatchId ? adminApi.getBatchAttDetail(targetBatchId) : Promise.reject(),
      ])
      if (sheetRes.status === 'rejected') {
        const errorMsg = sheetRes.reason?.response?.data?.message || sheetRes.reason?.response?.data?.error || sheetRes.reason?.message || 'Failed to load attendance sheet'
        toast.error(errorMsg)
        setLoading(false)
        return
      }
      const rawSheet = sheetRes.status === 'fulfilled' ? sheetRes.value.data?.data : null
      const detailData = detailRes.status === 'fulfilled' ? detailRes.value.data?.data : null

      const currentClasses = (classList && classList.length > 0) ? classList : classes
      const currentBatches = (batchList && batchList.length > 0) ? batchList : batches

      const selectedClassObj = currentClasses.find(c => String(c.id) === String(classId))
      const selectedBatchObj = currentBatches.find(b => String(b.id) === String(targetBatchId))

      const studentList = Array.isArray(rawSheet) ? rawSheet : (rawSheet?.students || [])

      const formattedSheet = {
        class: selectedClassObj ? {
          id: selectedClassObj.id,
          title: selectedClassObj.title,
          date: selectedClassObj.date,
          batch: selectedBatchObj || (rawSheet?.class?.batch) || { name: 'Batch' }
        } : (rawSheet?.class || { title: 'Class', date: new Date().toISOString(), batch: selectedBatchObj || { name: 'Batch' } }),
        students: studentList
      }

      setSheet(formattedSheet)
      setBatchDetail(detailData)

      const init = {}
      const initRemarks = {}
      for (const s of studentList) {
        init[s.studentId] = s.status || 'ABSENT'
        if (s.remarks) initRemarks[s.studentId] = s.remarks
      }
      setStatuses(init)
      setRemarks(initRemarks)
      setSelectedIds([])
      setStudentSearch('')
      setHistory([])
      const rawNotes = selectedClassObj?.notes || rawSheet?.class?.notes || ''
      const parsedAttachments = []
      const cleanNotes = typeof rawNotes === 'string' ? rawNotes.replace(/\[Attachment:\s*([^\]]+)\]\(([^)]+)\)/g, (match, name, url) => {
        parsedAttachments.push({ name: name.trim(), url: url.trim() })
        return ''
      }).trim() : ''
      setClassNotes(cleanNotes)
      setAttachments(parsedAttachments)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load attendance sheet')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async (batchId, autoClassId = null) => {
    const bId = batchId ? String(batchId) : ''
    const cId = autoClassId ? String(autoClassId) : ''
    setSelectedBatch(bId)
    setSelectedClass(cId)
    setSheet(null)
    setSaveResult(null)
    setClassNotes('')
    setAttachments([])
    syncUrlParams(bId, cId)
    if (!bId) {
      setClasses([])
      return
    }
    try {
      setLoading(true)
      const r = await adminApi.getClasses({ batchId: bId })
      const clsList = r.data?.data || []
      setClasses(clsList)

      if (cId) {
        setSelectedClass(cId)
        await fetchAttendanceSheet(cId, bId, clsList, batches)
      } else if (clsList.length > 0) {
        setSelectedClass(String(clsList[0].id))
        syncUrlParams(bId, clsList[0].id)
        await fetchAttendanceSheet(clsList[0].id, bId, clsList, batches)
      }
    } catch {
      toast.error('Failed to load classes for batch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const bRes = await adminApi.getBatches({ isActive: 'true' })
        const batchList = bRes.data?.data || []
        if (!isMounted) return
        setBatches(batchList)

        const targetBatchId = (initialBatchId !== undefined && initialBatchId !== null && initialBatchId !== '') ? String(initialBatchId) : selectedBatch
        const targetClassId = (initialClassId !== undefined && initialClassId !== null && initialClassId !== '') ? String(initialClassId) : selectedClass

        if (targetBatchId) {
          setSelectedBatch(targetBatchId)
          const cRes = await adminApi.getClasses({ batchId: targetBatchId })
          const clsList = cRes.data?.data || []
          if (!isMounted) return
          setClasses(clsList)

          if (targetClassId) {
            setSelectedClass(targetClassId)
            syncUrlParams(targetBatchId, targetClassId)
            await fetchAttendanceSheet(targetClassId, targetBatchId, clsList, batchList)
          } else if (clsList.length > 0) {
            setSelectedClass(String(clsList[0].id))
            syncUrlParams(targetBatchId, clsList[0].id)
            await fetchAttendanceSheet(clsList[0].id, targetBatchId, clsList, batchList)
          } else {
            setSelectedClass('')
            syncUrlParams(targetBatchId, null)
          }
        }
      } catch (err) {
        console.error('Failed to initialize Mark Attendance tab:', err)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [initialBatchId, initialClassId, refreshKey])

  const loadSheet = () => fetchAttendanceSheet(selectedClass, selectedBatch, classes, batches)

  const saveAttendance = async (submit = true) => {
    setSaving(true)
    try {
      const records = Object.entries(statuses).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status,
        remarks: remarks[studentId]?.trim() || undefined,
      }))

      // Prepare notes with attachments if any
      let finalNotes = classNotes.trim()
      if (attachments.length > 0) {
        const attachmentText = attachments.map(a => `[Attachment: ${a.name}](${a.url})`).join('\n')
        finalNotes = finalNotes ? `${finalNotes}\n\n${attachmentText}` : attachmentText
      }

      const attendancePromise = submit
        ? adminApi.submitAttendance(selectedClass, records)
        : adminApi.saveAttendanceDraft(selectedClass, records)

      const updateClassPromise = (selectedClass && finalNotes)
        ? adminApi.updateClass(selectedClass, { notes: finalNotes })
        : Promise.resolve()

      await Promise.all([attendancePromise, updateClassPromise])

      if (finalNotes && selectedClass) {
        setClasses(prev => prev.map(c => String(c.id) === String(selectedClass) ? { ...c, notes: finalNotes } : c))
      }

      if (submit) {
        const counts = Object.fromEntries(Object.keys(STATUS_CONFIG).map(s => [s, 0]))
        for (const s of Object.values(statuses)) counts[s] = (counts[s] || 0) + 1
        setSaveResult(counts)
        toast.success('Attendance saved successfully')
        // Automatically close sheet and return to Today's Classes tab
        setTimeout(() => {
          setSheet(null)
          onAttendanceSaved?.(true)
        }, 700)
      } else {
        toast.success('Draft saved — class stays pending')
        onAttendanceSaved?.(false)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save attendance'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const pushHistory = () => setHistory(prev => [...prev, statuses])
  const undo = () => setHistory(prev => {
    if (!prev.length) return prev
    const last = prev[prev.length - 1]
    setStatuses(last)
    return prev.slice(0, -1)
  })

  const resetChanges = () => {
    const init = {}
    for (const s of (sheet?.students || [])) init[s.studentId] = s.status || 'ABSENT'
    setStatuses(init)
    setHistory([])
    setSelectedIds([])
    toast.success('Unsaved changes reset')
  }

  const setStatus = (studentId, status) => { pushHistory(); setStatuses(prev => ({ ...prev, [studentId]: status })) }
  const setRemark = (studentId, value) => setRemarks(prev => ({ ...prev, [studentId]: value }))
  const markAll   = (status) => { pushHistory(); setStatuses(prev => Object.fromEntries(Object.keys(prev).map(k => [k, status]))) }

  const toggleSelected = (studentId) => setSelectedIds(prev =>
    prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId])

  const applyBulkStatus = () => {
    if (!selectedIds.length) return
    pushHistory()
    setStatuses(prev => {
      const next = { ...prev }
      for (const id of selectedIds) next[id] = bulkStatus
      return next
    })
    setSelectedIds([])
  }

  const filteredStudents = sheet?.students || []

  const copyPrevious = async () => {
    setCopying(true)
    try {
      const r = await adminApi.copyPreviousAttendance(selectedClass)
      const prevSheet = r.data.data || []
      pushHistory()
      setStatuses(prev => {
        const next = { ...prev }
        for (const s of prevSheet) {
          if (s.studentId in next) next[s.studentId] = s.status
        }
        return next
      })
      toast.success('Copied previous class attendance')
    } catch {
      toast.error('No previous completed class found for this batch')
    } finally { setCopying(false) }
  }

  const counts = Object.fromEntries(Object.keys(STATUS_CONFIG).map(s => [s, 0]))
  for (const s of Object.values(statuses)) counts[s] = (counts[s] || 0) + 1

  // Build student pct map from batch detail
  const studentPctMap = {}
  if (batchDetail?.matrix) {
    for (const row of batchDetail.matrix) studentPctMap[row.studentId] = row.pct
  }

  return (
    <div className="space-y-5">
      {/* Save result banner */}
      {saveResult && (
        <GlassCard className="p-4 border-l-4 border-green-400 bg-green-50/50 dark:bg-green-900/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <p className="font-semibold text-green-800 dark:text-green-300 text-sm">
              Attendance saved — {saveResult.PRESENT} present, {saveResult.ABSENT} absent
            </p>
          </div>
        </GlassCard>
      )}

      {/* Step 1: Select */}
      <GlassCard className="p-6">
        <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4">Step 1 — Select Class</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch</label>
            <CustomSelect
              value={selectedBatch}
              onChange={(val) => loadClasses(val)}
              options={batches.map(b => ({ value: String(b.id), label: b.name }))}
              placeholder="Select batch"
              searchable={batches.length >= 10}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Class</label>
            <CustomSelect
              value={selectedClass}
              onChange={(val) => {
                const nextVal = val ? String(val) : ''
                setSelectedClass(nextVal)
                syncUrlParams(selectedBatch, nextVal)
              }}
              options={classes.map(c => ({
                value: String(c.id),
                label: formatClassOptionLabel(c)
              }))}
              placeholder={classes.length === 0 && selectedBatch ? "No classes scheduled for today" : "Select class"}
              emptyLabel="No related classes found for this date"
              disabled={!selectedBatch}
              searchable={classes.length >= 10}
            />
            {classes.length === 0 && selectedBatch && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                No active/scheduled classes found for today for this batch.
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            syncUrlParams(selectedBatch, selectedClass)
            fetchAttendanceSheet(selectedClass, selectedBatch, classes, batches)
          }}
          disabled={!selectedClass || loading}
          className="mt-4 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 transition-all"
        >
          <CheckSquare size={16} />
          {loading ? 'Loading...' : 'Load Attendance Sheet'}
        </button>
      </GlassCard>

      {/* Step 2: Mark */}
      {sheet && (
        <div className="space-y-5 pb-6">

          {/* Class info + counts */}
          <GlassCard className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSheet(null)
                  onAttendanceSaved?.(true)
                }}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/40 transition-colors shadow-sm shrink-0"
                title="Back to Today's Classes"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <p className="font-display font-bold text-gray-800 dark:text-white">{sheet.class?.title}</p>
                <p className="text-xs text-gray-500">{sheet.class?.batch?.name} · {sheet.class?.date ? format(new Date(sheet.class.date), 'd MMMM yyyy') : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(counts).map(([s, c]) => (
                <div key={s} className="text-center px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-extrabold text-gray-800 dark:text-white">{c}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">{s}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSheet(null)
                  onAttendanceSaved?.(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1"
              >
                <X size={13} /> Close
              </button>
            </div>
          </GlassCard>

          {/* Search + bulk selection + Undo/Reset */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
              placeholder="Search student by name, email, or enrollment no..."
              className="flex-1 min-w-[220px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-xs text-gray-500">Selected: {selectedIds.length}</span>
                  <CustomSelect
                    value={bulkStatus}
                    onChange={(val) => setBulkStatus(val)}
                    options={Object.keys(STATUS_CONFIG).map(s => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ') }))}
                    compact
                  />
                  <button onClick={applyBulkStatus}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                    Apply to Selected
                  </button>
                </>
              )}
              <button onClick={undo} disabled={!history.length}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                Undo
              </button>
              <button onClick={resetChanges}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Reset
              </button>
            </div>
          </div>

          {/* Student table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-purple-50/50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox"
                        checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={e => setSelectedIds(e.target.checked ? filteredStudents.map(s => s.studentId) : [])} />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Overall</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">No students match your search.</td></tr>
                  ) : filteredStudents.map((s) => {
                    const overallPct = studentPctMap[s.studentId]
                    return (
                      <tr key={s.studentId} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20 dark:hover:bg-purple-900/10">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(s.studentId)} onChange={() => toggleSelected(s.studentId)} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {overallPct !== undefined ? (
                            overallPct < 75 ? (
                              <span className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                <AlertTriangle size={10} /> Low: {overallPct}%
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">{overallPct}%</span>
                            )
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                              <button key={st} onClick={() => setStatus(s.studentId, st)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${statuses[s.studentId] === st ? cfg.color : 'bg-gray-100 dark:bg-gray-800 text-gray-400 ' + cfg.hover}`}>
                                {cfg.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input value={remarks[s.studentId] || ''} onChange={e => setRemark(s.studentId, e.target.value)}
                            placeholder="Optional remarks"
                            className="w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Class notes & Attachments */}
          <GlassCard className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Class Notes (optional)</label>
              <textarea
                value={classNotes}
                onChange={e => setClassNotes(e.target.value)}
                placeholder="Add notes about today's class, topics covered, announcements..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Class Attachments */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Paperclip size={14} className="text-purple-600 dark:text-purple-400" />
                  Class Attachments
                  <span className="text-[10px] text-gray-400 font-normal">(PDF, Slides, Docs, Images)</span>
                </label>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                  <Upload size={13} />
                  {uploading ? 'Uploading...' : 'Add Attachment'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip"
                  />
                </label>
              </div>

              {/* Attachments list */}
              {attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((file, idx) => {
                    const fileUrl = typeof file === 'string' ? file : (file.url || file.fileUrl || '')
                    const fileName = (typeof file === 'object' && file.name) ? file.name : (fileUrl ? fileUrl.split('/').pop() : `Attachment #${idx + 1}`)
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/70 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 text-xs shadow-sm">
                        <FileText size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="font-medium text-gray-800 dark:text-gray-200 max-w-[200px] truncate" title={fileName}>
                          {fileName}
                        </span>
                        {file.size && <span className="text-[10px] text-gray-400">({file.size})</span>}
                        {fileUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingAttachment({ url: fileUrl, name: fileName })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 bg-white/70 dark:bg-gray-800/70 px-2 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-700/60 transition-colors shadow-xs ml-1 cursor-pointer"
                            title="View attachment inside LMS"
                          >
                            <Eye size={12} />
                            View
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors ml-0.5 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Remove file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mt-1">No attachments added yet.</p>
              )}
            </div>
          </GlassCard>

          {/* Sticky save bar */}
          <div className="sticky bottom-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl -mx-6 -mb-6 px-6 py-4 border-t border-purple-100 dark:border-purple-900/30 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="text-green-600 font-semibold">{counts.PRESENT || 0} present</span>
                {' · '}
                <span className="text-red-500 font-semibold">{counts.ABSENT || 0} absent</span>
              </p>

              <div className="flex items-center gap-2">
                <button onClick={() => saveAttendance(false)} disabled={saving}
                  className="flex items-center gap-2 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-60 transition-all">
                  Save Draft
                </button>
                <button onClick={() => saveAttendance(true)} disabled={saving}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all">
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* In-app attachment preview modal */}
      {viewingAttachment && (
        <ViewAttachmentModal
          url={viewingAttachment.url}
          name={viewingAttachment.name}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </div>
  )
}

// ─── TAB 2: Batch Overview ─────────────────────────────────────────────────────

const STUDENT_AVATAR_PALETTE = [
  'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
]

function BatchOverviewTab({ refreshKey = 0 }) {
  const router = useRouter()
  const [overview, setOverview]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [detail, setDetail]             = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [monthFilter, setMonthFilter]   = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  const loadOverview = useCallback(() => {
    setLoading(true)
    adminApi.getAttendanceOverview()
      .then(r => setOverview(r.data.data || []))
      .catch(() => toast.error('Failed to load overview'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadOverview()
    if (selectedBatch) {
      reloadDetail()
    }
  }, [loadOverview, refreshKey])

  const openBatch = async (batch) => {
    setSelectedBatch(batch)
    setStudentSearch('')
    setDetailLoading(true)
    try {
      const r = await adminApi.getBatchAttDetail(batch.batchId, monthFilter ? { month: monthFilter } : {})
      const data = r.data.data
      setDetail(data)
      if (!monthFilter && data?.classes?.length > 0) {
        const lastClassDate = data.classes[data.classes.length - 1].date
        if (lastClassDate) {
          setMonthFilter(format(new Date(lastClassDate), 'yyyy-MM'))
        }
      }
    } catch { toast.error('Failed to load batch detail') } finally { setDetailLoading(false) }
  }

  const reloadDetail = async () => {
    if (!selectedBatch) return
    setDetailLoading(true)
    try {
      const r = await adminApi.getBatchAttDetail(selectedBatch.batchId, monthFilter ? { month: monthFilter } : {})
      setDetail(r.data.data)
    } catch {} finally { setDetailLoading(false) }
  }

  useEffect(() => { if (selectedBatch) reloadDetail() }, [monthFilter])

  if (loading) return <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>

  // Summary stats
  const totalBatches   = overview?.length || 0
  const activeBatchesWithClasses = overview?.filter(b => b.totalClasses > 0 && b.totalStudents > 0) || []
  const avgAttendance  = activeBatchesWithClasses.length
    ? Math.round(activeBatchesWithClasses.reduce((s, b) => s + b.avgAttendance, 0) / activeBatchesWithClasses.length)
    : (overview?.length ? Math.round(overview.reduce((s, b) => s + b.avgAttendance, 0) / overview.length) : 0)
  const lowStudents    = overview?.reduce((s, b) => s + b.lowAttendanceCount, 0) || 0

  // Drilldown view
  if (selectedBatch) {
    const studentList = detail?.matrix || []
    const filteredStudents = studentList.filter(s => {
      if (!studentSearch.trim()) return true
      const q = studentSearch.toLowerCase()
      return (s.name || '').toLowerCase().includes(q) ||
             (s.email || '').toLowerCase().includes(q) ||
             (s.enrollmentNo || '').toLowerCase().includes(q)
    })

    const totalClassesCount = detail?.classes?.length || selectedBatch.totalClasses || 0
    const totalStudentsCount = studentList.length || selectedBatch.totalStudents || 0
    const calculatedAvgPct = studentList.length
      ? Math.round(studentList.reduce((acc, s) => acc + (s.pct || 0), 0) / studentList.length)
      : (selectedBatch.avgAttendance || 0)

    return (
      <div className="space-y-5">
        {/* Navigation & Filters Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <button onClick={() => { setSelectedBatch(null); setDetail(null) }}
            className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-800 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft size={16} /> Back to Overview
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium">Month:</label>
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 shadow-sm" />
          </div>
        </div>

        {/* Batch Info Header Card */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{selectedBatch.batchName}</h2>
                <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-lg">
                  {selectedBatch.course}
                </span>
              </div>
              <p className="text-xs text-gray-500">Student Attendance & Performance Overview</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-purple-50/80 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 px-4 py-2 rounded-xl text-center">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Students</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-200 leading-tight">{totalStudentsCount}</p>
              </div>
              <div className="bg-purple-50/80 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 px-4 py-2 rounded-xl text-center">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Classes</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-200 leading-tight">{totalClassesCount}</p>
              </div>
              <div className="bg-purple-50/80 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 px-4 py-2 rounded-xl text-center">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Avg Attendance</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-200 leading-tight">{calculatedAvgPct}%</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {detailLoading ? (
          <Skeleton className="h-72" />
        ) : detail ? (
          /* Student Summary Table */
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-xl overflow-hidden">
            {/* Search & Filter sub-bar */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-gray-900">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student by name or email..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredStudents.length}</span> of {studentList.length} students
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafbff] dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4 w-14">#</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Current Status</th>
                    <th className="px-6 py-4">Attendance %</th>
                    <th className="px-6 py-4">Classes Attended</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((row, idx) => {
                      const avatarBg = STUDENT_AVATAR_PALETTE[idx % STUDENT_AVATAR_PALETTE.length]
                      const firstChar = (row.name?.trim()?.charAt(0) || 'S').toUpperCase()
                      
                      // Status badge logic
                      const pct = row.pct || 0
                      const isActive = pct >= 75
                      const isAtRisk = pct >= 50 && pct < 75

                      const statusLabel = isActive ? 'Active' : isAtRisk ? 'At Risk' : 'Critical'
                      const statusBadgeCls = isActive
                        ? 'bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : isAtRisk
                        ? 'bg-amber-100/90 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-100/90 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'

                      const attendedPresent = row.present || 0
                      const attendedTotal = row.total || detail?.classes?.length || 0

                      return (
                        <tr
                          key={row.studentId || idx}
                          className="hover:bg-purple-50/20 dark:hover:bg-purple-900/10 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${avatarBg}`}>
                                {firstChar}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                  {row.name}
                                </p>
                                {row.enrollmentNo && (
                                  <p className="text-[11px] text-gray-400 mt-0.5">{row.enrollmentNo}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {row.email || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${statusBadgeCls}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-100">
                            {pct}%
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                            {attendedPresent} / {attendedTotal}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                if (row.studentId) {
                                  router.push(`/admin/students/${row.studentId}`)
                                } else {
                                  router.push(`/admin/students?search=${encodeURIComponent(row.name)}`)
                                }
                              }}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                            >
                              <Eye size={16} />
                              <span>View Profile</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                        {studentSearch ? 'No students match your search filter.' : 'No students found in this batch.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Batches"    value={totalBatches}  icon={BookOpen} />
        <StatCard label="Avg Attendance"    value={`${avgAttendance}%`} icon={TrendingUp} />
        <StatCard label="Students Below 75%" value={lowStudents}  icon={AlertTriangle} iconColor="text-yellow-500" sub={lowStudents > 0 ? 'Need attention' : ''} />
      </div>

      {/* Batch cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {(overview || []).map(batch => (
          <GlassCard key={batch.batchId} className="p-5 flex flex-col gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg">
                {batch.course}
              </span>
              <h3 className="font-bold text-gray-800 dark:text-white mt-2 text-base">{batch.batchName}</h3>
            </div>
            <div className="flex gap-4 text-sm text-gray-500">
              <span><span className="font-semibold text-gray-700 dark:text-gray-300">{batch.totalStudents}</span> students</span>
              <span><span className="font-semibold text-gray-700 dark:text-gray-300">{batch.totalClasses}</span> classes</span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-500">Avg Attendance</span>
              </div>
              <PctBar pct={batch.avgAttendance} />
            </div>
            {batch.lowAttendanceCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl">
                <AlertTriangle size={12} />
                {batch.lowAttendanceCount} student{batch.lowAttendanceCount > 1 ? 's' : ''} below 75%
              </div>
            )}
            <button onClick={() => openBatch(batch)}
              className="mt-auto text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors">
              View Details →
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

// ─── TAB 3: Analytics ─────────────────────────────────────────────────────────

function AnalyticsTab({ refreshKey = 0 }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]       = useState(30)
  const [batchId, setBatchId] = useState('')
  const [batches, setBatches] = useState([])
  const [showAllTrainers, setShowAllTrainers] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.getAttendanceAnalytics({ days, ...(batchId ? { batchId } : {}) })
      setData(r.data.data)
    } catch { toast.error('Failed to load analytics') } finally { setLoading(false) }
  }, [days, batchId])

  useEffect(() => {
    adminApi.getBatches({ isActive: 'true' }).then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [refreshKey])

  useEffect(() => { load() }, [load, refreshKey])

  // Working Day (Mon - Fri) Pattern Analysis
  const workingDayPattern = useMemo(() => {
    const DAYS = [
      { dow: 1, name: 'Monday', short: 'Mon' },
      { dow: 2, name: 'Tuesday', short: 'Tue' },
      { dow: 3, name: 'Wednesday', short: 'Wed' },
      { dow: 4, name: 'Thursday', short: 'Thu' },
      { dow: 5, name: 'Friday', short: 'Fri' },
    ]

    if (!data?.dailyTrend || data.dailyTrend.length === 0) {
      return { days: DAYS.map(d => ({ ...d, avgPct: 0, classesCount: 0, totalAttended: 0, totalAll: 0 })), overallAvg: 0, bestDay: null, worstDay: null }
    }

    const dayMap = {
      1: { present: 0, total: 0, classDays: 0 },
      2: { present: 0, total: 0, classDays: 0 },
      3: { present: 0, total: 0, classDays: 0 },
      4: { present: 0, total: 0, classDays: 0 },
      5: { present: 0, total: 0, classDays: 0 }
    }

    for (const d of data.dailyTrend) {
      if (!d.date) continue
      let dateObj
      try { dateObj = new Date(d.date.includes('T') ? d.date : d.date + 'T00:00:00') } catch { continue }
      const dow = dateObj.getDay()
      if (dow >= 1 && dow <= 5 && dayMap[dow]) {
        const pres = (d.present || 0) + (d.late || 0)
        const tot = d.total || (pres + (d.absent || 0))
        if (tot > 0) {
          dayMap[dow].present += pres
          dayMap[dow].total += tot
          dayMap[dow].classDays++
        }
      }
    }

    let grandPresent = 0
    let grandTotal = 0

    const computedDays = DAYS.map(d => {
      const stats = dayMap[d.dow]
      const avgPct = stats.total > 0 ? Math.round((stats.present * 100) / stats.total) : 0
      grandPresent += stats.present
      grandTotal += stats.total
      return {
        ...d,
        avgPct,
        classesCount: stats.classDays,
        totalAttended: stats.present,
        totalAll: stats.total
      }
    })

    const activeDays = computedDays.filter(d => d.totalAll > 0)
    const sorted = [...activeDays].sort((a, b) => b.avgPct - a.avgPct)
    const bestDay = sorted.length > 0 ? sorted[0] : null
    const worstDay = sorted.length > 0 ? sorted[sorted.length - 1] : null
    const overallAvg = grandTotal > 0 ? Math.round((grandPresent * 100) / grandTotal) : (data?.overallPct || 0)

    return { days: computedDays, overallAvg, bestDay, worstDay }
  }, [data])

  const mostAbsentDay = workingDayPattern.worstDay
    ? `${workingDayPattern.worstDay.name} (avg ${workingDayPattern.worstDay.avgPct}%)`
    : null

  const totalClassesTracked = data?.dailyTrend?.filter(d => (d.total > 0 || d.classTitle))?.length || 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${days === d ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {d} days
            </button>
          ))}
        </div>
        <CustomSelect
          value={batchId}
          onChange={(val) => setBatchId(val)}
          options={batches.map(b => ({ value: b.id, label: b.name }))}
          placeholder="All Batches"
          searchable={batches.length >= 10}
          compact
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-72" />
          <div className="grid sm:grid-cols-2 gap-4"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
        </div>
      ) : data ? (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Overall Attendance Rate" value={`${data.overallPct}%`} icon={TrendingUp} />
            <StatCard label="Total Classes Tracked"   value={totalClassesTracked} icon={BookOpen} />
            <StatCard label="Most Absent Day" value={mostAbsentDay || '—'} icon={TrendingDown} iconColor="text-yellow-500" />
          </div>

          {/* Area chart — Attendance Trend */}
          <GlassCard className="p-5 sm:p-6">
            <AttendanceDailyTrendChart data={data.dailyTrend} days={days} />
          </GlassCard>

          {/* 1. Attendance by Class Mode */}
          <GlassCard className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Attendance by Class Mode</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Compare attendance by online and offline classes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Online Classes Card */}
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm transition-all hover:shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0 shadow-inner">
                  <Laptop size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    Online Classes
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                    {data.modeAttendance?.onlineAvgPct ?? 0}%
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Avg Attendance
                  </p>
                  <p className="text-sm font-extrabold text-gray-800 dark:text-gray-100 leading-none mt-3">
                    {data.modeAttendance?.onlineConducted ?? 0} / {data.modeAttendance?.onlineTotal ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Classes Conducted
                  </p>
                </div>
              </div>

              {/* Offline Classes Card */}
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm transition-all hover:shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0 shadow-inner">
                  <Users size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                    Offline Classes
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                    {data.modeAttendance?.offlineAvgPct ?? 0}%
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Avg Attendance
                  </p>
                  <p className="text-sm font-extrabold text-gray-800 dark:text-gray-100 leading-none mt-3">
                    {data.modeAttendance?.offlineConducted ?? 0} / {data.modeAttendance?.offlineTotal ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    Classes Conducted
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Working Day Attendance Pattern (Mon – Fri) */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Calendar size={18} className="text-purple-600 dark:text-purple-400" />
                  Working Day Attendance Pattern (Mon – Fri)
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Average attendance rate and student participation across official working days
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                <span>Working Day Avg:</span>
                <span className="font-extrabold text-sm">{workingDayPattern.overallAvg}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {workingDayPattern.days.map((d) => {
                const isBest = workingDayPattern.bestDay?.dow === d.dow && d.totalAll > 0
                const isWorst = workingDayPattern.worstDay?.dow === d.dow && d.totalAll > 0 && workingDayPattern.bestDay?.dow !== d.dow
                const barColor = d.avgPct >= 75 ? 'bg-emerald-500' : d.avgPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'

                return (
                  <div
                    key={d.dow}
                    className={clsx(
                      'p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3',
                      isBest
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                        : isWorst
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                        : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{d.name}</span>
                      {isBest && <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md">Highest</span>}
                      {isWorst && <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-md">Lowest</span>}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                          {d.totalAll > 0 ? `${d.avgPct}%` : '—'}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400">
                          {d.classesCount} class{d.classesCount === 1 ? '' : 'es'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, d.avgPct))}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/40 dark:border-gray-700/40 flex justify-between">
                      <span>Attended:</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{d.totalAttended} / {d.totalAll}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>


          {/* 2. Trainer Performance & 3. Attendance by Batch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trainer Performance */}
            <GlassCard className="p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Trainer Performance</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Attendance by trainer</p>
                  </div>
                  {data.trainerPerformance && data.trainerPerformance.length > 4 && (
                    <button
                      onClick={() => setShowAllTrainers(!showAllTrainers)}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 transition-colors inline-flex items-center gap-1"
                    >
                      {showAllTrainers ? 'Show Top Trainers' : 'View All Trainers →'}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <th className="pb-3 font-semibold">Trainer</th>
                        <th className="pb-3 font-semibold text-center">Classes Conducted</th>
                        <th className="pb-3 font-semibold text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {(!data.trainerPerformance || data.trainerPerformance.length === 0) ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-xs text-gray-400">No trainer attendance data for this period</td>
                        </tr>
                      ) : (
                        (showAllTrainers ? data.trainerPerformance : data.trainerPerformance.slice(0, 5)).map((t, idx) => {
                          const pct = t.attendancePct
                          const badgeClass = pct >= 85
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : pct >= 75
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          return (
                            <tr key={t.trainerId || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="py-3 font-bold text-gray-800 dark:text-gray-200">{t.trainerName}</td>
                              <td className="py-3 text-center text-gray-600 dark:text-gray-300 font-medium">{t.classesConducted}</td>
                              <td className="py-3 text-right">
                                <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-extrabold ${badgeClass}`}>
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlassCard>

            {/* Attendance by Batch */}
            <GlassCard className="p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Attendance by Batch</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Compare attendance across all batches</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <th className="pb-3 font-semibold">Batch Name</th>
                        <th className="pb-3 font-semibold text-center">Classes Conducted</th>
                        <th className="pb-3 font-semibold min-w-[140px] text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {(!data.batchAttendance || data.batchAttendance.length === 0) ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-xs text-gray-400">No batch attendance data for this period</td>
                        </tr>
                      ) : (
                        data.batchAttendance.map((b, idx) => {
                          const colors = [
                            'bg-emerald-500',
                            'bg-purple-600',
                            'bg-blue-500',
                            'bg-amber-500',
                            'bg-pink-500',
                            'bg-indigo-500'
                          ]
                          const barColor = colors[idx % colors.length]
                          return (
                            <tr key={b.batchId || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="py-3.5 font-bold text-gray-800 dark:text-gray-200">{b.batchName}</td>
                              <td className="py-3.5 text-center text-gray-600 dark:text-gray-300 font-medium">{b.classesConducted}</td>
                              <td className="py-3.5">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-1 max-w-[120px]">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                      style={{ width: `${Math.min(100, Math.max(0, b.attendancePct))}%` }}
                                    />
                                  </div>
                                  <span className="font-extrabold text-xs text-gray-800 dark:text-gray-200 min-w-[32px] text-right">
                                    {b.attendancePct}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Weekly + Monthly charts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Weekly Attendance Rate</h3>
              <WeeklyAttendanceRateChart data={data.weeklyTrend} />
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Monthly Breakdown</h3>
              <MonthlyAttendanceBreakdownChart data={data.monthlyTrend} />
            </GlassCard>
          </div>

          {/* Heatmap */}
          <GlassCard className="p-5">
            <AttendanceHeatmap dailyTrend={data.dailyTrend || []} />
          </GlassCard>
        </>
      ) : null}
    </div>
  )
}


// ─── TAB 4: Alerts ─────────────────────────────────────────────────────────────

// ─── TAB 5: Alerts ─────────────────────────────────────────────────────────────

function AlertsTab({ onAlertsChanged, refreshKey = 0 }) {
  const router = useRouter()
  const [alerts, setAlerts]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [threshold, setThreshold]       = useState(75)
  const [showResolved, setShowResolved] = useState(false)
  const [generating, setGenerating]     = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [riskFilter, setRiskFilter]     = useState('ALL') // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'

  // Debounce search input for API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const load = useCallback(async (resolved = false, search = '') => {
    setLoading(true)
    try {
      const params = { resolved: resolved ? 'true' : 'false' }
      if (search && search.trim()) params.search = search.trim()
      const r = await adminApi.getAttendanceAlerts(params)
      setAlerts(r.data.data || [])
    } catch { toast.error('Failed to load alerts') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(showResolved, debouncedSearch) }, [load, showResolved, debouncedSearch, refreshKey])

  const generate = async () => {
    const numThreshold = Number(threshold)
    if (threshold === '' || isNaN(numThreshold) || numThreshold < 0 || numThreshold > 100) {
      toast.error('Please enter a valid threshold percentage between 0 and 100')
      return
    }
    setGenerating(true)
    try {
      const r = await adminApi.generateAlerts({ threshold: numThreshold })
      toast.success(`Generated ${r.data?.data?.generated ?? 0} new alerts (checked ${r.data?.data?.checked ?? 0} students)`)
      await load(showResolved, debouncedSearch)
      onAlertsChanged?.()
    } catch { toast.error('Failed to generate alerts') } finally { setGenerating(false) }
  }

  const resolve = async (id) => {
    try {
      await adminApi.resolveAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('Alert resolved successfully')
      onAlertsChanged?.()
    } catch { toast.error('Failed to resolve alert') }
  }

  const getRiskInfo = (pct) => {
    if (pct < 50) {
      return {
        key: 'CRITICAL',
        label: 'Critical Risk',
        badgeCls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40',
        borderCls: 'border-l-rose-500',
        iconColor: 'text-rose-500',
      }
    }
    if (pct < 65) {
      return {
        key: 'HIGH',
        label: 'High Risk',
        badgeCls: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40',
        borderCls: 'border-l-orange-500',
        iconColor: 'text-orange-500',
      }
    }
    return {
      key: 'MEDIUM',
      label: 'Medium Risk',
      badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40',
      borderCls: 'border-l-amber-500',
      iconColor: 'text-amber-500',
    }
  }

  // Filter alerts by risk filter
  const filteredAlerts = alerts.filter(alert => {
    const risk = getRiskInfo(alert.currentPct ?? 0).key
    return riskFilter === 'ALL' || risk === riskFilter
  })

  // Quick stats
  const criticalCount = alerts.filter(a => (a.currentPct ?? 0) < 50).length
  const highCount     = alerts.filter(a => (a.currentPct ?? 0) >= 50 && (a.currentPct ?? 0) < 65).length
  const mediumCount   = alerts.filter(a => (a.currentPct ?? 0) >= 65 && (a.currentPct ?? 0) < (a.threshold ?? 75)).length

  return (
    <div className="space-y-6">
      {/* Risk Level Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">{alerts.length}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{showResolved ? 'Resolved Alerts' : 'Active Alerts'}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3.5 cursor-pointer hover:border-rose-300 transition-all" onClick={() => setRiskFilter(riskFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-300 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 leading-none">{criticalCount}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Critical (&lt;50%)</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3.5 cursor-pointer hover:border-orange-300 transition-all" onClick={() => setRiskFilter(riskFilter === 'HIGH' ? 'ALL' : 'HIGH')}>
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-300 shrink-0">
            <TrendingDown size={18} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400 leading-none">{highCount}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">High (50-64%)</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3.5 cursor-pointer hover:border-amber-300 transition-all" onClick={() => setRiskFilter(riskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">{mediumCount}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Medium (65-74%)</p>
          </div>
        </GlassCard>
      </div>

      {/* Action and Filter bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-semibold">Alert when below:</label>
              <input
                type="text"
                inputMode="numeric"
                value={threshold}
                onChange={e => {
                  const val = e.target.value
                  if (val === '') { setThreshold(''); return }
                  const clean = val.replace(/[^0-9]/g, '')
                  if (clean === '') { setThreshold(''); return }
                  const num = parseInt(clean, 10)
                  setThreshold(num > 100 ? 100 : num < 0 ? 0 : num)
                }}
                onKeyDown={e => {
                  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault()
                }}
                onBlur={() => {
                  if (threshold === '' || isNaN(Number(threshold))) setThreshold(75)
                  else if (Number(threshold) < 0) setThreshold(0)
                  else if (Number(threshold) > 100) setThreshold(100)
                }}
                placeholder="0-100"
                className="w-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
              <span className="text-sm font-semibold text-gray-500">%</span>
            </div>

            <button onClick={generate} disabled={generating}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-xs sm:text-sm font-bold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all shadow-md shadow-purple-500/20">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Scanning & Generating...' : 'Generate Alerts'}
            </button>

            <button
              onClick={() => setShowResolved(r => !r)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                showResolved
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-300 bg-white dark:bg-gray-800'
              }`}>
              {showResolved ? 'Showing Resolved' : 'Show Resolved'}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student, batch, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* Alert list content */}
      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : filteredAlerts.length === 0 ? (
        <GlassCard className="p-10 text-center border-l-4 border-green-500 shadow-md">
          <CheckCircle className="mx-auto mb-3 text-emerald-500" size={40} />
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            {searchQuery ? 'No alerts matching search filter' : 'No low-attendance alerts'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {searchQuery ? 'Try clearing your search query.' : 'All students are currently maintaining attendance above threshold!'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3.5">
          {filteredAlerts.map((alert, idx) => {
            const pct = Math.round(alert.currentPct ?? 0)
            const risk = getRiskInfo(pct)
            const studentName = alert.studentName || alert.student?.user?.name || alert.student?.name || 'Student'
            const studentEmail = alert.studentEmail || alert.student?.user?.email || alert.student?.email || ''
            const phone = alert.phone || alert.student?.phone || alert.student?.user?.phone || ''
            const batchName = alert.batchName || alert.batch?.name || 'Batch'
            const courseTitle = alert.courseTitle || alert.batch?.course?.title || ''
            const studentId = alert.studentId || alert.student?.id || alert.userId || alert.student?.userId
            const avatarBg = STUDENT_AVATAR_PALETTE[idx % STUDENT_AVATAR_PALETTE.length]
            const firstChar = studentName.trim().charAt(0).toUpperCase() || 'S'

            return (
              <GlassCard key={alert.id || idx} className={`p-5 border-l-4 ${risk.borderCls} transition-all hover:shadow-lg`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${avatarBg}`}>
                      {firstChar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${risk.badgeCls}`}>
                          {risk.label}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {batchName} {courseTitle && `· ${courseTitle}`}
                        </span>
                      </div>

                      <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                        {studentName}
                      </p>

                      <div className="flex items-center gap-4 flex-wrap mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {studentEmail && <span>📧 {studentEmail}</span>}
                        {phone && <span>📱 {phone}</span>}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-3 max-w-md">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-16">
                          {pct}%
                        </span>
                        <div className="flex-1">
                          <PctBar pct={pct} />
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          Min: {alert.threshold ?? 75}%
                        </span>
                      </div>

                      {alert.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic bg-gray-50 dark:bg-gray-800/40 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                          ⚠️ {alert.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-center sm:self-start">
                    {!showResolved && (
                      <button
                        onClick={() => resolve(alert.id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors shadow-sm"
                      >
                        Resolve Alert
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (studentId) router.push(`/admin/students/${studentId}`)
                        else router.push(`/admin/students?search=${encodeURIComponent(studentName)}`)
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors shadow-sm"
                    >
                      <Eye size={14} />
                      <span>View Profile</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Command Center strip ───────────────────────────────────────────────────────

function CommandCenterStrip({ refreshKey = 0 }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const r = await adminApi.getAttendanceDashboard()
      setStats(r.data?.data || null)
    } catch (err) {
      console.error('Failed to load command center stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats, refreshKey])

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  const current = stats || {
    totalStudents: 0,
    todaysClasses: 0,
    averageAttendance: 0,
    below75Count: 0,
    criticalCount: 0,
    unmarkedClasses: 0,
  }

  const cards = [
    { label: 'Total Students', value: current.totalStudents, sub: 'Active enrollments', icon: Users, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'hover:border-blue-300/50' },
    { label: "Today's Classes", value: current.todaysClasses, sub: 'Scheduled today', icon: Calendar, iconColor: 'text-purple-600 dark:text-purple-400', bg: 'hover:border-purple-300/50' },
    { label: 'Average Attendance', value: `${current.averageAttendance}%`, sub: 'Across active batches', icon: TrendingUp, iconColor: current.averageAttendance >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', bg: 'hover:border-emerald-300/50' },
    { label: 'Below 75%', value: current.below75Count, sub: current.below75Count > 0 ? 'Requires attention' : 'All good', icon: AlertTriangle, iconColor: 'text-amber-500', bg: 'hover:border-amber-300/50' },
    { label: 'Critical Students', value: current.criticalCount, sub: current.criticalCount > 0 ? 'High risk' : 'Zero at risk', icon: XCircle, iconColor: 'text-red-500', bg: 'hover:border-red-300/50' },
    { label: 'Unmarked Classes', value: current.unmarkedClasses, sub: current.unmarkedClasses > 0 ? 'Pending marking' : 'Up to date', icon: FileEdit, iconColor: 'text-orange-500', bg: 'hover:border-orange-300/50' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <GlassCard key={c.label} className={`p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${c.bg}`}>
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl bg-purple-50/70 dark:bg-purple-900/30 ${c.iconColor}`}>
              <c.icon size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">{c.value}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1 break-words">{c.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 break-words mt-0.5">{c.sub}</p>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

// ─── TAB 5: Today ───────────────────────────────────────────────────────────────

function TodayTab({ onMarkAttendance, onViewAttendance, onClassDeleted, refreshKey = 0 }) {
  const [mounted, setMounted] = useState(false)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [detailsClass, setDetailsClass] = useState(null)
  const [deletingClass, setDeletingClass] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const dateInputRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadClasses = useCallback((dateStr) => {
    setLoading(true)
    adminApi.getTodayClasses(dateStr)
      .then(r => {
        const raw = r.data?.data || []
        const seen = new Set()
        const unique = []
        for (const item of raw) {
          const key = `${item.batchId || 'all'}-${(item.title || '').trim().toLowerCase()}-${item.date || ''}`
          if (!seen.has(key)) {
            seen.add(key)
            unique.push(item)
          }
        }
        setClasses(unique)
      })
      .catch(() => toast.error('Failed to load scheduled classes'))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirmDelete = async () => {
    if (!deletingClass?.classId) return
    setIsDeleting(true)
    try {
      await adminApi.deleteClass(deletingClass.classId)
      toast.success('Class deleted successfully')
      setDeletingClass(null)
      loadClasses(selectedDate)
      onClassDeleted?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete class')
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    loadClasses(selectedDate)
  }, [selectedDate, loadClasses, refreshKey])

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const handleToday = () => {
    if (selectedDate === todayStr) {
      loadClasses(todayStr)
    } else {
      setSelectedDate(todayStr)
    }
  }

  const isToday = selectedDate === todayStr
  const dateObj = new Date(selectedDate + 'T00:00:00')
  const formattedHeaderDate = format(dateObj, 'EEE, MMM d, yyyy')

  // Calculate timing & status helper
  // Get current local time as "YYYY-MM-DDTHH:MM:SS" string (same format as backend).
  // String comparison on ISO timestamps is perfectly correct and timezone-proof.
  const getLocalISONow = () => {
    const now = new Date()
    const yr = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const dy = String(now.getDate()).padStart(2, '0')
    const hr = String(now.getHours()).padStart(2, '0')
    const mn = String(now.getMinutes()).padStart(2, '0')
    const sc = String(now.getSeconds()).padStart(2, '0')
    return `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}`
  }
  // Normalise backend value (string or array) to "YYYY-MM-DDTHH:MM:SS"
  const toISOStr = (val) => {
    if (!val) return null
    if (Array.isArray(val)) {
      const [yr, mo, dy, hr = 0, mn = 0, sc = 0] = val
      const p = (n) => String(n).padStart(2, '0')
      return `${yr}-${p(mo)}-${p(dy)}T${p(hr)}:${p(mn)}:${p(sc)}`
    }
    const s = String(val).replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '').replace(' ', 'T')
    return s.slice(0, 19)
  }

  const getClassScheduleInfo = (c) => {
    let startTimeStr = '—'
    let endTimeStr = '—'
    let isOngoing = false
    let isUpcoming = false
    let isCompleted = c.status === 'COMPLETED'

    const startISO = toISOStr(c.date)
    const endISO   = toISOStr(c.scheduledEnd)

    if (startISO) {
      const sp = startISO.split(/[T:-]/).map(Number)
      const startTime = new Date(sp[0], sp[1]-1, sp[2], sp[3]||0, sp[4]||0, sp[5]||0)
      startTimeStr = format(startTime, 'hh:mm a')

      if (endISO) {
        const ep = endISO.split(/[T:-]/).map(Number)
        const endTime = new Date(sp[0], sp[1]-1, sp[2], ep[3]||0, ep[4]||0, ep[5]||0)
        endTimeStr = format(endTime, 'hh:mm a')
      } else {
        const endTime = new Date(sp[0], sp[1]-1, sp[2], (sp[3]||0)+1, sp[4]||0, sp[5]||0)
        endTimeStr = format(endTime, 'hh:mm a')
      }

      const now = getLocalISONow()
      const todayDate = now.slice(0, 10)
      const currentTime = now.slice(11, 19)

      const targetDate = selectedDate || todayDate
      const startDate = startISO.slice(0, 10)
      const endDate = endISO ? endISO.slice(0, 10) : startDate

      const startTimeOnly = (startISO.slice(11, 19) || '00:00:00').padEnd(8, ':00')
      let endTimeOnly = endISO ? (endISO.slice(11, 19) || '23:59:59').padEnd(8, ':00') : null
      if (!endTimeOnly) {
        const [sh = '10', sm = '00', ss = '00'] = startTimeOnly.split(':')
        const endH = String((parseInt(sh, 10) + 1) % 24).padStart(2, '0')
        endTimeOnly = `${endH}:${sm}:${ss}`
      }

      if (c.status === 'COMPLETED') {
        isCompleted = true
        isOngoing = false
        isUpcoming = false
      } else if (targetDate < todayDate) {
        // Any class viewed on a past date has already ended
        isCompleted = true
        isOngoing = false
        isUpcoming = false
      } else if (targetDate > todayDate) {
        // Any class viewed on a future date is upcoming
        isUpcoming = true
        isOngoing = false
        isCompleted = false
      } else {
        // Target date IS today
        if (todayDate < startDate) {
          isUpcoming = true
          isOngoing = false
          isCompleted = false
        } else if (todayDate > endDate) {
          isUpcoming = false
          isOngoing = false
          isCompleted = true
        } else {
          // Today is within [startDate, endDate]
          if (currentTime < startTimeOnly) {
            isUpcoming = true
            isOngoing = false
            isCompleted = false
          } else if (currentTime >= startTimeOnly && currentTime <= endTimeOnly) {
            isOngoing = true
            isUpcoming = false
            isCompleted = false
          } else {
            // currentTime > endTimeOnly
            isUpcoming = false
            isOngoing = false
            isCompleted = true
          }
        }
      }
    } else if (c.timing && c.timing.includes('-')) {
      const parts = c.timing.split('-')
      if (parts[0]?.trim()) startTimeStr = parts[0].trim()
      if (parts[1]?.trim()) endTimeStr = parts[1].trim()

      const now = getLocalISONow()
      const todayDate = now.slice(0, 10)
      const targetDate = selectedDate || todayDate
      if (c.status === 'COMPLETED' || targetDate < todayDate) {
        isCompleted = true
        isOngoing = false
        isUpcoming = false
      } else if (targetDate > todayDate) {
        isUpcoming = true
        isOngoing = false
        isCompleted = false
      }
    }

    const hasAttendanceData = (c.present > 0 || c.absent > 0)
    const isOnline = (c.mode || 'ONLINE').toUpperCase() === 'ONLINE'
    const isOffline = (c.mode || '').toUpperCase() === 'OFFLINE'

    return {
      startTimeStr,
      endTimeStr,
      isOngoing,
      isUpcoming,
      isCompleted,
      hasAttendanceData,
      isOnline,
      isOffline,
      modeLabel: isOffline ? 'OFFLINE' : isOnline ? 'ONLINE' : (c.mode || 'HYBRID')
    }
  }

  // Sort classes: ONGOING first, then UPCOMING, then COMPLETED
  const statusOrder = (c) => {
    const info = getClassScheduleInfo(c)
    if (info.isOngoing)   return 0
    if (info.isUpcoming)  return 1
    return 2 // completed / other
  }

  const sortedClasses = [...classes].sort((a, b) => statusOrder(a) - statusOrder(b))
  const displayedClasses = showAll ? sortedClasses : sortedClasses.slice(0, 6)

  return (
    <div className="space-y-4">
      {/* Header card */}
      <GlassCard className="p-6 shadow-sm border border-purple-100 dark:border-purple-900/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Today's Classes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Classes scheduled for {isToday ? `today (${formattedHeaderDate})` : formattedHeaderDate}
            </p>
          </div>

          {/* Date Picker Button / Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
              title="Previous Day"
            >
              <ChevronLeft size={17} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker?.()
                  } catch {
                    dateInputRef.current?.focus()
                  }
                }}
                className="cursor-pointer inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 text-xs font-semibold shadow-sm hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all focus:ring-2 focus:ring-purple-500/20"
              >
                <Calendar size={15} className="text-purple-600 dark:text-purple-400" />
                <span>{formattedHeaderDate}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value)
                  }
                }}
                onClick={e => {
                  try {
                    e.target.showPicker?.()
                  } catch {}
                }}
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                tabIndex={-1}
              />
            </div>

            <button
              onClick={handleNextDay}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
              title="Next Day"
            >
              <ChevronRight size={17} />
            </button>

            {!isToday && (
              <button
                onClick={handleToday}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white shadow-sm hover:bg-purple-700 transition-all"
              >
                Today
              </button>
            )}

            <button
              onClick={() => loadClasses(selectedDate)}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Class List */}
      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : classes.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Calendar className="mx-auto mb-3 text-purple-400 dark:text-purple-500" size={40} />
          <h3 className="text-gray-800 dark:text-gray-200 font-bold text-base">No classes scheduled for {formattedHeaderDate}</h3>
          <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
            There are no active classes or meeting sessions on this date. Select another date or return to today.
          </p>
          {!isToday && (
            <button
              onClick={handleToday}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all"
            >
              <Calendar size={14} /> View Today's Classes
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {displayedClasses.map((c, idx) => {
            const info = getClassScheduleInfo(c)
            const totalStudents = c.totalStudents ?? (c.present + c.absent) ?? 0
            const presentCount = c.present || 0
            const notJoinedCount = Math.max(0, totalStudents - presentCount)
            const joinedCount = presentCount

            // Left accent color line
            const leftBorderColor = info.isOnline
              ? 'border-l-purple-600 dark:border-l-purple-500'
              : 'border-l-emerald-500 dark:border-l-emerald-400'

            return (
              <GlassCard
                key={c.classId ? `class-${c.classId}` : `meeting-${c.title}-${c.date}-${idx}`}
                className={`p-5 border-l-4 ${leftBorderColor} hover:shadow-md transition-all duration-200`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left Column: Time */}
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                      {info.startTimeStr}
                    </p>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                      {info.endTimeStr}
                    </p>
                  </div>

                  {/* Middle Column: Batch, Topic & Trainer */}
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">
                      {c.batchName || 'Batch'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                      {c.title || c.courseTitle || 'Scheduled Class Session'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Users size={14} className="text-gray-400" />
                        {totalStudents} Student{totalStudents === 1 ? '' : 's'}
                      </span>
                      {c.trainerName && (
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <User size={14} className="text-gray-400" />
                          Trainer: <span className="text-gray-700 dark:text-gray-300 font-semibold">{c.trainerName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle-Right Column: Badges & Attendance Summary */}
                  <div className="shrink-0 min-w-[190px]">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {info.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          <Video size={11} /> ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          <MapPin size={11} /> OFFLINE
                        </span>
                      )}

                      {info.isOngoing ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONGOING
                        </span>
                      ) : info.isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          <CheckCircle2 size={11} /> COMPLETED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                          <Clock size={11} /> UPCOMING
                        </span>
                      )}
                    </div>

                    {/* Attendance Text */}
                    {info.hasAttendanceData ? (
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                          Joined: <span className="text-purple-600 dark:text-purple-400">{joinedCount}</span> / {totalStudents}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                          Present: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{presentCount}</span>
                          {'  '}
                          Not Joined: <span className="font-semibold text-gray-500">{notJoinedCount}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Attendance: <span className="text-gray-700 dark:text-gray-300 font-semibold">{info.isOngoing || info.isCompleted ? 'Not Marked' : 'Not Started'}</span>
                      </p>
                    )}
                  </div>

                  {/* Far Right Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {info.hasAttendanceData ? (
                      <button
                        onClick={() => {
                          if (c.batchId && c.classId) {
                            onViewAttendance?.(c.batchId, c.classId)
                          } else {
                            setDetailsClass(c)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all shadow-sm"
                      >
                        <Eye size={14} /> View Attendance
                      </button>
                    ) : c.classId ? (
                      info.isUpcoming ? (
                        // Upcoming class — attendance cannot be marked yet
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                          title="Cannot mark attendance for upcoming classes"
                        >
                          <CheckSquare size={14} /> Mark Attendance
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (c.batchId && c.classId) {
                              onMarkAttendance?.(c.batchId, c.classId)
                            } else {
                              setDetailsClass(c)
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm"
                        >
                          <CheckSquare size={14} /> Mark Attendance
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setDetailsClass(c)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all shadow-sm"
                      >
                        View Details
                      </button>
                    )}

                    {c.meetLink && (
                      <a
                        href={c.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        title="Open Meeting Link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}

                    {c.classId && !info.isOngoing && !info.isCompleted && (
                      <button
                        onClick={() => setDeletingClass(c)}
                        className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Footer bar */}
      {classes.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 px-2">
          <p>
            Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{displayedClasses.length}</span> of <span className="font-semibold text-gray-800 dark:text-gray-200">{classes.length}</span> classes
          </p>
          {classes.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 transition-colors inline-flex items-center gap-1"
            >
              {showAll ? 'Show Fewer Classes' : 'View All Classes →'}
            </button>
          )}
        </div>
      )}

      {/* Class Details Modal */}
      {detailsClass && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          onClick={() => setDetailsClass(null)}
        >
          <div 
            className="relative bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  {detailsClass.batchName || 'Batch Session'}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  {detailsClass.title || detailsClass.courseTitle || 'Class Details'}
                </h3>
              </div>
              <button
                onClick={() => setDetailsClass(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-400 uppercase font-semibold text-[10px]">Trainer</p>
                <p className="text-gray-800 dark:text-gray-200 font-bold mt-0.5">{detailsClass.trainerName || 'Not Assigned'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-400 uppercase font-semibold text-[10px]">Total Enrolled</p>
                <p className="text-gray-800 dark:text-gray-200 font-bold mt-0.5">{detailsClass.totalStudents || 0} Students</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-400 uppercase font-semibold text-[10px]">Scheduled Time</p>
                <p className="text-gray-800 dark:text-gray-200 font-bold mt-0.5">{detailsClass.date ? format(new Date(detailsClass.date), 'h:mm a') : '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-400 uppercase font-semibold text-[10px]">Mode</p>
                <p className="text-gray-800 dark:text-gray-200 font-bold mt-0.5">{detailsClass.mode || 'ONLINE'}</p>
              </div>
            </div>

            {detailsClass.meetLink && (
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 flex items-center justify-between">
                <div className="text-xs">
                  <p className="font-bold text-purple-900 dark:text-purple-200">Online Meeting Link</p>
                  <p className="text-gray-500 dark:text-gray-400 break-words">{detailsClass.meetLink}</p>
                </div>
                <a
                  href={detailsClass.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors shrink-0"
                >
                  Join Meeting
                </a>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setDetailsClass(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              {detailsClass.batchId && detailsClass.classId && (
                <button
                  onClick={() => {
                    const bId = detailsClass.batchId
                    const cId = detailsClass.classId
                    setDetailsClass(null)
                    onMarkAttendance?.(bId, cId)
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm"
                >
                  Mark / View Attendance
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deletingClass && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
          onClick={() => !isDeleting && setDeletingClass(null)}
        >
          <div 
            className="relative bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-center space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Class Session?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300">"{deletingClass.title || deletingClass.courseTitle || 'this class'}"</span>? This will remove the class and its attendance records.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingClass(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── TAB 6: Corrections ─────────────────────────────────────────────────────────

function CorrectionsTab({ onCorrectionsChanged, refreshKey = 0 }) {
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [reviewing, setReviewing]     = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectComment, setRejectComment] = useState('')
  const [verifyResults, setVerifyResults] = useState({})
  const [verifying, setVerifying]     = useState(null)
  const [viewingAttachment, setViewingAttachment] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.getCorrections(statusFilter ? { status: statusFilter } : {})
      .then(r => setCorrections(r.data.data || []))
      .catch(() => toast.error('Failed to load correction requests'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load, refreshKey])

  const review = async (id, decision, comment) => {
    setReviewing(id)
    try {
      await adminApi.reviewCorrection(id, { decision, comment: comment || undefined })
      toast.success(`Request ${decision.toLowerCase()}`)
      setRejectingId(null)
      setRejectComment('')
      load()
      onCorrectionsChanged?.()
    } catch { toast.error('Failed to review request') } finally { setReviewing(null) }
  }

  const verify = async (id) => {
    setVerifying(id)
    try {
      const r = await adminApi.verifyCorrection(id)
      setVerifyResults(prev => ({ ...prev, [id]: r.data.data }))
    } catch {
      toast.error('Failed to verify attendance')
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFilter === s ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : corrections.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <ClipboardList className="mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-gray-500 text-sm">No {statusFilter.toLowerCase()} correction requests.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {corrections.map(c => (
            <GlassCard key={c.id} className="p-5 flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{c.studentName}</p>
                <p className="text-xs text-gray-500">{c.classTitle} · {format(new Date(c.classDate), 'd MMM yyyy')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{c.currentStatus} → {c.requestedStatus}</p>
                <p className="text-xs text-gray-500 mt-1">Reason: {c.reason}</p>
                {c.comment && <p className="text-xs text-gray-400 mt-0.5">Comment: {c.comment}</p>}
                {c.documentUrl && (
                  <button
                    type="button"
                    onClick={() => setViewingAttachment({ url: c.documentUrl, name: `${c.studentName || 'Student'} Correction Document` })}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={11} /> View document
                  </button>
                )}

                {c.status === 'PENDING' && (
                  verifyResults[c.id] ? (
                    <div className={`mt-2 text-xs rounded-xl p-2.5 border max-w-sm ${
                      verifyResults[c.id].verified
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                        : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                    }`}>
                      {verifyResults[c.id].verified ? (
                        <>
                          <p className="font-semibold flex items-center gap-1"><CheckCircle size={13} /> Joined a scheduled class that day</p>
                          {verifyResults[c.id].matchedMeetings.filter(m => m.joined).map(m => (
                            <p key={m.meetingId} className="mt-1 opacity-90">
                              "{m.title}" ({m.platform}) — joined {format(new Date(m.firstJoinedAt), 'hh:mm a')}
                              {m.joinCount > 1 ? `, ${m.joinCount}×` : ''}
                            </p>
                          ))}
                        </>
                      ) : verifyResults[c.id].matchedMeetings.length > 0 ? (
                        <p className="font-semibold flex items-center gap-1">
                          <AlertTriangle size={13} /> No join record for {verifyResults[c.id].matchedMeetings.length} scheduled class{verifyResults[c.id].matchedMeetings.length === 1 ? '' : 'es'} that day
                        </p>
                      ) : (
                        <p className="font-semibold flex items-center gap-1">
                          <AlertTriangle size={13} /> No Scheduled Class found for this batch that day
                        </p>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => verify(c.id)} disabled={verifying === c.id}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50">
                      {verifying === c.id ? 'Checking...' : 'Verify against Scheduled Class'}
                    </button>
                  )
                )}
              </div>
              {c.status === 'PENDING' ? (
                rejectingId === c.id ? (
                  <div className="flex flex-col gap-2 w-full sm:w-64 flex-shrink-0">
                    <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} rows={2}
                      placeholder="Reason for rejection (optional)"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => review(c.id, 'REJECTED', rejectComment)} disabled={reviewing === c.id}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors">
                        Confirm Reject
                      </button>
                      <button onClick={() => { setRejectingId(null); setRejectComment('') }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => review(c.id, 'APPROVED')} disabled={reviewing === c.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 transition-colors">
                      Approve
                    </button>
                    <button onClick={() => setRejectingId(c.id)} disabled={reviewing === c.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors">
                      Reject
                    </button>
                  </div>
                )
              ) : (
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${c.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {c.status}
                </span>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* In-app correction document preview modal */}
      {viewingAttachment && (
        <ViewAttachmentModal
          url={viewingAttachment.url}
          name={viewingAttachment.name}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'today',       label: 'Today',            icon: Calendar },
  { key: 'mark',        label: 'Mark Attendance',  icon: CheckSquare },
  { key: 'overview',    label: 'Batch Overview',   icon: Users },
  { key: 'analytics',   label: 'Analytics',        icon: BarChart2 },
  { key: 'alerts',      label: 'Alerts',           icon: Bell },
  { key: 'history',     label: 'History',          icon: History },
  { key: 'corrections', label: 'Corrections',      icon: ClipboardList },
]

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [initialBatchId, setInitialBatchId] = useState(null)
  const [initialClassId, setInitialClassId] = useState(null)

  // Restore active tab and optional batch/class from URL search params or sessionStorage on load/refresh
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      const batchParam = params.get('batchId')
      const classParam = params.get('classId')

      const validTabs = ['today', 'mark', 'overview', 'analytics', 'alerts', 'history', 'corrections']

      let targetTab = 'today'
      if (tabParam && validTabs.includes(tabParam)) {
        targetTab = tabParam
      } else {
        const savedTab = sessionStorage.getItem('attendance_active_tab')
        if (savedTab && validTabs.includes(savedTab)) {
          targetTab = savedTab
        }
      }

      setActiveTab(targetTab)
      if (batchParam) setInitialBatchId(batchParam)
      if (classParam) setInitialClassId(classParam)

      // Sync URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.set('tab', targetTab)
      if (batchParam) url.searchParams.set('batchId', batchParam)
      if (classParam) url.searchParams.set('classId', classParam)
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch (e) {
      console.error('Failed to restore attendance tab:', e)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success('Attendance data refreshed')
    }, 400)
  }, [])

  const handleTabChange = (key) => {
    setActiveTab(key)
    setRefreshKey(k => k + 1)
    try {
      sessionStorage.setItem('attendance_active_tab', key)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', key)
      if (key !== 'mark') {
        url.searchParams.delete('batchId')
        url.searchParams.delete('classId')
        setInitialBatchId(null)
        setInitialClassId(null)
      }
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch (e) {
      console.error('Failed to sync tab to URL:', e)
    }
  }

  const handleMarkAttendanceFromToday = (batchId, classId) => {
    setInitialBatchId(batchId)
    setInitialClassId(classId)
    setActiveTab('mark')
    try {
      sessionStorage.setItem('attendance_active_tab', 'mark')
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'mark')
      if (batchId) url.searchParams.set('batchId', String(batchId))
      if (classId) url.searchParams.set('classId', String(classId))
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch {}
  }

  const handleViewAttendanceFromToday = (batchId, classId) => {
    setInitialBatchId(batchId)
    setInitialClassId(classId)
    setActiveTab('mark')
    try {
      sessionStorage.setItem('attendance_active_tab', 'mark')
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'mark')
      if (batchId) url.searchParams.set('batchId', String(batchId))
      if (classId) url.searchParams.set('classId', String(classId))
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch {}
  }

  const exportCSV = async () => {
    try {
      let rows = []
      let filename = `attendance-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`

      if (activeTab === 'today') {
        const res = await adminApi.getTodayClasses()
        const data = res.data?.data || res.data || []
        const list = Array.isArray(data) ? data : (data.classes || data.todayClasses || [])
        rows = list.map(c => ({
          'Class Title': c.title || c.classTitle || 'Class Session',
          'Batch Name': c.batchName || c.batch?.name || 'General',
          'Scheduled Time': c.scheduledStart || c.time || c.date || 'Today',
          'Status': c.status || 'SCHEDULED',
          'Meeting Link': c.meetUrl || c.meetLink || 'N/A'
        }))
      } else if (activeTab === 'overview') {
        const res = await adminApi.getAttendanceOverview()
        const data = res.data?.data || res.data || []
        const list = Array.isArray(data) ? data : (data.batches || data.overview || [])
        rows = list.map(b => ({
          'Batch Name': b.batchName || b.name || 'N/A',
          'Course Title': b.courseTitle || b.course?.title || 'N/A',
          'Total Students': b.totalStudents || b.studentCount || 0,
          'Total Classes': b.totalClasses || b.classCount || 0,
          'Average Attendance Rate (%)': b.avgAttendancePct != null ? `${b.avgAttendancePct}%` : (b.attendanceRate != null ? `${b.attendanceRate}%` : '0%'),
          'At Risk Students': b.atRiskCount || b.below75Count || 0
        }))
      } else if (activeTab === 'analytics') {
        const res = await adminApi.getAttendanceAnalytics()
        const data = res.data?.data || res.data || {}
        const trend = data.dailyTrend || data.trend || (Array.isArray(data) ? data : [])
        rows = trend.map(t => ({
          'Date / Period': t.date || t.label || t.period || 'N/A',
          'Present Count': t.present || t.presentCount || 0,
          'Absent Count': t.absent || t.absentCount || 0,
          'Late Count': t.late || t.lateCount || 0,
          'Total Classes': t.total || t.totalCount || 0,
          'Attendance Rate (%)': t.percentage != null ? `${t.percentage}%` : (t.rate != null ? `${t.rate}%` : '0%')
        }))
      } else if (activeTab === 'alerts') {
        const res = await adminApi.getAttendanceAlerts()
        const data = res.data?.data || res.data || []
        const list = Array.isArray(data) ? data : (data.alerts || data.content || [])
        rows = list.map(a => ({
          'Student Name': a.studentName || a.student?.user?.name || 'N/A',
          'Enrollment No': a.enrollmentNo || a.student?.enrollmentNo || 'N/A',
          'Batch': a.batchName || a.batch?.name || 'N/A',
          'Attendance Rate (%)': a.overallPercentage != null ? `${a.overallPercentage}%` : `${a.percentage || 0}%`,
          'Risk Level': a.riskLevel || (a.overallPercentage < 60 ? 'CRITICAL' : 'AT_RISK'),
          'Status': a.resolved ? 'Resolved' : 'Active Alert'
        }))
      } else if (activeTab === 'history') {
        const res = await adminApi.getAttendanceHistory()
        const data = res.data?.data || res.data || []
        const list = Array.isArray(data) ? data : (data.content || data.history || [])
        rows = list.map(h => ({
          'Date': h.date || h.markedAt || 'N/A',
          'Class Title': h.classTitle || h.title || 'N/A',
          'Batch': h.batchName || 'N/A',
          'Student Name': h.studentName || 'N/A',
          'Enrollment No': h.enrollmentNo || 'N/A',
          'Attendance Status': h.status || h.attendanceStatus || 'N/A',
          'Marked By': h.markedByName || h.markedBy || 'System'
        }))
      } else if (activeTab === 'corrections') {
        const res = await adminApi.getCorrections()
        const data = res.data?.data || res.data || []
        const list = Array.isArray(data) ? data : (data.content || data.corrections || [])
        rows = list.map(c => ({
          'Student Name': c.studentName || c.student?.user?.name || 'N/A',
          'Class Title': c.classTitle || c.dailyClass?.title || 'N/A',
          'Current Status': c.currentStatus || 'N/A',
          'Requested Status': c.requestedStatus || 'PRESENT',
          'Reason': c.reason || 'N/A',
          'Comment': c.comment || 'N/A',
          'Status': c.status || (c.approved ? 'APPROVED' : c.rejected ? 'REJECTED' : 'PENDING'),
          'Submitted At': c.createdAt || c.submittedAt || 'N/A'
        }))
      } else {
        const r = await adminApi.exportCSV({ type: 'attendance' })
        const rawData = r.data?.data || r.data || []
        rows = Array.isArray(rawData) ? rawData : []
      }

      if (!rows || !rows.length) {
        return toast.error(`No data available to export for ${activeTab.toUpperCase()} view`)
      }

      const headers = Object.keys(rows[0]).join(',')
      const lines = rows.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers, ...lines].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${activeTab.toUpperCase()} attendance data successfully!`)
    } catch (err) {
      console.error('Export CSV Error:', err)
      toast.error('Export failed: ' + (err?.response?.data?.message || err.message || 'Unknown error'))
    }
  }

  const handleAttendanceSaved = (autoClose = false) => {
    handleRefresh()
    if (autoClose) {
      handleTabChange('today')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Attendance Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track, analyze and manage student attendance across all batches</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh real-time stats"
              className="flex items-center gap-2 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-purple-600' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button onClick={exportCSV}
              title={`Export ${activeTab.toUpperCase()} data as CSV`}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-colors shadow-sm">
              <FileDown size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Command Center */}
        <CommandCenterStrip refreshKey={refreshKey} />

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl w-fit flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-purple-600 dark:hover:text-purple-400'
              }`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'today'       && (
          <TodayTab
            refreshKey={refreshKey}
            onMarkAttendance={handleMarkAttendanceFromToday}
            onViewAttendance={handleViewAttendanceFromToday}
            onClassDeleted={handleRefresh}
          />
        )}
        {activeTab === 'mark'        && (
          <MarkAttendanceTab
            refreshKey={refreshKey}
            onAttendanceSaved={handleAttendanceSaved}
            initialBatchId={initialBatchId}
            initialClassId={initialClassId}
          />
        )}
        {activeTab === 'overview'    && <BatchOverviewTab refreshKey={refreshKey} />}
        {activeTab === 'analytics'   && <AnalyticsTab refreshKey={refreshKey} />}
        {activeTab === 'alerts'      && <AlertsTab refreshKey={refreshKey} onAlertsChanged={handleRefresh} />}
        {activeTab === 'history'     && <HistoryTab refreshKey={refreshKey} />}
        {activeTab === 'corrections' && <CorrectionsTab refreshKey={refreshKey} onCorrectionsChanged={handleRefresh} />}
    </div>
  )
}
