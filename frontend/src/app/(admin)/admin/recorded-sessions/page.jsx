'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Upload, Eye, BarChart3, Trash2, Archive, CheckCircle, Shield, Ban, Video, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import recordedSessionService from '@/services/recordedSessionService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'
import DateTimePicker from '@/components/ui/DateTimePicker'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { useConfirmModal } from '@/components/ui/ConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import SearchInput from '@/components/ui/SearchInput'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import Pagination from '@/components/ui/Pagination'

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PROCESSING: 'bg-blue-100 text-blue-700',
  READY: 'bg-teal-100 text-teal-700',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  LIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  ARCHIVED: 'bg-gray-200 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
}

const EMPTY_FORM = {
  courseId: '', batchId: '', instructorName: '', title: '', description: '',
  thumbnailUrl: '', tags: '', sessionDate: '', availableFrom: '', availableUntil: '',
}

export default function RecordedSessionsPage() {
  const [ask, confirmModal] = useConfirmModal()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [uploadTarget, setUploadTarget] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyticsTarget, setAnalyticsTarget] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [securityTarget, setSecurityTarget] = useState(null)
  const [securityTab, setSecurityTab] = useState('sessions')
  const [playbackSessions, setPlaybackSessions] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [blockedStudents, setBlockedStudents] = useState([])
  const [securityLoading, setSecurityLoading] = useState(false)
  const [deletingSession, setDeletingSession] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)
  const [statusFilter, setStatusFilter] = useState('')
  const abortRef = useRef(null)

  const isValidUrl = (url) => {
    if (!url || !url.trim()) return true
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const getSessionFieldError = (field, val) => {
    if (field === 'title') {
      if (!val || !val.trim()) return 'Title is required'
    }
    if (field === 'courseId') {
      if (!val) return 'Course is required'
    }
    if (field === 'thumbnailUrl') {
      if (val && !isValidUrl(val)) return 'Please enter a valid URL (http:// or https://)'
    }
    if (field === 'availableUntil') {
      if (form.availableFrom && val && new Date(form.availableFrom) >= new Date(val)) {
        return 'Available until must be after available from'
      }
    }
    return null
  }

  const isSessionValid = Boolean(
    form.title?.trim() &&
    form.courseId &&
    isValidUrl(form.thumbnailUrl) &&
    (!form.availableFrom || !form.availableUntil || new Date(form.availableFrom) < new Date(form.availableUntil))
  )

  const isSessionFormDirty = Boolean(
    form.title || form.description || form.courseId || form.batchId ||
    form.instructorName || form.thumbnailUrl || form.tags || form.sessionDate ||
    form.availableFrom || form.availableUntil
  )

  const fetchSessions = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await recordedSessionService.listSessions(
        { search: search.trim() || undefined, status: statusFilter || undefined, page, limit: pageSize },
        { signal: controller.signal }
      )
      const data = res.data || {}
      setSessions(data.sessions || [])
      setTotal(data.totalElements ?? 0)
      setTotalPages(data.totalPages ?? 1)
      if (data.totalPages && page > data.totalPages) {
        setPage(Math.max(1, data.totalPages))
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return
      toast.error(err.message || 'Failed to load recorded sessions')
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [search, statusFilter, page, pageSize])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    Promise.all([
      courseService.list(),
      batchService.list(),
    ]).then(([cRes, bRes]) => {
      setCourses(cRes.data || [])
      setBatches(bRes.data || [])
    }).catch(() => {})
  }, [])

  // Poll processing status for any session stuck in PROCESSING. Runs silently
  // (no toast per tick), re-polls only the current page + active filters, and
  // stops on the first failure or when nothing on the current page is still
  // PROCESSING - a stale token would otherwise toast "authorization error"
  // repeatedly until the tab is closed.
  useEffect(() => {
    const processing = sessions.filter(s => s.status === 'PROCESSING')
    if (processing.length === 0) return
    let active = true
    const timer = setInterval(async () => {
      try {
        const res = await recordedSessionService.listSessions(
          { search: search.trim() || undefined, status: statusFilter || undefined, page, limit: pageSize }
        )
        if (!active) return
        const data = res.data || {}
        setSessions(data.sessions || [])
        setTotal(data.totalElements ?? 0)
        setTotalPages(data.totalPages ?? 1)
      } catch {
        if (active) clearInterval(timer)
      }
    }, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [sessions, search, statusFilter, page, pageSize])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setTouched({})
    setEditingId(null)
    setPanelOpen(true)
  }

  const openEdit = (session) => {
    setForm({
      courseId: session.courseId, batchId: session.batchId || '', instructorName: session.instructorName || '',
      title: session.title, description: session.description || '', thumbnailUrl: session.thumbnailUrl || '',
      tags: session.tags || '', sessionDate: session.sessionDate || '',
      availableFrom: session.availableFrom || '', availableUntil: session.availableUntil || '',
    })
    setTouched({})
    setEditingId(session.id)
    setPanelOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, batchId: form.batchId || null, availableFrom: form.availableFrom || null, availableUntil: form.availableUntil || null }
      if (editingId) {
        await recordedSessionService.updateSession(editingId, payload)
        toast.success('Session updated')
      } else {
        await recordedSessionService.createSession(payload)
        toast.success('Session created — upload a video next')
      }
      setPanelOpen(false)
      fetchSessions()
    } catch (err) {
      toast.error(err.message || 'Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingSession) return
    setIsDeleting(true)
    try {
      await recordedSessionService.deleteSession(deletingSession.id)
      toast.success('Session deleted')
      setDeletingSession(null)
      fetchSessions()
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePublish = async (session) => {
    try {
      await recordedSessionService.publishSession(session.id)
      toast.success('Session published')
      fetchSessions()
    } catch (err) { toast.error(err.message || 'Failed to publish') }
  }

  const handleArchive = async (session) => {
    try {
      await recordedSessionService.archiveSession(session.id)
      toast.success('Session archived')
      fetchSessions()
    } catch (err) { toast.error(err.message || 'Failed to archive') }
  }

  const MAX_FILE_SIZE_BYTES = 400 * 1024 * 1024 // 400MB

  const handleUpload = async () => {
    if (!uploadFile || !uploadTarget) return
    if (uploadFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File size exceeds the maximum allowed limit of 400MB')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      await recordedSessionService.uploadVideo(uploadTarget.id, uploadFile, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
      })
      toast.success('Upload complete — processing in the background')
      setUploadTarget(null)
      setUploadFile(null)
      fetchSessions()
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const openAnalytics = async (session) => {
    setAnalyticsTarget(session)
    try {
      const res = await recordedSessionService.getAnalytics(session.id)
      setAnalytics(res.data)
    } catch { toast.error('Failed to load analytics') }
  }

  const loadSecurity = (sessionId) => {
    setSecurityLoading(true)
    Promise.all([
      recordedSessionService.getPlaybackSessions(sessionId),
      recordedSessionService.getAuditLog(sessionId),
      recordedSessionService.getBlockedStudents(sessionId),
    ])
      .then(([sessionsRes, auditRes, blockedRes]) => {
        setPlaybackSessions(sessionsRes.data || [])
        setAuditLog(auditRes.data || [])
        setBlockedStudents(blockedRes.data || [])
      })
      .catch(() => toast.error('Failed to load security data'))
      .finally(() => setSecurityLoading(false))
  }

  const openSecurity = (session) => {
    setSecurityTarget(session)
    setSecurityTab('sessions')
    loadSecurity(session.id)
  }

  const handleRevokeSession = async (playbackSessionId) => {
    try {
      await recordedSessionService.revokePlaybackSession(playbackSessionId)
      toast.success('Session revoked')
      loadSecurity(securityTarget.id)
    } catch (err) { toast.error(err.message || 'Failed to revoke session') }
  }

  const handleRevokeAllForStudent = async (studentId) => {
    const ok = await ask({
      title: 'Revoke All Playback Sessions?',
      message: 'Revoke every active playback session for this student, across all recorded sessions?',
      confirmLabel: 'Revoke All',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await recordedSessionService.revokeAllSessionsForStudent(studentId)
      toast.success('All active sessions revoked for this student')
      loadSecurity(securityTarget.id)
    } catch (err) { toast.error(err.message || 'Failed to revoke sessions') }
  }

  const handleBlockStudent = async (studentId) => {
    const ok = await ask({
      title: 'Block Student from Recording?',
      message: 'Block this student from this recording? Their course enrollment is unaffected.',
      confirmLabel: 'Block Student',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await recordedSessionService.blockStudent(securityTarget.id, studentId)
      toast.success('Student blocked from this recording')
      loadSecurity(securityTarget.id)
    } catch (err) { toast.error(err.message || 'Failed to block student') }
  }

  const handleUnblockStudent = async (studentId) => {
    try {
      await recordedSessionService.unblockStudent(securityTarget.id, studentId)
      toast.success('Student unblocked')
      loadSecurity(securityTarget.id)
    } catch (err) { toast.error(err.message || 'Failed to unblock student') }
  }

  if (panelOpen) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {editingId ? 'Edit Session' : 'Create New Session'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {editingId ? 'Update session details, availability windows, and cohort mapping.' : 'Record and configure a lecture or webinar recording for student access.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </button>
        </div>

        <div className="space-y-6">
          {/* Section 1: Session Details */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">1</div>
              <span>Session Details</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onBlur={() => setTouched(t => ({ ...t, title: true }))}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Advanced Spring Boot Security Deep Dive"
                className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-colors focus:ring-2 ${
                  touched.title && getSessionFieldError('title', form.title)
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
              {touched.title && getSessionFieldError('title', form.title) && (
                <p className="text-xs text-red-500 mt-1">{getSessionFieldError('title', form.title)}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Key concepts discussed, timestamps, and prerequisite requirements..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
              />
            </div>
          </div>

          {/* Section 2: Course & Batch Mapping */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</div>
              <span>Course &amp; Cohort Mapping</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Course <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={form.courseId}
                  onChange={(val) => {
                    setForm(f => ({ ...f, courseId: val }))
                    setTouched(t => ({ ...t, courseId: true }))
                  }}
                  options={courses.map(c => ({ value: c.id, label: c.title }))}
                  placeholder="Select course"
                  searchable={courses.length >= 10}
                />
                {touched.courseId && !form.courseId && (
                  <p className="text-xs text-red-500 mt-1">Course is required</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Batch (optional)</label>
                <CustomSelect
                  value={form.batchId}
                  onChange={(val) => setForm(f => ({ ...f, batchId: val }))}
                  options={batches.filter(b => !form.courseId || String(b.course?.id) === String(form.courseId)).map(b => ({
                    value: b.id,
                    label: b.name
                  }))}
                  placeholder="All batches"
                  searchable={batches.length >= 10}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Instructor</label>
              <input
                value={form.instructorName}
                onChange={e => setForm(f => ({ ...f, instructorName: e.target.value }))}
                placeholder="e.g. John Doe"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Section 3: Schedule & Availability */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
              <span>Schedule &amp; Availability</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Session Date</label>
                <input
                  type="date"
                  value={form.sessionDate}
                  onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Thumbnail URL</label>
                <input
                  value={form.thumbnailUrl}
                  onBlur={() => setTouched(t => ({ ...t, thumbnailUrl: true }))}
                  onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
                  placeholder="https://..."
                  className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-colors focus:ring-2 ${
                    touched.thumbnailUrl && getSessionFieldError('thumbnailUrl', form.thumbnailUrl)
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                  }`}
                />
                {touched.thumbnailUrl && getSessionFieldError('thumbnailUrl', form.thumbnailUrl) && (
                  <p className="text-xs text-red-500 mt-1">{getSessionFieldError('thumbnailUrl', form.thumbnailUrl)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Available From</label>
                <DateTimePicker
                  value={form.availableFrom}
                  onChange={val => setForm(f => ({ ...f, availableFrom: val }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Available Until</label>
                <DateTimePicker
                  value={form.availableUntil}
                  onChange={val => setForm(f => ({ ...f, availableUntil: val }))}
                />
                {form.availableFrom && form.availableUntil && new Date(form.availableFrom) >= new Date(form.availableUntil) && (
                  <p className="text-xs text-red-500 mt-1">Available until must be after available from</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tags (comma-separated)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. spring-boot, security, rest-api"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
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
              type="button"
              onClick={handleSave}
              disabled={saving || !isSessionValid}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingId ? 'Saving Changes...' : 'Creating Session...'}
                </>
              ) : (
                editingId ? 'Save Changes' : 'Create Session'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Recorded Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Private, encrypted video — never a public URL.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
          <Plus size={16} /> Create Session
        </button>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          value={searchInput}
          onChange={(v) => { setSearchInput(v); setPage(1) }}
          placeholder="Search by title or description..."
        />
        <CustomSelect
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setPage(1) }}
          options={Object.keys(STATUS_STYLES).map(s => ({ value: s, label: s }))}
          placeholder="All Statuses"
          compact
        />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100 dark:bg-purple-900/20 dark:border-purple-900/30">
                  {['Title', 'Course', 'Batch', 'Duration', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No recorded sessions yet</td></tr>
                ) : sessions.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50/20 dark:hover:bg-purple-900/10">
                    <td className="px-3 py-3 font-semibold text-gray-800 dark:text-white break-words">{s.title}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.courseName}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.batchId || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}m` : '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[s.effectiveStatus] || STATUS_STYLES.DRAFT}`}>
                        {s.effectiveStatus}
                      </span>
                      {s.status === 'FAILED' && s.processingError && (
                        <p className="text-[10px] text-red-500 mt-1 break-words" title={s.processingError}>{s.processingError}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">{s.sessionDate || '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center" title="Edit">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => setUploadTarget(s)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center" title="Upload video">
                          <Upload size={13} />
                        </button>
                        {(s.status === 'READY' || s.status === 'PUBLISHED') && (
                          <button onClick={() => handlePublish(s)} className="w-7 h-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center" title="Publish">
                            <CheckCircle size={13} />
                          </button>
                        )}
                        <button onClick={() => openAnalytics(s)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center" title="Analytics">
                          <BarChart3 size={13} />
                        </button>
                        <button onClick={() => openSecurity(s)} className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center" title="Security">
                          <Shield size={13} />
                        </button>
                        <button onClick={() => handleArchive(s)} className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center" title="Archive">
                          <Archive size={13} />
                        </button>
                        <button onClick={() => setDeletingSession(s)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          total={total}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
          label="sessions"
        />
      </div>



      {/* Upload panel */}
      <SlidePanel open={!!uploadTarget} onClose={() => { if (!uploading) { setUploadTarget(null); setUploadFile(null) } }} title="Upload Video" width="w-[420px]">
        {uploadTarget && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{uploadTarget.title}</p>
            <input type="file" accept="video/*" onChange={e => {
              const file = e.target.files?.[0] || null
              if (file && file.size > MAX_FILE_SIZE_BYTES) {
                toast.error('File size exceeds the maximum allowed limit of 400MB')
                e.target.value = ''
                setUploadFile(null)
                return
              }
              setUploadFile(file)
            }} disabled={uploading} className="w-full text-sm" />
            {uploading && (
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-purple-600 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload'}
            </button>
            <p className="text-[11px] text-gray-400">Max file size: 400MB. Stored privately in Google Drive & transcoded to encrypted HLS in background.</p>
          </div>
        )}
      </SlidePanel>

      {/* Analytics panel */}
      <SlidePanel open={!!analyticsTarget} onClose={() => { setAnalyticsTarget(null); setAnalytics(null) }} title="Session Analytics" width="w-[420px]">
        {analyticsTarget && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{analyticsTarget.title}</h3>
            {analytics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Assigned', val: analytics.totalAssigned },
                  { label: 'Started', val: analytics.uniqueStudentsStarted },
                  { label: 'Completed', val: analytics.completed },
                  { label: 'Completion Rate', val: `${analytics.completionRate}%` },
                  { label: 'Avg Watch Time', val: `${Math.round(analytics.averageWatchSeconds / 60)}m` },
                  { label: 'Currently Watching', val: analytics.currentlyWatching },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4 text-center">
                    <p className="text-xl font-extrabold text-purple-600 font-display">{s.val}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">Loading...</p>}
          </div>
        )}
      </SlidePanel>

      {/* Security dashboard panel */}
      <SlidePanel open={!!securityTarget} onClose={() => setSecurityTarget(null)} title="Security" width="w-[640px]">
        {securityTarget && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{securityTarget.title}</h3>
            <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800">
              {['sessions', 'audit', 'blocked'].map(tab => (
                <button key={tab} onClick={() => setSecurityTab(tab)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${securityTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}>
                  {tab === 'sessions' ? 'Playback Sessions' : tab === 'audit' ? 'Audit Log' : 'Blocked Students'}
                </button>
              ))}
            </div>

            {securityLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : securityTab === 'sessions' ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {playbackSessions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No playback sessions yet</p>
                ) : playbackSessions.map(ps => (
                  <div key={ps.id} className="glass-card p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800 dark:text-white">{ps.studentName || `User #${ps.studentId}`}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ps.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        ps.status === 'REVOKED' ? 'bg-red-100 text-red-700' :
                        ps.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>{ps.status}</span>
                    </div>
                    <p className="text-gray-500">{ps.studentEmail}</p>
                    <p className="text-gray-400">Device {ps.deviceId?.slice(0, 8)}… · {ps.completionPercentage}% watched · IP {ps.ipAddress || '—'}</p>
                    <p className="text-gray-400">Started {ps.startedAt ? new Date(ps.startedAt).toLocaleString() : '—'}</p>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {ps.status === 'ACTIVE' && (
                        <>
                          <button onClick={() => handleRevokeSession(ps.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-semibold">
                            <Ban size={11} /> Revoke Session
                          </button>
                          <button onClick={() => handleRevokeAllForStudent(ps.studentId)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-[11px] font-semibold">
                            <Ban size={11} /> Revoke All For Student
                          </button>
                        </>
                      )}
                      <button onClick={() => handleBlockStudent(ps.studentId)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-[11px] font-semibold">
                        <Ban size={11} /> Block From This Recording
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : securityTab === 'audit' ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {auditLog.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No audit events yet</p>
                ) : auditLog.map(a => (
                  <div key={a.id} className="glass-card p-3 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800 dark:text-white">{a.action}</p>
                      <span className="text-[10px] text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p className="text-gray-500">{a.studentName || (a.studentId ? `User #${a.studentId}` : '—')} — {a.result}</p>
                    <p className="text-gray-400">Device {a.deviceId?.slice(0, 8) || '—'}… · IP {a.ipAddress || '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {blockedStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No students blocked from this recording</p>
                ) : blockedStudents.map(b => (
                  <div key={b.studentUserId} className="glass-card p-3 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{b.studentName || `User #${b.studentUserId}`}</p>
                      <p className="text-gray-500">{b.studentEmail}</p>
                      <p className="text-gray-400">Blocked {b.blockedAt ? new Date(b.blockedAt).toLocaleString() : ''}</p>
                    </div>
                    <button onClick={() => handleUnblockStudent(b.studentUserId)}
                      className="px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-[11px] font-semibold">
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      <DeleteConfirmModal
        isOpen={Boolean(deletingSession)}
        onClose={() => setDeletingSession(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Recorded Session?"
        itemName={deletingSession?.title}
        loading={isDeleting}
      />

      {confirmModal}
    </div>
  )
}
