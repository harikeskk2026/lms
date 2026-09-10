'use client'
import { useState, useEffect } from 'react'
import {
  Video, Plus, Copy, ExternalLink, Calendar, Clock, Users,
  CheckCircle, PlayCircle, XCircle, Edit3, Trash2, Search, Filter, Shield, RefreshCw, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import DateTimePicker from '@/components/ui/DateTimePicker'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import SlidePanel from '@/components/admin/SlidePanel'

const PLATFORMS = ['ZOOM']
const STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']

// Display status badge styles (derived on the fly from timing)
const DISPLAY_STATUS_BADGE = {
  UPCOMING:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  ONGOING:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 animate-pulse',
  COMPLETED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
}

// Get the current local date-time as an ISO string "YYYY-MM-DDTHH:MM:SS"
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

// Normalise a scheduledStart/scheduledEnd value to a comparable ISO string.
// Handles: string "2026-09-10T12:00:00", array [2026,9,10,12,0], or null.
const toISOStr = (val) => {
  if (!val) return null
  if (Array.isArray(val)) {
    const [yr, mo, dy, hr = 0, mn = 0, sc = 0] = val
    const pad = (n) => String(n).padStart(2, '0')
    return `${yr}-${pad(mo)}-${pad(dy)}T${pad(hr)}:${pad(mn)}:${pad(sc)}`
  }
  const s = String(val).replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '').replace(' ', 'T')
  return s.slice(0, 19)
}

const getDisplayStatus = (m) => {
  if (m.status === 'CANCELLED') return 'CANCELLED'

  const startISO = toISOStr(m.scheduledStart)
  if (!startISO) {
    return m.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING'
  }

  const endISO = toISOStr(m.scheduledEnd)
  const nowISO = getLocalISONow()

  const todayDate = nowISO.slice(0, 10)
  const currentTime = nowISO.slice(11, 19)

  const startDate = startISO.slice(0, 10)
  const startTime = (startISO.slice(11, 19) || '00:00:00').padEnd(8, ':00')

  const endDate = endISO ? endISO.slice(0, 10) : startDate
  let endTime = endISO ? (endISO.slice(11, 19) || '23:59:59').padEnd(8, ':00') : null

  if (!endTime) {
    const [sh = '10', sm = '00', ss = '00'] = startTime.split(':')
    const endH = String((parseInt(sh, 10) + 1) % 24).padStart(2, '0')
    endTime = `${endH}:${sm}:${ss}`
  }

  if (todayDate < startDate) {
    return 'UPCOMING'
  }
  if (todayDate > endDate) {
    return 'COMPLETED'
  }

  // Today is within [startDate, endDate]
  if (currentTime < startTime) {
    return 'UPCOMING'
  }
  if (currentTime >= startTime && currentTime <= endTime) {
    return 'ONGOING'
  }
  return 'COMPLETED'
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
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCourse, setFilterCourse] = useState('')
  const [filterBatch, setFilterBatch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deletingMeeting, setDeletingMeeting] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [attendeesMeeting, setAttendeesMeeting] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  const extractList = (r) => {
    if (Array.isArray(r)) return r
    if (Array.isArray(r?.data)) return r.data
    if (Array.isArray(r?.data?.data)) return r.data.data
    if (Array.isArray(r?.content)) return r.content
    if (Array.isArray(r?.data?.content)) return r.data.content
    return []
  }

  const getBatchCourseId = (b) => b?.course?.id ?? b?.courseId ?? ''
  const getBatchCourseTitle = (b) => b?.course?.title ?? b?.courseName ?? b?.courseTitle ?? ''

  const loadMeetings = async () => {
    setLoading(true)
    try {
      const mRes = await adminApi.getMeetings({ batchId: filterBatch || undefined, status: filterStatus || undefined })
      const mList = extractList(mRes?.data) || extractList(mRes) || []
      setMeetings(mList)
    } catch {
      toast.error('Failed to load scheduled classes')
    } finally {
      setLoading(false)
    }
  }

  const loadBatchesAndCourses = async () => {
    try {
      const [bRes, cRes, tRes] = await Promise.allSettled([
        batchService.list(),
        courseService.list(),
        adminApi.getTrainers()
      ])
      if (bRes.status === 'fulfilled') {
        setBatches(extractList(bRes.value))
      }
      if (cRes.status === 'fulfilled') {
        setCourses(extractList(cRes.value))
      }
      if (tRes.status === 'fulfilled') {
        setTrainers(extractList(tRes.value))
      }
    } catch {
      // ignore
    }
  }

  const loadData = () => {
    loadBatchesAndCourses()
    loadMeetings()
  }

  useEffect(() => {
    loadBatchesAndCourses()
  }, [])

  useEffect(() => {
    loadMeetings()
    const interval = setInterval(() => {
      adminApi.getMeetings({ batchId: filterBatch || undefined, status: filterStatus || undefined })
        .then(mRes => {
          const mList = extractList(mRes?.data) || extractList(mRes) || []
          setMeetings(mList)
        })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [filterBatch, filterStatus])

  const isOnlineOrHybridBatch = (b) => {
    if (!b) return false
    const mode = String(b.mode || 'ONLINE').toUpperCase()
    return mode === 'ONLINE' || mode === 'HYBRID'
  }

  const onlineAndHybridBatches = batches.filter(isOnlineOrHybridBatch)

  const batchOptionsForForm = form.courseId
    ? onlineAndHybridBatches.filter(b => String(getBatchCourseId(b)) === String(form.courseId))
    : onlineAndHybridBatches

  const openCreate = () => {
    setErrors({})
    setEditingId(null)
    setForm(emptyForm)
    setPanelOpen(true)
  }

  const openEdit = (m) => {
    setErrors({})
    setEditingId(m.id)
    const matchingBatch = batches.find(b => String(b.id) === String(m.batchId))
    const courseId = m.courseId
      ? String(m.courseId)
      : matchingBatch
      ? String(getBatchCourseId(matchingBatch))
      : ''
    setForm({
      title: m.title || '',
      description: m.description || '',
      meetUrl: m.meetUrl || '',
      platform: m.platform || 'ZOOM',
      batchId: m.batchId ? String(m.batchId) : '',
      courseId: courseId,
      hostName: m.hostName || '',
      scheduledStart: toISOStr(m.scheduledStart)?.slice(0, 16) || '',
      scheduledEnd: toISOStr(m.scheduledEnd)?.slice(0, 16) || '',
      passcode: m.passcode || '',
    })
    setPanelOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    const newErrors = {}

    if (!form.title?.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!form.meetUrl?.trim()) {
      newErrors.meetUrl = 'Meeting URL is required'
    } else {
      const urlStr = form.meetUrl.trim()
      const urlPattern = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(:[0-9]+)?(\/.*)?$/i
      if (!urlPattern.test(urlStr)) {
        newErrors.meetUrl = 'Please enter a valid meeting URL (e.g. https://zoom.us/j/...)'
      }
    }

    if (!form.scheduledStart) {
      newErrors.scheduledStart = 'Scheduled start date and time is required'
    }

    if (form.scheduledEnd && form.scheduledStart) {
      if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
        newErrors.scheduledEnd = 'End time must be after Start time'
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix all highlighted required fields', { id: 'save-meeting-toast' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        meetUrl: form.meetUrl.trim(),
        platform: form.platform,
        batchId: form.batchId ? Number(form.batchId) : null,
        courseId: form.courseId ? Number(form.courseId) : null,
        hostName: form.hostName?.trim() || null,
        scheduledStart: form.scheduledStart,
        scheduledEnd: form.scheduledEnd || null,
        passcode: form.passcode?.trim() || null,
      }

      if (editingId) {
        await adminApi.updateMeeting(editingId, payload)
        toast.success('Scheduled class updated successfully', { id: 'save-meeting-toast' })
      } else {
        await adminApi.createMeeting(payload)
        toast.success('Scheduled class created successfully', { id: 'save-meeting-toast' })
      }
      setPanelOpen(false)
      loadData()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0] || 'Failed to save scheduled class'
      toast.error(msg, { id: 'save-meeting-toast' })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await adminApi.updateMeetingStatus(id, status)
      toast.success(`Meeting status updated to ${status}`, { id: 'status-change-toast' })
      loadData()
    } catch {
      toast.error('Failed to update meeting status', { id: 'status-change-toast' })
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
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete meeting')
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
    if (filterCourse) {
      const matchesCourse = String(m.courseId) === String(filterCourse) || (m.batchId && batches.some(b => String(b.id) === String(m.batchId) && String(getBatchCourseId(b)) === String(filterCourse)))
      if (!matchesCourse) return false
    }
    if (filterBatch && String(m.batchId) !== String(filterBatch)) return false
    if (filterStatus && m.status !== filterStatus) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.title?.toLowerCase().includes(q) ||
      m.hostName?.toLowerCase().includes(q) ||
      m.batchName?.toLowerCase().includes(q) ||
      m.courseTitle?.toLowerCase().includes(q) ||
      m.meetUrl?.toLowerCase().includes(q)
    )
  })

  const filterBatchesList = filterCourse
    ? onlineAndHybridBatches.filter(b => String(getBatchCourseId(b)) === String(filterCourse))
    : onlineAndHybridBatches

  const statusOrder = (m) => {
    const s = getDisplayStatus(m)
    if (s === 'ONGOING') return 0
    if (s === 'UPCOMING') return 1
    if (s === 'COMPLETED') return 2
    return 3
  }

  const sortedMeetings = [...filteredMeetings].sort((a, b) => statusOrder(a) - statusOrder(b))

  const ongoingCount  = meetings.filter(m => getDisplayStatus(m) === 'ONGOING').length
  const upcomingCount = meetings.filter(m => getDisplayStatus(m) === 'UPCOMING').length

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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ongoing</p>
            <p className="text-xl font-bold text-emerald-600">{ongoingCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming</p>
            <p className="text-xl font-bold text-blue-600">{upcomingCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
              {meetings.filter(m => getDisplayStatus(m) === 'COMPLETED').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
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
            value={filterCourse}
            onChange={e => { setFilterCourse(e.target.value); setFilterBatch('') }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            value={filterBatch}
            onChange={e => setFilterBatch(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Batches</option>
            {filterBatchesList.map(b => (
              <option key={b.id} value={b.id}>
                {b.name || b.title} {b.mode ? `· ${b.mode}` : ''}
              </option>
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
      ) : sortedMeetings.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <Video size={40} className="mx-auto mb-3 text-purple-300 dark:text-purple-800" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">No scheduled classes found</p>
          <p className="text-xs text-gray-400 mt-1">Schedule a class for a course and batch to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedMeetings.map(m => (
            <div key={m.id} className="glass-card p-5 flex flex-col justify-between gap-4 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-gray-900 dark:text-white leading-tight">
                    {m.title}
                  </h3>
                  {(() => {
                    const ds = getDisplayStatus(m)
                    return (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${DISPLAY_STATUS_BADGE[ds] || DISPLAY_STATUS_BADGE.UPCOMING}`}>
                        {ds}
                      </span>
                    )
                  })()}
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
                    <span>
                      {(() => {
                        const startISO = toISOStr(m.scheduledStart)
                        const endISO = toISOStr(m.scheduledEnd)
                        if (!startISO) return 'TBD'
                        const sp = startISO.split(/[T:-]/).map(Number)
                        const startDateObj = new Date(sp[0], sp[1]-1, sp[2], sp[3]||0, sp[4]||0, sp[5]||0)
                        const startFormatted = format(startDateObj, 'dd MMM yyyy, hh:mm a')
                        if (!endISO) return startFormatted

                        const ep = endISO.split(/[T:-]/).map(Number)
                        const endDateObj = new Date(ep[0], ep[1]-1, ep[2], ep[3]||0, ep[4]||0, ep[5]||0)

                        const startDateStr = startISO.slice(0, 10)
                        const endDateStr = endISO.slice(0, 10)
                        if (startDateStr !== endDateStr) {
                          return `${format(startDateObj, 'dd MMM yyyy')} – ${format(endDateObj, 'dd MMM yyyy')} · ${format(startDateObj, 'hh:mm a')} – ${format(endDateObj, 'hh:mm a')}`
                        }
                        return `${startFormatted} – ${format(endDateObj, 'hh:mm a')}`
                      })()}
                    </span>
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

                {/* Status Action Buttons */}
                <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {m.status !== 'LIVE' && m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleStatusChange(m.id, 'LIVE')}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Go Live
                      </button>
                    )}
                    {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleStatusChange(m.id, 'COMPLETED')}
                        className="text-gray-600 dark:text-gray-300 hover:underline"
                      >
                        Mark Completed
                      </button>
                    )}
                    {m.status !== 'CANCELLED' && m.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleStatusChange(m.id, 'CANCELLED')}
                        className="text-red-500 dark:text-red-400 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openAttendees(m)} title="Who joined" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                      <Users size={13} />
                    </button>
                    <button onClick={() => openEdit(m)} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
                      <Edit3 size={13} />
                    </button>
                    {getDisplayStatus(m) !== 'ONGOING' && (
                      <button onClick={() => setDeletingMeeting(m)} title="Delete Class" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule / Edit Class SlidePanel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? 'Edit Scheduled Class' : 'Schedule Class'}
        subtitle={editingId ? 'Update meeting details, date/time or batch targeting' : 'Publish a new live class meeting link'}
        width="w-full max-w-lg md:max-w-xl"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs animate-in fade-in duration-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold">Please fill in all mandatory fields</p>
                <p className="text-[11px] text-red-500/90 mt-0.5">
                  All mandatory fields highlighted in red below are required before scheduling.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. React & Next.js Live Class"
              value={form.title}
              onChange={e => {
                setForm(f => ({ ...f, title: e.target.value }))
                if (errors.title) setErrors(err => ({ ...err, title: undefined }))
              }}
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none transition-colors ${
                errors.title
                  ? 'border-red-500 dark:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Course
              </label>
              <select
                value={form.courseId}
                onChange={e => {
                  const courseId = e.target.value
                  setForm(f => {
                    const stillValid = f.batchId && batches.some(b => String(b.id) === String(f.batchId) && String(getBatchCourseId(b)) === String(courseId))
                    return { ...f, courseId, batchId: stillValid ? f.batchId : '' }
                  })
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title || c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Target Batch
              </label>
              <select
                value={form.batchId}
                onChange={e => {
                  const batchId = e.target.value
                  if (batchId) {
                    const selectedBatch = batches.find(b => String(b.id) === String(batchId))
                    const bCourseId = getBatchCourseId(selectedBatch)
                    const batchTrainer = selectedBatch?.trainer?.name || selectedBatch?.trainerName
                    setForm(f => ({
                      ...f,
                      batchId,
                      ...(bCourseId && !f.courseId ? { courseId: String(bCourseId) } : {}),
                      ...(batchTrainer && !f.hostName ? { hostName: batchTrainer } : {})
                    }))
                    return
                  }
                  setForm(f => ({ ...f, batchId }))
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">
                  {form.courseId ? 'Select Batch (or all batches in course)' : 'Select Batch'}
                </option>
                {batchOptionsForForm.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.title} {b.mode ? `· ${b.mode}` : ''} {!form.courseId && getBatchCourseTitle(b) ? `(${getBatchCourseTitle(b)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Meeting URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="https://zoom.us/j/123456789"
              value={form.meetUrl}
              onChange={e => {
                setForm(f => ({ ...f, meetUrl: e.target.value }))
                if (errors.meetUrl) setErrors(err => ({ ...err, meetUrl: undefined }))
              }}
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none transition-colors ${
                errors.meetUrl
                  ? 'border-red-500 dark:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500'
              }`}
            />
            {errors.meetUrl && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.meetUrl}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Trainer / Host Name
              </label>
              {trainers.length > 0 && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  Select or type custom
                </span>
              )}
            </div>

            {trainers.length > 0 && (
              <select
                value={trainers.some(t => (t.name || t.fullName) === form.hostName) ? form.hostName : ''}
                onChange={e => {
                  if (e.target.value) {
                    setForm(f => ({ ...f, hostName: e.target.value }))
                  }
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 mb-2"
              >
                <option value="">-- Select Registered Trainer --</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.name || t.fullName}>
                    {t.name || t.fullName} {t.email ? `(${t.email})` : ''}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="e.g. David Kumar or John Mathew"
              value={form.hostName}
              onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Scheduled Start <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                value={form.scheduledStart}
                hasError={Boolean(errors.scheduledStart)}
                onChange={val => {
                  setForm(f => ({ ...f, scheduledStart: val }))
                  if (errors.scheduledStart) setErrors(err => ({ ...err, scheduledStart: undefined }))
                }}
              />
              {errors.scheduledStart && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.scheduledStart}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Scheduled End (Optional)
              </label>
              <DateTimePicker
                value={form.scheduledEnd}
                hasError={Boolean(errors.scheduledEnd)}
                onChange={val => {
                  setForm(f => ({ ...f, scheduledEnd: val }))
                  if (errors.scheduledEnd) setErrors(err => ({ ...err, scheduledEnd: undefined }))
                }}
              />
              {errors.scheduledEnd && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.scheduledEnd}</p>
              )}
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
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                editingId ? 'Save Changes' : 'Schedule Class'
              )}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Attendees Panel */}
      <SlidePanel
        open={Boolean(attendeesMeeting)}
        onClose={() => setAttendeesMeeting(null)}
        title="Who Joined"
        subtitle={attendeesMeeting?.title}
        width="w-full max-w-md"
      >
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
      </SlidePanel>

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
