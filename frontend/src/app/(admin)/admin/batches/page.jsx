'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Calendar, Clock, Monitor, MapPin, Pencil, Trash2, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'
import { validateBatchDates, calculateMaxEndDate } from '@/utils/courseDuration'

const MODE_ICONS = { ONLINE: Monitor, OFFLINE: MapPin, HYBRID: Clock }
const MODE_COLORS = {
  ONLINE: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  OFFLINE: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  HYBRID: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40',
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
  const [form, setForm] = useState({ name: '', courseId: '', trainerId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: '' })

  // Clean Time Pickers
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const selectedCourse = courses.find(c => String(c.id) === String(form.courseId))
  const batchDateError = validateBatchDates(form.startDate, form.endDate, selectedCourse?.duration)
  const maxEndDate = selectedCourse && form.startDate ? calculateMaxEndDate(form.startDate, selectedCourse.duration) : null
  const maxEndDateStr = maxEndDate ? format(maxEndDate, 'yyyy-MM-dd') : undefined

  const load = () => {
    setLoading(true)
    batchService.list()
      .then(r => setBatches(r.data || []))
      .catch(err => toast.error(err.message || 'Failed to load batches'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    adminApi.getTrainers({ limit: 100, status: 'active' })
      .then(r => setTrainers(r.data?.data?.trainers || []))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditingBatch(null)
    setForm({ name: '', courseId: '', trainerId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: '' })
    setStartTime('')
    setEndTime('')
    setPanelOpen(true)
  }

  const handleOpenEdit = (batch) => {
    setEditingBatch(batch)
    setForm({
      name: batch.name || '',
      courseId: batch.course?.id ? String(batch.course.id) : (batch.courseId ? String(batch.courseId) : ''),
      trainerId: batch.trainer?.id ? String(batch.trainer.id) : (batch.trainerId ? String(batch.trainerId) : ''),
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
      trainerId: form.trainerId ? Number(form.trainerId) : null,
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
      const msg = err.response?.data?.message || err.message || (editingBatch ? 'Failed to update batch' : 'Failed to create batch')
      toast.error(msg)
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

  const [searchQuery, setSearchQuery] = useState('')
  const [modeTab, setModeTab] = useState('ALL')

  const isTrainer = user?.role === 'TRAINER'
  const userBatches = isTrainer && user?.id
    ? batches.filter(b => b.trainerId === user.id || b.trainer?.id === user.id)
    : batches

  const modeCounts = {
    ALL: userBatches.length,
    ONLINE: userBatches.filter(b => b.mode === 'ONLINE').length,
    OFFLINE: userBatches.filter(b => b.mode === 'OFFLINE').length,
    HYBRID: userBatches.filter(b => b.mode === 'HYBRID').length,
  }

  const displayedBatches = userBatches.filter(b => {
    if (modeTab !== 'ALL' && b.mode !== modeTab) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      b.name?.toLowerCase().includes(q) ||
      b.course?.title?.toLowerCase().includes(q) ||
      b.trainer?.name?.toLowerCase().includes(q) ||
      b.mode?.toLowerCase().includes(q)
    )
  })

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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search batches..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            )}
          </div>
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
          { key: 'HYBRID', label: 'Hybrid' },
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
      ) : displayedBatches.length === 0 ? (
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
          {displayedBatches.map((b, i) => {
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
                        <h3 className="font-display font-bold text-lg truncate">{b.name}</h3>
                        <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                          {b.course?.title || 'No course assigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${b.isActive ? 'bg-green-400/30 text-green-100' : 'bg-gray-400/30 text-gray-200'}`}>
                          {b.isActive ? 'Active' : 'Ended'}
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

                    {b.trainer && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-[9px]">
                          {b.trainer.name[0]}
                        </div>
                        <span className="truncate">{b.trainer.name}</span>
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

      {/* Create / Edit Batch Panel */}
      {canManageBatch && (
        <SlidePanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          title={editingBatch ? 'Edit Batch' : 'Create Batch'}
          subtitle={editingBatch ? 'Update batch details and schedule' : 'Set up a new training batch'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Batch Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Python Batch Jan 2026"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                required
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course *</label>
              <select
                value={form.courseId}
                onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
                required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
              >
                <option value="">Select course</option>
                {courses.filter(c => c.status === 'PUBLISHED').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}{c.duration ? ` — ${c.duration}` : ''}
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected course duration: <span className="font-semibold text-purple-600">{selectedCourse.duration}</span>
                </p>
              )}
            </div>

            {/* Assign Lead Trainer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Assign Lead Trainer (Optional)</label>
              <select
                value={form.trainerId}
                onChange={e => setForm(f => ({ ...f, trainerId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
              >
                <option value="">Select trainer (optional)</option>
                {trainers.filter(t => t.active !== false).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.designation ? ` (${t.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Clean Start & End Time Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  placeholder="e.g. 12:00 PM"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
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
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                <input
                  type="date"
                  min={form.startDate || undefined}
                  max={maxEndDateStr}
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                  className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 ${batchDateError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'} text-gray-800 dark:text-gray-200`}
                />
              </div>
            </div>
            {selectedCourse && form.startDate && maxEndDate && (
              <p className="text-xs text-gray-500">
                Max allowed end date for <span className="font-semibold">{selectedCourse.duration}</span> from {format(new Date(form.startDate), 'dd MMM yyyy')} is <span className="font-semibold text-purple-600">{format(maxEndDate, 'dd MMM yyyy')}</span>
              </p>
            )}
            {batchDateError && (
              <p className="text-xs text-red-500 font-medium">{batchDateError}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                <select
                  value={form.mode}
                  onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Students</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.maxStudents}
                  onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))}
                  placeholder="e.g. 30"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all shadow-md shadow-purple-500/20"
              >
                {saving ? (editingBatch ? 'Saving...' : 'Creating...') : (editingBatch ? 'Save Changes' : 'Create Batch')}
              </button>
            </div>
          </form>
        </SlidePanel>
      )}

      {/* Delete Batch Confirmation Modal */}
      {showDeleteModal && deletingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Delete Batch</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deletingBatch.name}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeletingBatch(null); }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all shadow-md shadow-red-500/20 disabled:opacity-60"
              >
                {saving ? 'Deleting...' : 'Delete Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
