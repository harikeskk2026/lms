'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  CheckSquare, Save, BarChart2, Bell, Users, BookOpen,
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Download, RefreshCw, ChevronDown, Calendar, ClipboardList,
  Copy, FileEdit, XCircle, History, Paperclip, Upload, FileText, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import assignmentService from '@/services/assignmentService'

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, ReferenceLine, ComposedChart
} from 'recharts'
import { format } from 'date-fns'
import AttendanceMatrix from '@/components/admin/AttendanceMatrix'
import AttendanceHeatmap from '@/components/admin/AttendanceHeatmap'
import HistoryTab from './HistoryTab'

// ─── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PRESENT: { label: 'P',  color: 'bg-green-500 text-white',  hover: 'hover:bg-green-100 hover:text-green-700' },
  ABSENT:  { label: 'A',  color: 'bg-red-500 text-white',    hover: 'hover:bg-red-100 hover:text-red-700' },
  LATE:    { label: 'L',  color: 'bg-yellow-400 text-white', hover: 'hover:bg-yellow-100 hover:text-yellow-800' },
  LEAVE:   { label: 'Lv', color: 'bg-blue-500 text-white',   hover: 'hover:bg-blue-100 hover:text-blue-700' },
}



const TOOLTIP_STYLE = { background: '#1e1b4b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }

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

function MarkAttendanceTab() {
  const [batches, setBatches]             = useState([])
  const [classes, setClasses]             = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
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
  const [history, setHistory]             = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedIds, setSelectedIds]     = useState([])
  const [bulkStatus, setBulkStatus]       = useState('PRESENT')

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await assignmentService.upload(file)
      const newAttachment = {
        name: res.data?.fileName || file.name,
        url: res.data?.url || '',
        size: (file.size / 1024).toFixed(1) + ' KB'
      }
      setAttachments(prev => [...prev, newAttachment])
      toast.success(`Attached ${file.name}`)
    } catch {
      const newAttachment = {
        name: file.name,
        url: URL.createObjectURL(file),
        size: (file.size / 1024).toFixed(1) + ' KB'
      }
      setAttachments(prev => [...prev, newAttachment])
      toast.success(`Attached ${file.name}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }


  useEffect(() => {
    adminApi.getBatches({ isActive: 'true' }).then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  const loadClasses = async (batchId) => {
    setSelectedBatch(batchId)
    setSelectedClass('')
    setSheet(null)
    setSaveResult(null)
    if (!batchId) return
    const r = await adminApi.getClasses({ batchId })
    setClasses(r.data.data || [])
  }

  const loadSheet = async () => {
    if (!selectedClass) return toast.error('Select a class')
    setLoading(true)
    setSaveResult(null)
    try {
      const [sheetRes, detailRes] = await Promise.allSettled([
        adminApi.getAttendanceSheet(selectedClass),
        adminApi.getBatchAttDetail(selectedBatch),
      ])
      const rawSheet = sheetRes.status === 'fulfilled' ? sheetRes.value.data.data : null
      const detailData = detailRes.status === 'fulfilled' ? detailRes.value.data.data : null

      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass))
      const selectedBatchObj = batches.find(b => String(b.id) === String(selectedBatch))

      const studentList = Array.isArray(rawSheet) ? rawSheet : (rawSheet?.students || [])

      const formattedSheet = {
        class: selectedClassObj ? {
          id: selectedClassObj.id,
          title: selectedClassObj.title,
          date: selectedClassObj.date,
          batch: selectedBatchObj || { name: 'Batch' }
        } : (rawSheet?.class || { title: 'Class', date: new Date().toISOString(), batch: { name: 'Batch' } }),
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
    } catch (err) {
      console.error(err)
      toast.error('Failed to load attendance sheet')
    } finally {
      setLoading(false)
    }
  }

  const saveAttendance = async (submit = true) => {
    setSaving(true)
    try {
      const records = Object.entries(statuses).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status,
        remarks: remarks[studentId]?.trim() || undefined,
      }))
      await (submit ? adminApi.submitAttendance(selectedClass, records) : adminApi.saveAttendanceDraft(selectedClass, records))
      if (submit) {
        const counts = Object.fromEntries(Object.keys(STATUS_CONFIG).map(s => [s, 0]))
        for (const s of Object.values(statuses)) counts[s] = (counts[s] || 0) + 1
        setSaveResult(counts)
        toast.success('Attendance saved successfully')
      } else {
        toast.success('Draft saved — class stays pending')
      }
    } catch { toast.error('Failed to save attendance') } finally { setSaving(false) }
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

  const filteredStudents = (sheet?.students || []).filter(s => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return true
    return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.enrollmentNo?.toLowerCase().includes(q)
  })

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
              {saveResult.LATE > 0 ? `, ${saveResult.LATE} late` : ''}
              {saveResult.LEAVE > 0 ? `, ${saveResult.LEAVE} on leave` : ''}

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
            <select value={selectedBatch} onChange={e => loadClasses(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={!selectedBatch}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{new Date(c.date).toLocaleDateString('en-IN')} — {c.title}</option>)}
            </select>
          </div>
        </div>
        <button onClick={loadSheet} disabled={!selectedClass || loading}
          className="mt-4 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:from-purple-700 disabled:opacity-50 transition-all">
          <CheckSquare size={16} />
          {loading ? 'Loading...' : 'Load Attendance Sheet'}
        </button>
      </GlassCard>

      {/* Step 2: Mark */}
      {sheet && (
        <div className="space-y-5 pb-6">

          {/* Class info + counts */}
          <GlassCard className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-display font-bold text-gray-800 dark:text-white">{sheet.class?.title}</p>
              <p className="text-xs text-gray-500">{sheet.class?.batch?.name} · {sheet.class?.date ? format(new Date(sheet.class.date), 'd MMMM yyyy') : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(counts).map(([s, c]) => (
                <div key={s} className="text-center px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-extrabold text-gray-800 dark:text-white">{c}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">{s}</p>
                </div>
              ))}
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
                  <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500">
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}</option>)}
                  </select>
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
              <table className="w-full text-sm">
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
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                  />
                </label>
              </div>

              {/* Attachments list */}
              {attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/70 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 text-xs">
                      <FileText size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">{file.name}</span>
                      {file.size && <span className="text-[10px] text-gray-400">({file.size})</span>}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                        title="Remove file"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mt-1">No attachments added yet.</p>
              )}
            </div>
          </GlassCard>


          {/* Sticky save bar */}
          <div className="sticky bottom-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl -mx-6 -mb-6 px-6 py-4 border-t border-purple-100 dark:border-purple-900/30 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="text-green-600 font-semibold">{counts.PRESENT || 0} present</span>
                {' · '}
                <span className="text-red-500 font-semibold">{counts.ABSENT || 0} absent</span>
                {' · '}
                <span className="text-yellow-600 font-semibold">{counts.LATE || 0} late</span>
                {' · '}
                <span className="text-blue-500 font-semibold">{counts.LEAVE || 0} leave</span>
              </p>

              <div className="flex items-center gap-2">
                <button onClick={() => saveAttendance(false)} disabled={saving}
                  className="flex items-center gap-2 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-60 transition-all">
                  Save Draft
                </button>
                <button onClick={() => saveAttendance(true)} disabled={saving}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:from-purple-700 disabled:opacity-60 transition-all">
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── TAB 2: Batch Overview ─────────────────────────────────────────────────────

function BatchOverviewTab() {
  const [overview, setOverview]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [detail, setDetail]             = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [monthFilter, setMonthFilter]   = useState('')

  useEffect(() => {
    adminApi.getAttendanceOverview()
      .then(r => setOverview(r.data.data || []))
      .catch(() => toast.error('Failed to load overview'))
      .finally(() => setLoading(false))
  }, [])

  const openBatch = async (batch) => {
    setSelectedBatch(batch)
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
  const avgAttendance  = overview?.length ? Math.round(overview.reduce((s, b) => s + b.avgAttendance, 0) / overview.length) : 0
  const lowStudents    = overview?.reduce((s, b) => s + b.lowAttendanceCount, 0) || 0

  // Drilldown view
  if (selectedBatch) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => { setSelectedBatch(null); setDetail(null) }}
            className="flex items-center gap-2 text-sm text-purple-600 font-semibold hover:text-purple-800 transition-colors">
            <ArrowLeft size={16} /> Back to Overview
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Month:</label>
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <GlassCard className="p-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{selectedBatch.batchName}</h2>
          <p className="text-sm text-gray-500">{selectedBatch.course}</p>
        </GlassCard>

        {detailLoading ? (
          <Skeleton className="h-64" />
        ) : detail ? (
          <GlassCard className="p-5">
            <AttendanceMatrix classes={detail.classes} matrix={detail.matrix} />
          </GlassCard>
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

function AnalyticsTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]       = useState(30)
  const [batchId, setBatchId] = useState('')
  const [batches, setBatches] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.getAttendanceAnalytics({ days, ...(batchId ? { batchId } : {}) })
      setData(r.data.data)
    } catch { toast.error('Failed to load analytics') } finally { setLoading(false) }
  }, [days, batchId])

  useEffect(() => {
    adminApi.getBatches({ isActive: 'true' }).then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  // Day-of-week analysis
  const dayOfWeekStats = {}
  if (data?.dailyTrend) {
    for (const d of data.dailyTrend) {
      const dow = new Date(d.date).getDay()
      if (!dayOfWeekStats[dow]) dayOfWeekStats[dow] = { total: 0, count: 0 }
      dayOfWeekStats[dow].total += d.pct
      dayOfWeekStats[dow].count++
    }
  }

  // Most absent day
  let mostAbsentDay = null
  if (data?.dailyTrend?.length) {
    const dowAvgs = {}
    for (const d of data.dailyTrend) {
      const dow = new Date(d.date).getDay()
      if (!dowAvgs[dow]) dowAvgs[dow] = { total: 0, count: 0 }
      dowAvgs[dow].total += d.pct; dowAvgs[dow].count++
    }
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const sorted = Object.entries(dowAvgs).sort(([, a], [, b]) => (a.total / a.count) - (b.total / b.count))
    if (sorted.length) {
      const [dow, stat] = sorted[0]
      mostAbsentDay = `${DAYS[dow]} (avg ${Math.round(stat.total / stat.count)}%)`
    }
  }

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
        <select value={batchId} onChange={e => setBatchId(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
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
            <StatCard label="Total Classes Tracked"   value={data.dailyTrend?.length || 0} icon={BookOpen} />
            <StatCard label="Most Absent Day" value={mostAbsentDay || '—'} icon={TrendingDown} iconColor="text-yellow-500" />
          </div>

          {/* Area chart — Attendance Trend */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.dailyTrend} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6d28d9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd668" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffd668" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#6d28d9" fill="url(#colorPresent)" strokeWidth={2} />
                <Area type="monotone" dataKey="absent"  name="Absent"  stroke="#ffd668" fill="url(#colorAbsent)"  strokeWidth={2} />
                <Area type="monotone" dataKey="late"    name="Late"    stroke="#93c5fd" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Weekly + Monthly charts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Weekly Attendance Rate</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.weeklyTrend} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Attendance']} />
                  <ReferenceLine y={75} stroke="#ffd668" strokeDasharray="4 2" label={{ value: '75% min', fill: '#ffd668', fontSize: 10 }} />
                  <Line type="monotone" dataKey="pct" name="Rate" stroke="#6d28d9" strokeWidth={2.5} dot={{ fill: '#6d28d9', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Monthly Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyTrend} barSize={16} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="present" name="Present" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent"  name="Absent"  fill="#ffd668" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late"    name="Late"    fill="#93c5fd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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

function AlertsTab() {
  const [alerts, setAlerts]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [threshold, setThreshold]   = useState(75)
  const [showResolved, setShowResolved] = useState(false)
  const [generating, setGenerating] = useState(false)

  const load = async (resolved = false) => {
    setLoading(true)
    try {
      const r = await adminApi.getAttendanceAlerts({ resolved: resolved ? 'true' : 'false' })
      setAlerts(r.data.data || [])
    } catch { toast.error('Failed to load alerts') } finally { setLoading(false) }
  }

  useEffect(() => { load(showResolved) }, [showResolved])

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await adminApi.generateAlerts({ threshold })
      toast.success(`Generated ${r.data.data.generated} new alerts (checked ${r.data.data.checked} students)`)
      load(false)
    } catch { toast.error('Failed to generate alerts') } finally { setGenerating(false) }
  }

  const resolve = async (id) => {
    try {
      await adminApi.resolveAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('Alert resolved')
    } catch { toast.error('Failed to resolve') }
  }

  const RISK_COLOR = {
    CRITICAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    HIGH:     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    MEDIUM:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  }

  // Compute risk from pct
  const getRisk = (pct) => pct < 50 ? 'CRITICAL' : pct < 65 ? 'HIGH' : 'MEDIUM'

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Alert when below:</label>
            <input
              type="number" value={threshold} onChange={e => setThreshold(e.target.value)}
              min={50} max={100}
              className="w-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 disabled:opacity-60 transition-all">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Generate Alerts'}
          </button>
          <button
            onClick={() => setShowResolved(r => !r)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${showResolved ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-300'}`}>
            {showResolved ? 'Showing Resolved' : 'Show Resolved'}
          </button>
        </div>
      </GlassCard>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : alerts.length === 0 ? (
        <GlassCard className="p-8 text-center border-l-4 border-green-400">
          <CheckCircle className="mx-auto mb-3 text-green-500" size={36} />
          <p className="font-semibold text-green-700 dark:text-green-400">No low-attendance alerts</p>
          <p className="text-sm text-gray-500 mt-1">All students are on track!</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const pct  = alert.currentPct
            const risk = getRisk(pct)
            return (
              <GlassCard key={alert.id} className="p-5 border-l-4 border-yellow-400">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Low Attendance</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${RISK_COLOR[risk]}`}>{risk}</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white mt-1">
                        {alert.student?.user?.name}
                        {alert.student?.enrollmentNo && <span className="text-xs text-gray-400 ml-2">— {alert.student.enrollmentNo}</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {alert.batch?.name} · {alert.batch?.course?.title}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                          <span className="text-xs text-gray-500 w-16">Current: {pct}%</span>
                          <PctBar pct={pct} />
                          <span className="text-xs text-gray-500">Threshold: {alert.threshold}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {alert.student?.user?.email && (
                          <span>📧 {alert.student.user.email}</span>
                        )}
                        {alert.student?.user?.phone && (
                          <span>📱 {alert.student.user.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!showResolved && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => resolve(alert.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 transition-colors">
                        Resolve
                      </button>
                      {alert.student?.userId && (
                        <a href={`/admin/students/${alert.student.userId}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 transition-colors">
                          View Student
                        </a>
                      )}
                    </div>
                  )}
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

function CommandCenterStrip() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    adminApi.getAttendanceDashboard().then(r => setStats(r.data.data)).catch(() => {})
  }, [])

  if (!stats) return <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>

  const cards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users },
    { label: "Today's Classes", value: stats.todaysClasses, icon: Calendar },
    { label: 'Average Attendance', value: `${stats.averageAttendance}%`, icon: TrendingUp },
    { label: 'Below 75%', value: stats.below75Count, icon: AlertTriangle, iconColor: 'text-yellow-500' },
    { label: 'Critical Students', value: stats.criticalCount, icon: XCircle, iconColor: 'text-red-500' },
    { label: 'Unmarked Classes', value: stats.unmarkedClasses, icon: FileEdit, iconColor: 'text-orange-500' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <GlassCard key={c.label} className="p-4">
          <c.icon size={16} className={c.iconColor || 'text-purple-600'} />
          <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-2">{c.value}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{c.label}</p>
        </GlassCard>
      ))}
    </div>
  )
}

// ─── TAB 5: Today ───────────────────────────────────────────────────────────────

function TodayTab() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getTodayClasses()
      .then(r => setClasses(r.data.data || []))
      .catch(() => toast.error('Failed to load today\'s classes'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>

  if (classes.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Calendar className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="text-gray-500 text-sm">No classes scheduled for today.</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-3">
      {classes.map(c => (
        <GlassCard key={c.classId} className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">{c.title}</p>
            <p className="text-xs text-gray-500">{c.batchName} · {format(new Date(c.date), 'h:mm a')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm font-bold text-green-600">{c.present}</p>
              <p className="text-[10px] text-gray-400">Present</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-yellow-600">{c.absent}</p>
              <p className="text-[10px] text-gray-400">Absent</p>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${c.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
              {c.status === 'COMPLETED' ? 'Completed' : 'Pending'}
            </span>
            {c.meetLink && (
              <a href={c.meetLink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-purple-600 hover:underline">Join</a>
            )}
            {c.recordingUrl && (
              <a href={c.recordingUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-purple-600 hover:underline">Recording</a>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

// ─── TAB 6: Corrections ─────────────────────────────────────────────────────────

function CorrectionsTab() {
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [reviewing, setReviewing]     = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectComment, setRejectComment] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    adminApi.getCorrections(statusFilter ? { status: statusFilter } : {})
      .then(r => setCorrections(r.data.data || []))
      .catch(() => toast.error('Failed to load correction requests'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const review = async (id, decision, comment) => {
    setReviewing(id)
    try {
      await adminApi.reviewCorrection(id, { decision, comment: comment || undefined })
      toast.success(`Request ${decision.toLowerCase()}`)
      setRejectingId(null)
      setRejectComment('')
      load()
    } catch { toast.error('Failed to review request') } finally { setReviewing(null) }
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
                  <a href={c.documentUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline mt-0.5 inline-block">View document</a>
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
  const [activeTab, setActiveTab] = useState('mark')

  const exportCSV = async () => {
    try {
      const r = await adminApi.exportCSV({ type: 'attendance' })
      const rawData = r.data?.data || r.data || []
      const rows = Array.isArray(rawData) ? rawData : []
      if (!rows.length) return toast.error('No data to export')
      
      const headers = Object.keys(rows[0]).join(',')
      const lines = rows.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(','))
      const csv = [headers, ...lines].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Attendance CSV exported successfully!')
    } catch (err) {
      console.error('Export CSV Error:', err)
      toast.error('Export failed: ' + (err?.response?.data?.message || err.message || 'Unknown error'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-[#0f0a1e] dark:via-[#1a0f35] dark:to-[#0f0a1e]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Attendance Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track, analyze and manage student attendance across all batches</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Command Center */}
        <CommandCenterStrip />

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl w-fit flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
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
        {activeTab === 'today'       && <TodayTab />}
        {activeTab === 'mark'        && <MarkAttendanceTab />}
        {activeTab === 'overview'    && <BatchOverviewTab />}
        {activeTab === 'analytics'   && <AnalyticsTab />}
        {activeTab === 'alerts'      && <AlertsTab />}
        {activeTab === 'history'     && <HistoryTab />}
        {activeTab === 'corrections' && <CorrectionsTab />}
      </div>
    </div>
  )
}
