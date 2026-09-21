'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Calendar, Monitor, MapPin, Pencil, Trash2, Search, ArrowLeft, Loader2, Clock, BookOpen, Upload, FileDown, FileUp } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import CsvImportModal from '@/components/admin/CsvImportModal'
import CustomSelect from '@/components/ui/CustomSelect'
import MultiSelect from '@/components/ui/MultiSelect'
import { validateBatchDates, calculateMaxEndDate } from '@/utils/courseDuration'

const MODE_ICONS = { ONLINE: Monitor, OFFLINE: MapPin }
const MODE_COLORS = {
  ONLINE: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  OFFLINE: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
}
const BATCH_GRADIENTS = [
  'from-purple-500 to-violet-600', 'from-blue-500 to-indigo-600',
  'from-indigo-500 to-purple-600', 'from-violet-500 to-purple-700',
]

function formatTime12h(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  if (isNaN(h)) return time24
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const hFormatted = String(h).padStart(2, '0')
  return `${hFormatted}:${m} ${ampm}`
}

function parseTiming(timing) {
  if (!timing) return { start: '', end: '' }
  const parts = timing.split(' - ')
  if (parts.length < 2) return { start: '', end: '' }
  const parse12hTo24h = (str) => {
    const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    if (!match) return ''
    let h = parseInt(match[1], 10)
    const m = match[2]
    const ampm = match[3]?.toUpperCase()
    if (ampm === 'PM' && h < 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}`
  }
  return {
    start: parse12hTo24h(parts[0]),
    end: parse12hTo24h(parts[1]),
  }
}

export default function BatchesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const canManageBatch = ['SUPERADMIN', 'ADMIN'].includes(user?.role)
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [exportingBatches, setExportingBatches] = useState(false)
  const [form, setForm] = useState({ name: '', courseId: '', trainerIds: [], startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: '' })

  // Clean Time Pickers
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebouncedValue(searchInput, 400)
  const [modeTab, setModeTab] = useState('ALL')
  const batchesAbortRef = useRef(null)

  const selectedCourse = courses.find(c => String(c.id) === String(form.courseId))
  const batchDateError = validateBatchDates(form.startDate, form.endDate, selectedCourse?.duration)
  const maxEndDate = selectedCourse && form.startDate ? calculateMaxEndDate(form.startDate, selectedCourse.duration) : null
  const maxEndDateStr = maxEndDate ? format(maxEndDate, 'yyyy-MM-dd') : undefined

  const load = () => {
    batchesAbortRef.current?.abort()
    const controller = new AbortController()
    batchesAbortRef.current = controller
    setLoading(true)
    batchService.list({
      search: searchQuery.trim() || undefined,
      mode: modeTab === 'ALL' ? undefined : modeTab,
    }, { signal: controller.signal })
      .then(r => setBatches(r.data || []))
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return
        toast.error(err.message || 'Failed to load batches')
      })
      .finally(() => {
        if (batchesAbortRef.current === controller) setLoading(false)
      })
  }

  function downloadBatchesCSV() {
    setExportingBatches(true)
    const headers = ['Name', 'Course', 'Start Date', 'End Date', 'Timing', 'Mode', 'Max Students', 'Trainer Emails']
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = (batches || []).map(b => {
      const courseTitle = b.course?.title ?? b.course?.name ?? b.course ?? ''
      const trainerEmails = Array.isArray(b.trainers) ? b.trainers.map(t => t.email ?? t).join('; ') : ''
      return [
        esc(b.name), esc(courseTitle),
        esc(b.startDate ? new Date(b.startDate).toISOString().slice(0, 10) : ''),
        esc(b.endDate ? new Date(b.endDate).toISOString().slice(0, 10) : ''),
        esc(b.timing), esc(b.mode), esc(b.maxStudents), esc(trainerEmails)
      ]
    })
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batches-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExportingBatches(false)
  }

  function downloadBatchImportTemplateCSV() {
    const headers = ['Name', 'Course', 'Start Date', 'End Date', 'Timing', 'Mode', 'Max Students', 'Trainer Emails']
    const sample = {
      Name: 'Java Full Stack - Sep 2024',
      Course: 'Master Full Stack Java Development',
      'Start Date': '2024-09-01',
      'End Date': '2025-02-28',
      Timing: 'Mon-Fri 6:00 PM - 9:00 PM',
      Mode: 'ONLINE',
      'Max Students': '30',
      'Trainer Emails': 'trainer1@careerlabs.com; trainer2@careerlabs.com'
    }
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = [headers.map(h => esc(sample[h]))]
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batches-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    load()
  }, [searchQuery, modeTab])

  useEffect(() => {
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    adminApi.getTrainers({ limit: 100, status: 'active' })
      .then(r => {
        const list = r.data?.data?.trainers || []
        setTrainers(list.filter(t => t.active === true))
      })
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditingBatch(null)
    setForm({ name: '', courseId: '', trainerIds: [], startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: '' })
    setStartTime('')
    setEndTime('')
    setPanelOpen(true)
  }

  const handleOpenEdit = (batch) => {
    setEditingBatch(batch)
    const activeTrainerIds = (batch.trainers || [])
      .filter(t => t.active === true)
      .map(t => String(t.id))
    setForm({
      name: batch.name || '',
      courseId: batch.course?.id ? String(batch.course.id) : (batch.courseId ? String(batch.courseId) : ''),
      trainerIds: activeTrainerIds,
      startDate: batch.startDate ? batch.startDate.slice(0, 10) : '',
      endDate: batch.endDate ? batch.endDate.slice(0, 10) : '',
      timing: batch.timing || '',
      mode: batch.mode || 'ONLINE',
      maxStudents: batch.maxStudents || '',
    })
    const parsed = parseTiming(batch.timing)
    setStartTime(parsed.start)
    setEndTime(parsed.end)
    setPanelOpen(true)
  }

  const handleOpenDelete = (batch) => {
    setDeletingBatch(batch)
    setShowDeleteModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canManageBatch) {
      toast.error('Only Super Admins and Admins can manage batches')
      return
    }
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date cannot be before start date')
      return
    }
    // Frontend batch date validation (course duration + start<=end)
    if (batchDateError) {
      toast.error(batchDateError)
      return
    }
    if (!selectedCourse) {
      toast.error('Please select a course')
      return
    }
    setSaving(true)
    const formattedTiming = startTime && endTime ? `${formatTime12h(startTime)} - ${formatTime12h(endTime)}` : ''
    const payload = {
      ...form,
      timing: formattedTiming,
      courseId: Number(form.courseId),
      trainerIds: form.trainerIds.map(Number),
      maxStudents: form.maxStudents ? Number(form.maxStudents) : 30,
    }
    try {
      if (editingBatch) {
        await batchService.update(editingBatch.id, payload)
        toast.success('Batch updated successfully')
      } else {
        await batchService.create(payload)
        toast.success('Batch created successfully')
      }
      setPanelOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || (editingBatch ? 'Failed to update batch' : 'Failed to create batch'))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingBatch) return
    setSaving(true)
    try {
      await batchService.remove(deletingBatch.id)
      toast.success('Batch deleted successfully')
      setShowDeleteModal(false)
      setDeletingBatch(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete batch')
    } finally {
      setSaving(false)
    }
  }

  const isTrainer = user?.role === 'TRAINER'

  const modeCounts = {
    ALL: batches.length,
    ONLINE: batches.reduce((n, b) => (b.mode === 'ONLINE' ? n + 1 : n), 0),
    OFFLINE: batches.reduce((n, b) => (b.mode === 'OFFLINE' ? n + 1 : n), 0),
  }

  if (panelOpen) {
    const isTimeValid = (!startTime && !endTime) || (Boolean(startTime) && Boolean(endTime) && startTime < endTime)
    const isMaxStudentsValid = !form.maxStudents || (Number(form.maxStudents) >= 1 && Number(form.maxStudents) <= 500)
    const isBatchFormValid = Boolean(
      form.name?.trim() &&
      form.courseId &&
      form.startDate &&
      form.endDate &&
      !batchDateError &&
      isTimeValid &&
      isMaxStudentsValid
    )

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {editingBatch ? 'Edit Batch' : 'Create New Batch'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {editingBatch ? 'Update batch schedule, assigned trainers, and cohort limits.' : 'Set up a new training batch, assign course, trainers, and timing schedule.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Batch & Course Information */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">1</div>
              <span>Batch &amp; Course Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Batch Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. FS-JAVA-AUG24"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course *</label>
                <CustomSelect
                  value={form.courseId}
                  onChange={(val) => setForm(f => ({ ...f, courseId: val }))}
                  options={courses.filter(c => c.status === 'PUBLISHED').map(c => ({
                    value: c.id,
                    label: `${c.title}${c.duration ? ` — ${c.duration}` : ''}`
                  }))}
                  placeholder="Select course"
                />
                {selectedCourse && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Selected course duration: <span className="font-semibold text-purple-600 dark:text-purple-400">{selectedCourse.duration}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Trainers Assignment */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</div>
              <span>Trainers Assignment</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assign Trainers (Optional)</label>
              <MultiSelect
                value={form.trainerIds}
                onChange={(vals) => setForm(f => ({ ...f, trainerIds: vals.map(String) }))}
                options={trainers.filter(t => t.active === true).map(t => ({
                  value: String(t.id),
                  label: `${t.name}${t.designation ? ` (${t.designation})` : ''}`
                }))}
                placeholder="Select one or more trainers (optional)"
                searchable={trainers.length >= 10}
              />
              {(editingBatch?.trainers || [])
                .filter(t => t.active === false && !form.trainerIds.includes(String(t.id)))
                .map(t => (
                  <p key={t.id} className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                    Previous trainer ({t.name}) is inactive. Please select an active trainer or remove them.
                  </p>
                ))}
            </div>
          </div>

          {/* Section 3: Schedule & Timing */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
              <span>Schedule &amp; Timing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  placeholder="Select start time"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  placeholder="Select end time"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200 transition-all"
                />
              </div>
            </div>

            {startTime && endTime && startTime >= endTime && (
              <p className="text-xs text-red-500 font-medium">End time must be after start time</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => {
                    const newStart = e.target.value
                    setForm(f => ({
                      ...f,
                      startDate: newStart,
                      endDate: f.endDate && newStart && f.endDate < newStart ? '' : f.endDate,
                    }))
                  }}
                  required
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">End Date *</label>
                <input
                  type="date"
                  min={form.startDate || undefined}
                  max={maxEndDateStr}
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                  className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs outline-none focus:ring-2 ${batchDateError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'} text-gray-800 dark:text-gray-200 transition-all`}
                />
              </div>
            </div>

            {selectedCourse && form.startDate && maxEndDate && (
              <p className="text-xs text-gray-500">
                Max allowed end date for <span className="font-semibold">{selectedCourse.duration}</span> from {format(new Date(form.startDate), 'dd MMM yyyy')} is <span className="font-semibold text-purple-600 dark:text-purple-400">{format(maxEndDate, 'dd MMM yyyy')}</span>
              </p>
            )}
            {batchDateError && (
              <p className="text-xs text-red-500 font-medium">{batchDateError}</p>
            )}
          </div>

          {/* Section 4: Capacity & Delivery Mode */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">4</div>
              <span>Capacity &amp; Delivery Mode</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mode</label>
                <CustomSelect
                  value={form.mode}
                  onChange={(val) => setForm(f => ({ ...f, mode: val }))}
                  options={[
                    { value: 'ONLINE', label: 'ONLINE' },
                    { value: 'OFFLINE', label: 'OFFLINE' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max Students</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={form.maxStudents}
                  onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))}
                  placeholder="Enter max students (1-500)"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200 transition-all"
                />
                {form.maxStudents && (Number(form.maxStudents) < 1 || Number(form.maxStudents) > 500) && (
                  <p className="text-xs text-red-500 font-medium mt-1">Max students must be between 1 and 500</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isBatchFormValid}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-500/20 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingBatch ? 'Saving Changes...' : 'Creating Batch...'}
                </>
              ) : (
                editingBatch ? 'Save Changes' : 'Create Batch'
              )}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Batches</h1>
          {isTrainer && (
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">Showing batches assigned to you</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search batches..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            )}
          </div>
          {canManageBatch && (
            <>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors whitespace-nowrap"
              >
                <Upload size={16} /> Import
              </button>
              <button
                type="button"
                onClick={downloadBatchesCSV}
                disabled={exportingBatches}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <FileDown size={16} /> Export
              </button>
            </>
          )}
          {canManageBatch && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} /> Create Batch
            </button>
          )}
        </div>
      </div>

      {/* Mode Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3 overflow-x-auto">
        {[
          { key: 'ALL', label: 'All Batches' },
          { key: 'ONLINE', label: 'Online' },
          { key: 'OFFLINE', label: 'Offline' },
        ].map(t => {
          const isActive = modeTab === t.key
          const count = modeCounts[t.key] || 0
          return (
            <button
              key={t.key}
              onClick={() => setModeTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700/60'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 glass-card animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-gray-400">
            {searchQuery.trim()
              ? `No batches found matching "${searchQuery}".`
              : modeTab !== 'ALL'
              ? `No ${modeTab.toLowerCase()} batches available.`
              : isTrainer
              ? 'No batches assigned to you yet.'
              : canManageBatch
              ? 'No batches yet. Create your first batch.'
              : 'No batches available.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b, i) => {
            const grad = BATCH_GRADIENTS[i % BATCH_GRADIENTS.length]
            const enrolled = b.studentCount || 0
            const fillPct = Math.round((enrolled / b.maxStudents) * 100)
            return (
              <div key={b.id} className="glass-card overflow-hidden hover:scale-[1.02] transition-transform duration-200 flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${grad} px-5 py-4 text-white relative`}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <h3 className="font-display font-bold text-lg break-words">{b.name}</h3>
                        <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full inline-block break-words max-w-full">
                          {b.course?.title || 'No course assigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                          b.status === 'ACTIVE' ? 'bg-green-400/30 text-green-100'
                          : b.status === 'UPCOMING' ? 'bg-blue-400/30 text-blue-100'
                          : 'bg-gray-400/30 text-gray-200'
                        }`}>
                          {b.status === 'ACTIVE' ? 'Active' : b.status === 'UPCOMING' ? 'Upcoming' : 'Ended'}
                        </span>
                        {canManageBatch && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(b); }}
                            title="Edit Batch"
                            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MODE_COLORS[b.mode]}`}>
                        {b.mode}
                      </span>
                      {b.timing && <span className="text-xs text-gray-500 font-medium">{b.timing}</span>}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1"><Users size={11} /> Students</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{enrolled}/{b.maxStudents}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(fillPct, 100)}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={11} />
                      <span>
                        {b.startDate ? format(new Date(b.startDate), 'dd MMM yyyy') : 'TBD'} → {b.endDate ? format(new Date(b.endDate), 'dd MMM yyyy') : 'TBD'}
                      </span>
                    </div>

                    {b.trainers && b.trainers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {b.trainers.map(t => (
                          <div key={t.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-[9px]">
                              {t.name[0]}
                            </div>
                            <span className="break-words">{t.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/admin/batches/${b.id}`)}
                    className="flex-1 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-sm font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-center"
                  >
                    View Details →
                  </button>
                  {canManageBatch && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenDelete(b); }}
                      title="Delete Batch"
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}



      {/* Import Batches Modal */}
      <CsvImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Batches"
        subtitle="Bulk create batches from a CSV file. Download the template for the exact column format."
        entityLabel="batch"
        templateFilename="batches-import-template.csv"
        templateHeaders={['Name', 'Course', 'Start Date', 'End Date', 'Timing', 'Mode', 'Max Students', 'Trainer Emails']}
        templateRows={[[
          'Java Full Stack - Aug 2024',
          'Master Full Stack Java Development',
          '2024-08-01',
          '2025-01-31',
          '6:00 PM - 9:00 PM',
          'ONLINE',
          '30',
          'trainer1@careerlabs.com; trainer2@careerlabs.com',
        ]]}
        requiredColumns={['name']}
        submitFn={(file) => batchService.bulkImport(file)}
        onSuccess={load}
        helpLines={[
          'Required column: Name.',
          'Course must match an existing course title or course code.',
          'Dates must be in YYYY-MM-DD format and End Date cannot be before Start Date.',
          'Mode must be ONLINE or OFFLINE.',
          'Max Students must be between 1 and 500.',
          'Trainer Emails: semicolon-separated emails of trainers to assign.',
        ]}
      />

      {/* Delete Batch Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal && Boolean(deletingBatch)}
        onClose={() => { setShowDeleteModal(false); setDeletingBatch(null) }}
        onConfirm={handleConfirmDelete}
        title="Delete Batch?"
        itemName={deletingBatch?.name}
        loading={saving}
      />
    </div>
  )
}
