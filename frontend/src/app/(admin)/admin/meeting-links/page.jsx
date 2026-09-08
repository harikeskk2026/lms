'use client'
import { useState, useEffect } from 'react'
import {
  Video, Plus, Copy, ExternalLink, Calendar, Clock, Users,
  CheckCircle, PlayCircle, XCircle, Edit3, Trash2, Search, Filter, Shield, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import DateTimePicker12h from '@/components/ui/DateTimePicker12h'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

const PLATFORMS = ['ZOOM', 'CUSTOM']
const STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']

const STATUS_BADGE = {
  SCHEDULED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  LIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 animate-pulse',
  COMPLETED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
}

const emptyForm = {
  title: '',
  description: '',
  meetUrl: '',
  platform: 'ZOOM',
  batchId: '',
  courseId: '',
  hostName: '',
  scheduledStart: '',
  scheduledEnd: '',
  passcode: '',
}

export default function AdminMeetingLinksPage() {
  const [meetings, setMeetings] = useState([])
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBatch, setFilterBatch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [deletingMeeting, setDeletingMeeting] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [attendeesMeeting, setAttendeesMeeting] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, bRes, cRes] = await Promise.all([
        adminApi.getMeetings({ batchId: filterBatch || undefined, status: filterStatus || undefined }),
        adminApi.getBatches(),
        courseService.list().catch(() => ({ data: [] })),
      ])
      setMeetings(mRes.data?.data || [])
      setBatches(bRes.data?.data || [])
      setCourses(cRes.data || [])
    } catch {
      toast.error('Failed to load scheduled classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterBatch, filterStatus])

  const batchOptionsForForm = form.courseId
    ? batches.filter(b => String(b.course?.id) === String(form.courseId))
    : batches

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setPanelOpen(true)
  }

  const openEdit = (m) => {
    setEditingId(m.id)
    setForm({
      title: m.title || '',
      description: m.description || '',
      meetUrl: m.meetUrl || '',
      platform: m.platform || 'ZOOM',
      batchId: m.batchId || '',
      courseId: m.courseId || '',
      hostName: m.hostName || '',
      scheduledStart: m.scheduledStart ? m.scheduledStart.slice(0, 16) : '',
      scheduledEnd: m.scheduledEnd ? m.scheduledEnd.slice(0, 16) : '',
      passcode: m.passcode || '',
    })
    setPanelOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.meetUrl || !form.scheduledStart) {
      toast.error('Please fill required fields (Title, Meeting URL, Start Time)')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        meetUrl: form.meetUrl,
        platform: form.platform,
        batchId: form.batchId ? Number(form.batchId) : null,
        courseId: form.courseId ? Number(form.courseId) : null,
        hostName: form.hostName || null,
        scheduledStart: form.scheduledStart,
        scheduledEnd: form.scheduledEnd || null,
        passcode: form.passcode || null,
      }

      if (editingId) {
        await adminApi.updateMeeting(editingId, payload)
        toast.success('Scheduled class updated successfully')
      } else {
        await adminApi.createMeeting(payload)
        toast.success('Scheduled class created successfully')
      }
      setPanelOpen(false)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save scheduled class')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await adminApi.updateMeetingStatus(id, status)
      toast.success(`Meeting status updated to ${status}`)
      loadData()
    } catch {
      toast.error('Failed to update meeting status')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingMeeting) return
    setIsDeleting(true)
    try {
      await adminApi.deleteMeeting(deletingMeeting.id)
      toast.success('Meeting deleted')
      setDeletingMeeting(null)
      loadData()
    } catch {
      toast.error('Failed to delete meeting')
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
    toast.success('Meeting link copied to clipboard!')
  }

  const openAttendees = async (m) => {
    setAttendeesMeeting(m)
    setLoadingAttendees(true)
    try {
      const res = await adminApi.getMeetingAttendees(m.id)
      setAttendees(res.data?.data || [])
    } catch {
      toast.error('Failed to load attendees')
      setAttendees([])
    } finally {
      setLoadingAttendees(false)
    }
  }

  const filteredMeetings = meetings.filter(m => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.title?.toLowerCase().includes(q) ||
      m.hostName?.toLowerCase().includes(q) ||
      m.batchName?.toLowerCase().includes(q) ||
      m.meetUrl?.toLowerCase().includes(q)
    )
  })

  const liveCount = meetings.filter(m => m.status === 'LIVE').length
  const scheduledCount = meetings.filter(m => m.status === 'SCHEDULED').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Video className="text-purple-600 dark:text-purple-400" size={26} />
            Scheduled Class
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Pick a course and batch, paste your Zoom (or other) meeting link, and publish it for the class.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md"
        >
          <Plus size={16} /> Schedule Class
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
            <Video size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Meetings</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{meetings.length}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
            <PlayCircle size={20} className="animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Now</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{liveCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{scheduledCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
              {meetings.filter(m => m.status === 'COMPLETED').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, host, batch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={filterBatch}
            onChange={e => setFilterBatch(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          onClick={loadData}
          title="Refresh List"
          className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List / Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 glass-card animate-pulse" />
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <Video size={40} className="mx-auto mb-3 text-purple-300 dark:text-purple-800" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">No scheduled classes found</p>
          <p className="text-xs text-gray-400 mt-1">Schedule a class for a course and batch to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMeetings.map(m => (
            <div key={m.id} className="glass-card p-5 flex flex-col justify-between gap-4 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-gray-900 dark:text-white leading-tight">
                    {m.title}
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[m.status] || STATUS_BADGE.SCHEDULED}`}>
                    {m.status}
                  </span>
                </div>

                {m.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{m.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-md">
                    {m.platform || 'ZOOM'}
                  </span>
                  {m.courseTitle && (
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                      {m.courseTitle}
                    </span>
                  )}
                  {m.batchName ? (
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users size={11} /> {m.batchName}
                    </span>
                  ) : (
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium px-2 py-0.5 rounded-md">
                      All Batches
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-purple-500" />
                    <span>{m.scheduledStart ? format(new Date(m.scheduledStart), 'dd MMM yyyy, hh:mm a') : 'TBD'}</span>
                  </div>
                  {m.hostName && (
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} className="text-indigo-500" />
                      <span>Host: {m.hostName}</span>
                    </div>
                  )}
                  {m.passcode && (
                    <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                      Passcode: {m.passcode}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <a
                    href={m.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <ExternalLink size={13} /> Join Meeting
                  </a>
                  <button
                    onClick={() => copyToClipboard(m.meetUrl)}
                    title="Copy Meeting URL"
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {/* Status Switcher Quick Buttons */}
                <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                  <div className="flex gap-1">
                    {m.status !== 'LIVE' && (
                      <button
                        onClick={() => handleStatusChange(m.id, 'LIVE')}
                        className="text-emerald-600 hover:underline"
                      >
                        Go Live
                      </button>
                    )}
                    {m.status === 'LIVE' && (
                      <button
                        onClick={() => handleStatusChange(m.id, 'COMPLETED')}
                        className="text-gray-600 hover:underline"
                      >
                        Mark Completed
                      </button>
                    )}
                    {m.status !== 'CANCELLED' && m.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleStatusChange(m.id, 'CANCELLED')}
                        className="text-red-500 hover:underline ml-1"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openAttendees(m)} title="Who joined" className="text-indigo-600 hover:text-indigo-800">
                      <Users size={13} />
                    </button>
                    <button onClick={() => openEdit(m)} className="text-purple-600 hover:text-purple-800">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => setDeletingMeeting(m)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide / Modal Form Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-y-auto p-6 shadow-2xl space-y-5 animate-slideIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">
                {editingId ? 'Edit Scheduled Class' : 'Schedule Class'}
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React & Next.js Live Class"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Platform *
                </label>
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ZOOM">Zoom</option>
                  <option value="CUSTOM">Custom Meeting URL</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Course
                  </label>
                  <select
                    value={form.courseId}
                    onChange={e => {
                      const courseId = e.target.value
                      setForm(f => {
                        const stillValid = f.batchId && batches.some(b => String(b.id) === String(f.batchId) && String(b.course?.id) === String(courseId))
                        return { ...f, courseId, batchId: stillValid ? f.batchId : '' }
                      })
                    }}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Courses</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Target Batch
                  </label>
                  <select
                    value={form.batchId}
                    onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Batches</option>
                    {batchOptionsForForm.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Meeting URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/123456789 or custom URL"
                  value={form.meetUrl}
                  onChange={e => setForm(f => ({ ...f, meetUrl: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Host Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Arjun"
                  value={form.hostName}
                  onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Scheduled Start *
                  </label>
                  <DateTimePicker12h
                    required
                    value={form.scheduledStart}
                    onChange={val => setForm(f => ({ ...f, scheduledStart: val }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Scheduled End (Optional)
                  </label>
                  <DateTimePicker12h
                    value={form.scheduledEnd}
                    onChange={val => setForm(f => ({ ...f, scheduledEnd: val }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Passcode (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456"
                  value={form.passcode}
                  onChange={e => setForm(f => ({ ...f, passcode: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Description / Agenda
                </label>
                <textarea
                  rows={3}
                  placeholder="Topics to be covered in this live session..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees Panel */}
      {attendeesMeeting && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-y-auto p-6 shadow-2xl space-y-4 animate-slideIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">Who Joined</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{attendeesMeeting.title}</p>
              </div>
              <button
                onClick={() => setAttendeesMeeting(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {loadingAttendees ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : attendees.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Users size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm">No one has joined yet</p>
                <p className="text-xs text-gray-400 mt-1">This fills in as students click "Join Meeting" on their side.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{attendees.length} student{attendees.length === 1 ? '' : 's'} joined</p>
                {attendees.map(a => (
                  <div key={a.studentUserId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{a.name}</p>
                      {a.email && <p className="text-xs text-gray-400 truncate">{a.email}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(a.firstJoinedAt), 'dd MMM, hh:mm a')}</p>
                      {a.joinCount > 1 && (
                        <p className="text-[10px] text-gray-400">Joined {a.joinCount}×</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deletingMeeting)}
        onClose={() => setDeletingMeeting(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Scheduled Class?"
        itemName={deletingMeeting?.title}
        loading={isDeleting}
      />
    </div>
  )
}
