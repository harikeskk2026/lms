'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'

import {
  Pin, Trash2, Pencil, Plus, Send, ArrowLeft,
  History, CalendarDays, Check, X as XIcon, Paperclip,
  ChevronLeft, ChevronRight, Eye, Megaphone, FileText, Sparkles,
  Users, Calendar, Clock, Bookmark, Info, ChevronDown, Upload,
  RefreshCw,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api, { adminApi, resolveFileUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import assignmentService from '@/services/assignmentService'
import DateTimePicker from '@/components/ui/DateTimePicker'
import CustomSelect from '@/components/ui/CustomSelect'
import MultiSelect from '@/components/ui/MultiSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { useConfirmModal } from '@/components/ui/ConfirmModal'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'

const CATEGORIES = ['GENERAL', 'URGENT', 'PLACEMENT', 'EXAM', 'HOLIDAY', 'ATTENDANCE']

const CATEGORY_STYLES = {
  GENERAL:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  URGENT:     'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
  PLACEMENT:  'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
  EXAM:       'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40',
  HOLIDAY:    'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40',
  ATTENDANCE: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40',
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDayAfter(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('T')[0].split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0])) return ''
  const dt = new Date(parts[0], parts[1] - 1, parts[2])
  dt.setDate(dt.getDate() + 1)
  const yr = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const da = String(dt.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${da}`
}

function addDaysToDateStr(dateStr, days) {
  if (!dateStr) return ''
  const parts = dateStr.split('T')[0].split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0])) return ''
  const dt = new Date(parts[0], parts[1] - 1, parts[2])
  dt.setDate(dt.getDate() + days)
  const yr = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const da = String(dt.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${da}`
}


function formatSafe(val, fmtStr) {
  if (!val) return null
  try {
    const isDateOnly = typeof val === 'string' && val.length === 10 && !val.includes('T')
    const d = isDateOnly ? new Date(val + 'T00:00:00') : new Date(val)
    if (isNaN(d.getTime())) return null
    if (isDateOnly && fmtStr.includes('HH:mm')) {
      return format(d, fmtStr.replace(', HH:mm', '').replace(' HH:mm', ''))
    }
    return format(d, fmtStr)
  } catch {
    return null
  }
}

const emptyForm = {
  title: '', body: '',
  batchIds: [], courseIds: [],
  batchId: '', courseId: '', collegeId: '',
  isPinned: false, expiresAt: '', category: 'GENERAL', priority: 'NORMAL',
  requiresAcknowledgment: false, allowComments: false,
  scheduledAt: '',
  actionType: '', actionReferenceId: '', actionLabel: '', actionUrl: '',
  audienceRuleType: 'NONE', audienceRuleValue: '', audienceRuleReferenceId: '',
  attachmentUrl: '', attachmentName: '',
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const canCreate = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'
  const [announcements, setAnnouncements] = useState([])
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [detailsFor, setDetailsFor] = useState(null) // { id, tab: 'analytics'|'history' }
  const [activeSection, setActiveSection] = useState('ALL')
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [ask, confirmModal] = useConfirmModal()

  const load = () => {
    setLoading(true)
    adminApi.getAnnouncements().then(r => setAnnouncements(r.data.data || [])).catch(() => toast.error('Failed to load announcements')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    assignmentService.list({ limit: 100 }).then(r => {
      const list = r.data?.assignments || r.data?.data?.assignments || []
      setAssignments(list)
    }).catch(() => {})
  }, [])

  const buildPayload = (status) => ({
    title: form.title,
    body: form.body,
    batchId: form.batchIds?.[0] ? Number(form.batchIds[0]) : (form.batchId ? Number(form.batchId) : null),
    batchIds: form.batchIds?.map(Number) || [],
    courseId: form.courseIds?.[0] ? Number(form.courseIds[0]) : (form.courseId ? Number(form.courseId) : null),
    courseIds: form.courseIds?.map(Number) || [],
    collegeId: form.collegeId || null,
    isPinned: form.isPinned,
    expiresAt: form.expiresAt
      ? new Date(form.expiresAt.includes('T') ? form.expiresAt : `${form.expiresAt}T23:59:59`).toISOString()
      : null,
    category: form.category,
    status,
    priority: form.priority,
    scheduledAt: (status === 'SCHEDULED' || status === 'DRAFT') && form.scheduledAt
      ? new Date(form.scheduledAt.includes('T') ? form.scheduledAt : `${form.scheduledAt}T09:00:00`).toISOString()
      : null,
    requiresAcknowledgment: form.requiresAcknowledgment,
    allowComments: form.allowComments,
    actionType: form.actionType || null,
    actionReferenceId: form.actionReferenceId ? Number(form.actionReferenceId) : null,
    actionLabel: form.actionLabel || null,
    actionUrl: form.actionUrl || null,
    audienceRuleType: form.audienceRuleType || 'NONE',
    audienceRuleValue: form.audienceRuleValue !== '' && form.audienceRuleValue !== null && form.audienceRuleValue !== undefined ? Number(form.audienceRuleValue) : null,
    audienceRuleReferenceId: form.audienceRuleReferenceId ? Number(form.audienceRuleReferenceId) : null,
    attachmentUrl: form.attachmentUrl || null,
    attachmentName: form.attachmentName || null,
  })

  const handleSave = async (e, requestedStatus) => {
    e.preventDefault()
    if (!form.title?.trim()) {
      toast.error('Please enter an announcement title')
      return
    }
    if (!form.body?.trim()) {
      toast.error('Please enter the announcement message')
      return
    }
    if (!form.category) {
      toast.error('Please select a category')
      return
    }

    const isDraft = requestedStatus === 'DRAFT'
    const isScheduled = !isDraft && Boolean(form.scheduledAt)
    const effectiveStatus = isDraft ? 'DRAFT' : (isScheduled ? 'SCHEDULED' : 'PUBLISHED')

    if (isScheduled) {
      const scheduledDate = new Date(form.scheduledAt)
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }

    if (form.expiresAt) {
      const expDateStr = form.expiresAt.includes('T') ? form.expiresAt : `${form.expiresAt}T23:59:59`
      const expiryTime = new Date(expDateStr).getTime()
      if (isNaN(expiryTime)) {
        toast.error('Please enter a valid expiry date & time')
        return
      }
      if (isScheduled && form.scheduledAt) {
        const schedDateStr = form.scheduledAt.includes('T') ? form.scheduledAt : `${form.scheduledAt}T00:00:00`
        const scheduledTime = new Date(schedDateStr).getTime()
        if (expiryTime <= scheduledTime) {
          toast.error(`Expiry date & time must be after the scheduled publishing date & time (${formatSafe(form.scheduledAt, 'dd MMM yyyy, HH:mm') || form.scheduledAt})`)
          return
        }
      } else {
        if (expiryTime <= Date.now()) {
          toast.error('Expiry date & time must be in the future')
          return
        }
      }
    }

    setSaving(true)
    try {
      const payload = buildPayload(effectiveStatus)
      if (editId) {
        await adminApi.updateAnnouncement(editId, payload)
        toast.success(
          isDraft
            ? 'Draft updated'
            : isScheduled
              ? `Announcement updated and scheduled for ${format(new Date(form.scheduledAt), 'dd MMM yyyy, HH:mm')}`
              : 'Announcement updated and published!'
        )
      } else {
        await adminApi.createAnnouncement(payload)
        toast.success(
          isDraft
            ? 'Saved as draft'
            : isScheduled
              ? `Announcement scheduled for ${format(new Date(form.scheduledAt), 'dd MMM yyyy, HH:mm')}`
              : 'Announcement published successfully!'
        )
      }
      setFormOpen(false)
      setEditId(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || err?.message || 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (id) => {
    try { await adminApi.publishAnnouncement(id); toast.success('Published'); load() }
    catch (err) { toast.error(err.response?.data?.message || err?.message || 'Failed to publish') }
  }
  const handleApprove = async (id) => {
    try { await adminApi.approveAnnouncement(id); toast.success('Approved'); load() }
    catch (err) { toast.error(err.response?.data?.message || err?.message || 'Failed to approve') }
  }
  const handleReject = async (id) => {
    try { await adminApi.rejectAnnouncement(id); toast.success('Rejected back to draft'); load() }
    catch (err) { toast.error(err.response?.data?.message || err?.message || 'Failed to reject') }
  }
  const handleDuplicate = async (id) => {
    try { await adminApi.duplicateAnnouncement(id); toast.success('Duplicated as draft'); load() }
    catch (err) { toast.error(err.response?.data?.message || err?.message || 'Failed to duplicate') }
  }
  const handleSubmitForApproval = async (id) => {
    try { await adminApi.submitAnnouncementForApproval(id); toast.success('Submitted for approval'); load() }
    catch (err) { toast.error(err.response?.data?.message || err?.message || 'Failed to submit for approval') }
  }
  const handleDelete = (id) => {
    const target = announcements.find(a => a.id === id) || { id }
    setDeletingAnnouncement(target)
  }
  const handleConfirmDelete = async () => {
    if (!deletingAnnouncement) return
    setDeleting(true)
    try {
      await adminApi.deleteAnnouncement(deletingAnnouncement.id)
      toast.success('Deleted')
      setDeletingAnnouncement(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || err?.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (a) => {
    setEditId(a.id)
    const bIds = a.batchIds && a.batchIds.length > 0
      ? a.batchIds.map(String)
      : (a.batchId ? [String(a.batchId)] : [])
    const cIds = a.courseIds && a.courseIds.length > 0
      ? a.courseIds.map(String)
      : (a.courseId ? [String(a.courseId)] : [])

    setForm({
      title: a.title || '',
      body: a.body || '',
      batchIds: bIds,
      courseIds: cIds,
      batchId: bIds[0] || '',
      courseId: cIds[0] || '',
      collegeId: a.collegeId ? String(a.collegeId) : '',
      isPinned: !!a.isPinned,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : '',
      category: a.category || 'GENERAL',
      priority: a.priority || 'NORMAL',
      scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : '',
      requiresAcknowledgment: !!a.requiresAcknowledgment,
      allowComments: !!a.allowComments,
      actionType: a.actionType || '',
      actionReferenceId: a.actionReferenceId ? String(a.actionReferenceId) : '',
      actionLabel: a.actionLabel || '',
      actionUrl: a.actionUrl || '',
      audienceRuleType: a.audienceRuleType || 'NONE',
      audienceRuleValue: a.audienceRuleValue !== null && a.audienceRuleValue !== undefined ? String(a.audienceRuleValue) : '',
      audienceRuleReferenceId: a.audienceRuleReferenceId ? String(a.audienceRuleReferenceId) : '',
      attachmentUrl: a.attachmentUrl || '',
      attachmentName: a.attachmentName || '',
    })
    setFormOpen(true)
  }

  const sections = [
    { key: 'ALL', label: 'All', items: announcements, color: 'text-purple-600', emptyText: 'No announcements yet' },
    { key: 'PUBLISHED', label: 'Published', items: announcements.filter(a => a.status === 'PUBLISHED'), color: 'text-emerald-600', emptyText: 'No published announcements' },
    { key: 'DRAFT', label: 'Drafts', items: announcements.filter(a => a.status === 'DRAFT'), color: 'text-gray-500', emptyText: 'No drafts' },
    { key: 'SCHEDULED', label: 'Scheduled', items: announcements.filter(a => a.status === 'SCHEDULED'), color: 'text-sky-600', emptyText: 'No scheduled announcements' },
    { key: 'OTHER', label: 'Other', items: announcements.filter(a => a.status !== 'PUBLISHED' && a.status !== 'DRAFT' && a.status !== 'SCHEDULED'), color: 'text-amber-600', emptyText: 'No pending or rejected announcements' },
  ]

  const handleTabClick = (key) => {
    setActiveSection(key)
    if (formOpen) {
      setFormOpen(false)
      setEditId(null)
      setForm(emptyForm)
    }
  }
  const activeTabData = sections.find(s => s.key === activeSection) || sections[0]

  const cardProps = {
    batches, courses, assignments,
    onView: setViewingAnnouncement,
    onPreviewAttachment: setPreviewAttachment,
    ...(canCreate ? {
      onEdit: handleEdit, onDelete: handleDelete, onDetails: setDetailsFor,
      onPublish: handlePublish, onApprove: handleApprove, onReject: handleReject, onDuplicate: handleDuplicate,
      onSubmitForApproval: handleSubmitForApproval,
    } : {}),
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Announcements</h1>
        {!formOpen && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title="Refresh Announcements"
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-purple-600' : 'text-purple-600 dark:text-purple-400'} />
              <span>Refresh</span>
            </button>
            <button onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 border border-gray-200 text-gray-600 dark:text-gray-300 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CalendarDays size={14} /> {view === 'list' ? 'Calendar' : 'List'}
            </button>
            {canCreate && (
              <button onClick={() => { setFormOpen(true); setEditId(null); setForm(emptyForm) }}
                className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-md shadow-purple-500/20 active:scale-95 transition-all">
                <Plus size={16} /> Create Announcement
              </button>
            )}
          </div>
        )}
      </div>

      {formOpen ? (
        <AnnouncementForm
          form={form} setForm={setForm} editId={editId}
          saving={saving} onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditId(null); setForm(emptyForm) }}
          batches={batches} courses={courses} assignments={assignments}
          onPreviewAttachment={setPreviewAttachment}
        />
      ) : (
        <>
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
            {sections.map(s => {
              const count = s.items.length
              const isActive = activeSection === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => handleTabClick(s.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {view === 'calendar' ? (
            <CalendarView
              announcements={announcements}
              batches={batches}
              courses={courses}
              assignments={assignments}
              activeSection={activeSection}
              activeTabData={activeTabData}
              onView={setViewingAnnouncement}
              onDetails={setDetailsFor}
              onEdit={canCreate ? handleEdit : undefined}
              onDelete={canCreate ? handleDelete : undefined}
              onPublish={canCreate ? handlePublish : undefined}
              onApprove={canCreate ? handleApprove : undefined}
              onReject={canCreate ? handleReject : undefined}
              onDuplicate={canCreate ? handleDuplicate : undefined}
              onSubmitForApproval={canCreate ? handleSubmitForApproval : undefined}
              onPreviewAttachment={setPreviewAttachment}
            />
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 glass-card animate-pulse" />)}
            </div>
          ) : (
            <AnnouncementSection
              title={activeTabData.label}
              color={activeTabData.color}
              items={activeTabData.items}
              emptyText={activeTabData.emptyText}
              cardProps={cardProps}
              sections={sections}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              hideTitle
            />
          )}
        </>
      )}

      {detailsFor && (
        <DetailsModal announcementId={detailsFor.id} initialTab={detailsFor.tab} onClose={() => setDetailsFor(null)} />
      )}

      {viewingAnnouncement && (
        <ViewAnnouncementModal a={viewingAnnouncement} batches={batches}
          courses={courses} assignments={assignments} onClose={() => setViewingAnnouncement(null)}
          onPreviewAttachment={setPreviewAttachment} />
      )}

      <DeleteConfirmModal
        isOpen={!!deletingAnnouncement}
        onClose={() => { if (!deleting) setDeletingAnnouncement(null) }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete Announcement?"
        itemName={deletingAnnouncement?.title}
      />

      {previewAttachment && (
        <ViewAttachmentModal
          url={previewAttachment.url}
          name={previewAttachment.name}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {confirmModal}
    </div>
  )
}

function AnnouncementForm({ form, setForm, editId, saving, onSave, onCancel, batches = [], courses = [], assignments = [], onPreviewAttachment }) {
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const toggle = (key) => () => setForm(f => ({ ...f, [key]: !f[key] }))
  const bodyRef = useRef(null)

  const [uploading, setUploading] = useState(false)

  // Shortlist batches according to selected courses
  const filteredBatches = useMemo(() => {
    if (!form.courseIds || form.courseIds.length === 0) {
      return batches
    }
    const selectedCourseIdStrs = new Set(form.courseIds.map(String))
    return batches.filter(b => {
      const bCourseId = b.course?.id ?? b.courseId ?? (typeof b.course === 'object' ? b.course?.id : b.course)
      return bCourseId != null && selectedCourseIdStrs.has(String(bCourseId))
    })
  }, [batches, form.courseIds])

  const handleCoursesChange = (newCourseIds) => {
    setForm(f => {
      let nextBatchIds = f.batchIds || []
      if (newCourseIds.length > 0) {
        const validCourseIdStrs = new Set(newCourseIds.map(String))
        nextBatchIds = nextBatchIds.filter(bId => {
          const b = batches.find(item => String(item.id) === String(bId))
          if (!b) return false
          const bCourseId = b.course?.id ?? b.courseId ?? (typeof b.course === 'object' ? b.course?.id : b.course)
          return bCourseId != null && validCourseIdStrs.has(String(bCourseId))
        })
      }
      return {
        ...f,
        courseIds: newCourseIds,
        courseId: newCourseIds[0] || '',
        batchIds: nextBatchIds,
        batchId: nextBatchIds[0] || '',
      }
    })
  }

  const handleBatchesChange = (newBatchIds) => {
    setForm(f => ({
      ...f,
      batchIds: newBatchIds,
      batchId: newBatchIds[0] || '',
    }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const res = await api.post('/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploadData = res.data?.data || res.data
      if (uploadData) {
        setForm(f => ({
          ...f,
          attachmentUrl: uploadData.url || uploadData.fileUrl || uploadData.path || '',
          attachmentName: uploadData.originalName || uploadData.fileName || file.name || 'Attachment',
        }))
        toast.success('Attachment uploaded successfully')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err?.message || 'Failed to upload attachment')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const todayStr = getTodayString()
  const publishDate = form.scheduledAt ? form.scheduledAt.split('T')[0] : todayStr
  const minExpiryDate = publishDate

  const isExpiryInvalid = useMemo(() => {
    if (!form.expiresAt) return false
    const expDateStr = form.expiresAt.includes('T') ? form.expiresAt : `${form.expiresAt}T23:59:59`
    const expTime = new Date(expDateStr).getTime()
    if (isNaN(expTime)) return true
    if (form.scheduledAt) {
      const schedDateStr = form.scheduledAt.includes('T') ? form.scheduledAt : `${form.scheduledAt}T00:00:00`
      const schedTime = new Date(schedDateStr).getTime()
      if (!isNaN(schedTime)) {
        return expTime <= schedTime
      }
    }
    return expTime <= Date.now()
  }, [form.expiresAt, form.scheduledAt])


  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25 flex-shrink-0">
            <Megaphone size={22} />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {editId ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Broadcast critical information, event details, or academic notices across students and batches.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all shadow-2xs hover:shadow-xs active:scale-95"
        >
          <ArrowLeft size={14} /> Back to Announcements
        </button>
      </div>

      <form noValidate className="space-y-6 pt-6">
        {/* Section 1: Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileText size={15} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Announcement Content</h3>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
              Title <span className="text-purple-600">*</span>
            </label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="Enter announcement title"
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 px-4 text-sm font-medium text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
              Message Body <span className="text-purple-600">*</span>
            </label>
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={set('body')}
              rows={5}
              placeholder="Enter announcement message details here..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 p-4 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all shadow-2xs leading-relaxed"
            />
          </div>
        </div>

        {/* Section 2: Audience Targeting */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Users size={15} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white">Audience Targeting</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Select which courses or cohorts should receive this notice</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
              Default: Broadcast to Everyone
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Position 1: Target Course */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Target Course
                </label>
                {form.courseIds?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCoursesChange([])}
                    className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Clear all ({form.courseIds.length})
                  </button>
                )}
              </div>
              <MultiSelect
                options={courses.map(c => ({ value: String(c.id), label: c.title }))}
                value={form.courseIds ? form.courseIds.map(String) : []}
                onChange={handleCoursesChange}
                placeholder="All Courses (Anyone in any course)"
                searchPlaceholder="Search courses..."
                emptyLabel="No courses found"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {form.courseIds?.length
                  ? `${form.courseIds.length} course(s) selected. Batches below are shortlisted.`
                  : 'Leave unselected to target all courses.'}
              </p>
            </div>

            {/* Position 2: Target Batch */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Target Batch
                </label>
                {form.batchIds?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBatchesChange([])}
                    className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Clear all ({form.batchIds.length})
                  </button>
                )}
              </div>
              <MultiSelect
                options={filteredBatches.map(b => ({
                  value: String(b.id),
                  label: b.course?.title ? `${b.name} (${b.course.title})` : b.name
                }))}
                value={form.batchIds ? form.batchIds.map(String) : []}
                onChange={handleBatchesChange}
                placeholder={
                  filteredBatches.length === 0
                    ? 'No batches found for selected course(s)'
                    : 'All Batches (Anyone in selected/all batches)'
                }
                searchPlaceholder="Search batches..."
                emptyLabel={
                  form.courseIds?.length > 0
                    ? 'No batches in selected course(s)'
                    : 'No batches found'
                }
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {form.batchIds?.length
                  ? `${form.batchIds.length} batch(es) selected.`
                  : form.courseIds?.length > 0
                  ? `Showing ${filteredBatches.length} batch(es) matching selected course(s). Leave unselected for all batches in those courses.`
                  : 'Leave unselected to target all batches.'}
              </p>
            </div>
          </div>

        </div>

        {/* Section 3: Delivery & Settings */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Calendar size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Delivery & Categorization</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Specify notice type, automated scheduling, and expiration date & time</p>
            </div>
          </div>

          {/* Row 1: Category & Schedule for Automated Publishing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Category <span className="text-purple-600">*</span>
              </label>
              <CustomSelect
                value={form.category}
                onChange={(val) => setForm(f => ({ ...f, category: val }))}
                options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Classify this notice to help students quickly identify its context.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-sky-500" />
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Schedule for Automated Publishing (Optional)
                  </label>
                </div>
                {form.scheduledAt && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
                    {formatSafe(form.scheduledAt, 'MMM d, yyyy, HH:mm') ? `Scheduled: ${formatSafe(form.scheduledAt, 'MMM d, yyyy, HH:mm')}` : 'Scheduled'}
                  </span>
                )}
              </div>

              <div className="w-full min-w-0">
                <DateTimePicker
                  disablePast
                  minDate={new Date().toISOString().split('T')[0]}
                  value={form.scheduledAt}
                  onChange={val => setForm(f => ({ ...f, scheduledAt: val }))}
                />
              </div>

              <p className="text-[11px] text-gray-400 mt-1.5">
                {form.scheduledAt
                  ? `Will automatically publish on ${formatSafe(form.scheduledAt, 'MMMM d, yyyy, HH:mm') || form.scheduledAt}.`
                  : 'Leave blank to publish immediately, or choose a future date & time for hands-free publishing.'}
              </p>
            </div>
          </div>

          {/* Row 2: Expires On & Pin to Top */}
          <div className="pt-3.5 border-t border-gray-200/60 dark:border-gray-700/60 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-500" />
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Expires On (Optional)
                  </label>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  !form.expiresAt
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    : isExpiryInvalid
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                    : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                }`}>
                  {!form.expiresAt
                    ? 'No Expiration'
                    : isExpiryInvalid
                    ? 'Invalid Expiration'
                    : `Expires: ${formatSafe(form.expiresAt, 'MMM d, yyyy, HH:mm') || formatSafe(form.expiresAt, 'MMM d, yyyy')}`}
                </span>
              </div>

              <div className="w-full min-w-0">
                <DateTimePicker
                  disablePast
                  minDate={minExpiryDate}
                  value={form.expiresAt}
                  onChange={val => setForm(f => ({ ...f, expiresAt: val }))}
                  hasError={isExpiryInvalid}
                />
              </div>

              {/* Helper text */}
              {isExpiryInvalid ? (
                <p className="text-[11px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                  <span>
                    {form.scheduledAt
                      ? `⚠ Expiry date & time must be after the scheduled publishing time (${formatSafe(form.scheduledAt, 'dd MMM yyyy, HH:mm') || form.scheduledAt}).`
                      : '⚠ Expiry date & time must be in the future.'}
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {form.expiresAt
                    ? `Notice will remain visible through ${formatSafe(form.expiresAt, 'MMMM d, yyyy, HH:mm') || formatSafe(form.expiresAt, 'MMMM d, yyyy')}.`
                    : 'No expiration set. Notice will remain visible permanently.'}
                </p>
              )}
            </div>

            <div>
              <FeatureToggleCard
                icon={Pin}
                title="Pin to Top"
                description="Keep this notice prominently pinned at the top of the student announcement list."
                checked={form.isPinned}
                onClick={toggle('isPinned')}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Attachments & Action Link (Optional) */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Paperclip size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Attachment & Action Link (Optional)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Attach a document/notice or configure a quick-access action button</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Attachment File
              </label>
              {form.attachmentUrl ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (onPreviewAttachment && form.attachmentUrl) {
                        onPreviewAttachment({
                          url: resolveFileUrl(form.attachmentUrl),
                          name: form.attachmentName || 'Attachment',
                        })
                      }
                    }}
                    className="flex items-center gap-2 min-w-0 text-left hover:underline cursor-pointer group"
                    title="Click to preview attachment"
                  >
                    <Paperclip size={14} className="text-sky-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sky-800 dark:text-sky-300 truncate">{form.attachmentName || 'Attached File'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, attachmentUrl: '', attachmentName: '' }))}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-2 cursor-pointer"
                    title="Remove attachment"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-400 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer transition-colors shadow-2xs">
                  <Upload size={14} className="text-purple-500" />
                  <span>{uploading ? 'Uploading...' : 'Choose File (PDF, DOCX, Image)'}</span>
                  <input
                    type="file"
                    disabled={uploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Action Button Label (Optional)
              </label>
              <input
                value={form.actionLabel}
                onChange={set('actionLabel')}
                placeholder="e.g. View Assignment, Go to Drive"
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium outline-none focus:ring-2 focus:border-purple-500 text-gray-800 dark:text-gray-200 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Cancel
          </button>

          {(() => {
            const isAnnouncementValid = Boolean(form.title?.trim() && form.body?.trim() && !isExpiryInvalid)
            return (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  disabled={saving || !isAnnouncementValid}
                  onClick={e => onSave(e, 'DRAFT')}
                  className="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                >
                  <Bookmark size={14} /> Save as Draft
                </button>

                <button
                  type="button"
                  disabled={saving || !isAnnouncementValid}
                  onClick={e => onSave(e, 'PUBLISHED')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 active:scale-98"
                >
                  <Send size={14} />
                  {saving
                    ? (form.scheduledAt ? 'Scheduling...' : 'Publishing...')
                    : (editId ? 'Update & Publish' : 'Publish Announcement')}
                </button>
              </div>
            )
          })()}
        </div>
      </form>
    </div>
  )
}

function Select({ label, value, onChange, options, allLabel }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options.map(([id, name]) => ({ value: id, label: name }))}
        placeholder={allLabel}
      />
    </div>
  )
}

function FeatureToggleCard({ icon: Icon, title, description, checked, onClick }) {
  return (
    <div
      onClick={onClick}
      role="switch"
      aria-checked={checked}
      className={`relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
        checked
          ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700/80 shadow-xs'
          : 'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
        checked
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400'
      }`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0 pr-10">
        <p className="text-sm font-bold text-gray-800 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}>
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
              checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
            }`}
          />
        </div>
      </div>
    </div>
  )
}

function AnnouncementSection({
  title,
  color,
  items,
  emptyText,
  cardProps,
  hideTitle,
  sections = [],
  activeSection,
  setActiveSection,
}) {
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = items.length
  const effectivePageSize = pageSize === 'all' ? (totalItems || 1) : Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize === 'all' ? (totalItems || 1) : effectivePageSize)))
  const validPage = Math.min(currentPage, totalPages)
  const startIdx = pageSize === 'all' ? 0 : (validPage - 1) * effectivePageSize
  const endIdx = pageSize === 'all' ? totalItems : Math.min(startIdx + effectivePageSize, totalItems)
  const paginatedItems = items.slice(startIdx, endIdx)

  return (
    <div className="space-y-4">
      {!hideTitle && <p className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title} ({items.length})</p>}
      {items.length === 0 ? (
        emptyText && <p className="text-sm text-gray-400 glass-card p-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {paginatedItems.map((a, idx) => (
            <AnnouncementCard
              key={a.id}
              a={a}
              serialNo={startIdx + idx + 1}
              {...cardProps}
            />
          ))}
        </div>
      )}

      {/* Bottom Rows Selector & Pagination (Short Box) */}
      {totalItems > 0 && (
        <div className="flex justify-end pt-1">
          <div className="glass-card px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 inline-flex items-center gap-2.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>

            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
              {totalItems === 0 ? '0 of 0' : `${startIdx + 1}–${endIdx} of ${totalItems}`}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Prev
                </button>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1
                  if (totalPages > 6 && Math.abs(p - validPage) > 2 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) {
                      return <span key={p} className="text-xs text-gray-400 px-0.5">...</span>
                    }
                    return null
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-6 h-6 text-xs font-bold rounded-lg transition-colors ${
                        p === validPage
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ a, serialNo, batches, courses, assignments = [], onEdit, onDelete, onPublish, onApprove, onReject, onDuplicate, onSubmitForApproval, onDetails, onView, onPreviewAttachment }) {
  const isDraft = a.status === 'DRAFT'
  const isScheduled = a.status === 'SCHEDULED'
  const isPending = a.status === 'PENDING_APPROVAL'
  const todayStr = getTodayString()
  const isPastExpiry = !!(a.expiresAt && new Date(a.expiresAt).getTime() < Date.now())
  const isExpired = a.status === 'EXPIRED' || isPastExpiry

  return (
    <div className={`glass-card p-5 ${a.isPinned ? 'border-purple-300 dark:border-purple-700' : ''} ${isDraft || isExpired ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(a)} title="Click to view details">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {serialNo !== undefined && (
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md font-mono flex-shrink-0">
                #{serialNo}
              </span>
            )}
            {a.isPinned && <Pin size={12} className="text-purple-500 flex-shrink-0" />}
            <h3 className="font-display font-bold text-gray-800 dark:text-white">{a.title}</h3>
            {(isDraft || isScheduled || isPending || isExpired) && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isExpired
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {isExpired ? 'EXPIRED' : String(a.status).replace(/_/g, ' ')}
              </span>
            )}
            {a.category && a.category !== 'GENERAL' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
                {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
              </span>
            )}
            <TargetAudienceBadges a={a} batches={batches} courses={courses} />
            {a.requiresAcknowledgment && <Badge color="red">Ack Required</Badge>}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{a.body}</p>
          {a.actionLabel && (
            <span className="inline-block mt-2 text-xs font-semibold text-purple-600 border border-purple-200 rounded-lg px-2 py-1">
              {a.actionLabel}
            </span>
          )}
          {a.attachmentUrl && (
            <div className="mt-2.5" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onPreviewAttachment?.({ url: resolveFileUrl(a.attachmentUrl), name: a.attachmentName || 'Attachment' })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg px-2.5 py-1 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
              >
                <Paperclip size={13} />
                <span>{a.attachmentName || 'View Attachment'}</span>
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            {a.expiresAt && (
              <span className={`flex items-center gap-1 font-medium ${isExpired ? 'text-rose-500 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                <Calendar size={12} className="flex-shrink-0" />
                {isExpired ? `Expired on ${formatSafe(a.expiresAt, 'dd MMM yyyy, HH:mm')}` : `Expires on ${formatSafe(a.expiresAt, 'dd MMM yyyy, HH:mm')}`}
              </span>
            )}
          </div>
          {isScheduled && a.scheduledAt && <p className="text-[10px] text-sky-500 mt-0.5">Scheduled for {format(new Date(a.scheduledAt), 'dd MMM yyyy, HH:mm')}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80 sm:justify-end flex-wrap">
          {onPublish && (isDraft || isScheduled) && (
            <IconButton title="Publish Now" onClick={() => onPublish(a.id)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
              <Send size={13} />
            </IconButton>
          )}
          {onSubmitForApproval && isDraft && (
            <IconButton title="Submit for Approval" onClick={() => onSubmitForApproval(a.id)} className="bg-sky-50 text-sky-600 hover:bg-sky-100">
              <Upload size={13} />
            </IconButton>
          )}
          {onApprove && isPending && (
            <IconButton title="Approve" onClick={() => onApprove(a.id)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
              <Check size={13} />
            </IconButton>
          )}
          {onReject && isPending && (
            <IconButton title="Reject" onClick={() => onReject(a.id)} className="bg-amber-50 text-amber-600 hover:bg-amber-100">
              <XIcon size={13} />
            </IconButton>
          )}
          {onEdit && (
            <IconButton title="Edit" onClick={() => onEdit(a)} className="bg-gray-100 text-gray-500 hover:bg-gray-200">
              <Pencil size={13} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton title="Delete" onClick={() => onDelete(a.id)} className="bg-red-50 text-red-500 hover:bg-red-100">
              <Trash2 size={13} />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  )
}

function IconButton({ title, onClick, className, children }) {
  return (
    <button title={title} onClick={onClick} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${className}`}>
      {children}
    </button>
  )
}

const BADGE_COLORS = {
  purple: 'bg-purple-100 text-purple-700', blue: 'bg-blue-100 text-blue-700', teal: 'bg-teal-100 text-teal-700',
  pink: 'bg-pink-100 text-pink-700', cyan: 'bg-cyan-100 text-cyan-700', amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700', gray: 'bg-gray-100 text-gray-600',
}

function Badge({ color, children }) {
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_COLORS[color] || BADGE_COLORS.gray}`}>{children}</span>
}

function TargetAudienceBadges({ a, batches = [], courses = [] }) {
  if (!a) return null

  const bIds = (a.batchIds && a.batchIds.length > 0)
    ? a.batchIds.map(String)
    : (a.batchId ? [String(a.batchId)] : [])
  const cIds = (a.courseIds && a.courseIds.length > 0)
    ? a.courseIds.map(String)
    : (a.courseId ? [String(a.courseId)] : [])

  const targetCourses = (courses || []).filter(c => c && cIds.includes(String(c.id)))
  const targetBatches = (batches || []).filter(b => b && bIds.includes(String(b.id)))

  if (targetCourses.length === 0 && targetBatches.length === 0) {
    return <Badge color="blue">All Students</Badge>
  }

  return (
    <>
      {targetCourses.map(c => (
        <Badge key={`c-${c.id}`} color="cyan">{c.title}</Badge>
      ))}
      {targetBatches.map(b => (
        <Badge key={`b-${b.id}`} color="purple">{b.name}</Badge>
      ))}
    </>
  )
}

function Modal({ title, onClose, children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-base sm:text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><XIcon size={16} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

function DetailsModal({ announcementId, initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab === 'history' ? 'history' : 'analytics')
  const [analytics, setAnalytics] = useState(null)
  const [history, setHistory] = useState(null)

  useEffect(() => {
    if (tab === 'analytics' && !analytics) {
      adminApi.getAnnouncementAnalytics(announcementId).then(r => setAnalytics(r.data.data)).catch(() => setAnalytics({}))
    }
    if (tab === 'history' && !history) {
      adminApi.getAnnouncementHistory(announcementId).then(r => setHistory(r.data.data || [])).catch(() => setHistory([]))
    }
  }, [tab, announcementId])

  return (
    <Modal title="Announcement Details" onClose={onClose}>
      <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {['analytics', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px capitalize ${tab === t ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'analytics' && (
        analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <Stat label="Targeted" value={analytics.targeted} />
            <Stat label="Viewed" value={analytics.viewed} />
            <Stat label="Unread" value={analytics.unread} />
            <Stat label="Acknowledged" value={analytics.acknowledged} />
            <Stat label="Pending Ack" value={analytics.pendingAcknowledgment} />
            <Stat label="View Rate" value={`${analytics.viewRatePercent ?? 0}%`} />
            <Stat label="Ack Rate" value={`${analytics.acknowledgmentRatePercent ?? 0}%`} />
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
      )}

      {tab === 'history' && (
        history ? (
          history.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No edits yet.</p> : (
            <div className="space-y-3">
              {history.map(v => (
                <div key={v.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Version {v.versionNumber} — {v.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{v.changedByName || 'Unknown'} · {format(new Date(v.changedAt), 'dd MMM yyyy, HH:mm')}</p>
                  <p className="text-sm text-gray-500 mt-2">{v.content}</p>
                </div>
              ))}
            </div>
          )
        ) : <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
      )}
    </Modal>
  )
}

function ViewAnnouncementModal({ a, batches = [], courses = [], assignments = [], onClose, onPreviewAttachment }) {
  if (!a) return null

  const createdStr = formatSafe(a.createdAt, 'dd MMM yyyy, HH:mm')
  const scheduledStr = formatSafe(a.scheduledAt, 'dd MMM yyyy, HH:mm')
  const expiresStr = formatSafe(a.expiresAt, 'dd MMM yyyy, HH:mm')
  const statusStr = a.status ? String(a.status).replace(/_/g, ' ') : ''
  const actionTypeStr = a.actionType ? String(a.actionType).replace(/_/g, ' ') : ''

  return (
    <Modal title="View Announcement" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {a.isPinned && <Pin size={12} className="text-purple-500" />}
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-lg">{a.title}</h3>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {statusStr && (
            <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{statusStr}</span>
          )}
          {a.category && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
              {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
            </span>
          )}
          <TargetAudienceBadges a={a} batches={batches} courses={courses} />
          {a.requiresAcknowledgment && <Badge color="red">Ack Required</Badge>}
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.body}</p>
        </div>

        {a.actionLabel && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Action Button</p>
            <span className="inline-block text-xs font-semibold text-purple-600 border border-purple-200 rounded-lg px-2 py-1">
              {a.actionLabel} {actionTypeStr ? `(${actionTypeStr})` : ''}
            </span>
          </div>
        )}

        {a.attachmentUrl && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attachment</p>
            <button
              type="button"
              onClick={() => {
                if (onPreviewAttachment) {
                  onPreviewAttachment({
                    url: resolveFileUrl(a.attachmentUrl),
                    name: a.attachmentName || 'Attachment',
                  })
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              <Paperclip size={14} />
              <span>{a.attachmentName || 'View Attachment'}</span>
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created</p>
            <p className="text-gray-700 dark:text-gray-300">{createdStr || '—'}</p>
          </div>
          {a.scheduledAt && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled For</p>
              <p className="text-sky-600">{scheduledStr || a.scheduledAt}</p>
            </div>
          )}
          {a.expiresAt && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expires</p>
              <p className="text-amber-600">{expiresStr || a.expiresAt}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Stat({ label, value }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-gray-800 dark:text-white">{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function CalendarView({
  announcements = [],
  batches = [],
  courses = [],
  assignments = [],
  activeSection = 'ALL',
  activeTabData,
  onView,
  onDetails,
  onEdit,
  onDelete,
  onPublish,
  onApprove,
  onReject,
  onDuplicate,
  onSubmitForApproval,
  onPreviewAttachment,
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const [selectedDay, setSelectedDay] = useState(null)
  const [localModalAnnouncement, setLocalModalAnnouncement] = useState(null)

  const calendarCardRef = useRef(null)
  const listRef = useRef(null)
  const [calendarHeight, setCalendarHeight] = useState(0)

  useEffect(() => {
    const el = calendarCardRef.current
    if (!el) return
    const updateHeight = () => {
      if (el) setCalendarHeight(el.offsetHeight)
    }
    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [selectedDay, activeSection])

  const handleOpenAnnouncement = (announcement) => {
    if (!announcement) return
    if (onView) {
      onView(announcement)
    } else {
      setLocalModalAnnouncement(announcement)
    }
  }

  const prevMonth = () => {
    setSelectedDay(null)
    setCurrentDate(new Date(year, month - 1, 1))
  }
  const nextMonth = () => {
    setSelectedDay(null)
    setCurrentDate(new Date(year, month + 1, 1))
  }
  const goToToday = () => {
    setSelectedDay(null)
    setCurrentDate(new Date())
  }

  // Filter announcements according to the active tab (ALL, PUBLISHED, DRAFT, SCHEDULED, OTHER)
  const filteredAnnouncements = announcements.filter(a => {
    if (activeSection === 'ALL') return true
    if (activeSection === 'OTHER') return !['PUBLISHED', 'DRAFT', 'SCHEDULED'].includes(a.status)
    return a.status === activeSection
  })

  // Map all announcements across their scheduled, published, draft and expiring dates
  const dayItems = {}
  announcements.forEach(a => {
    const mark = (dateStr, type) => {
      if (!dateStr) return
      const d = typeof dateStr === 'string' && dateStr.length === 10 && !dateStr.includes('T')
        ? new Date(dateStr + 'T00:00:00')
        : new Date(dateStr)
      if (d.getFullYear() !== year || d.getMonth() !== month) return
      const key = d.getDate()
      dayItems[key] = dayItems[key] || []
      dayItems[key].push({ a, type })
    }
    if (a.status === 'SCHEDULED') mark(a.scheduledAt, 'scheduled')
    if (a.status === 'PUBLISHED') mark(a.createdAt, 'published')
    if (a.status === 'DRAFT') mark(a.createdAt, 'draft')
    if (a.expiresAt) mark(a.expiresAt, 'expiring')
  })

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (d) => {
    const now = new Date()
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === d
  }

  const TYPE_DOT = {
    scheduled: 'bg-sky-500',
    published: 'bg-emerald-500',
    expiring: 'bg-amber-500',
    draft: 'bg-gray-400',
  }
  const TYPE_LABEL = {
    scheduled: 'Scheduled for',
    published: 'Published on',
    expiring: 'Expires on',
    draft: 'Draft created on',
  }

  // Items to display in the side panel:
  // If a specific date is selected, show items for that date.
  // Otherwise, show all items currently filtered by the active tab.
  const displayItems = selectedDay
    ? (dayItems[selectedDay] || [])
    : filteredAnnouncements.map(a => {
        let type = 'published'
        if (a.status === 'SCHEDULED') type = 'scheduled'
        else if (a.status === 'DRAFT') type = 'draft'
        return { a, type }
      })

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
      {/* Calendar Card */}
      <div ref={calendarCardRef} className="glass-card p-4 sm:p-5 flex-1 min-w-0 w-full shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-gray-800 dark:text-white text-base sm:text-lg">
              {format(currentDate, 'MMMM yyyy')}
            </p>
            <div className="flex items-center gap-1 ml-1.5">
              <button
                type="button"
                onClick={prevMonth}
                title="Previous Month"
                className="p-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={goToToday}
                title="Go to Current Month"
                className="px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                title="Next Month"
                className="p-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="flex gap-2.5 sm:gap-3 text-[10px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Scheduled</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Published</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Draft</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Expiring</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const isSelected = selectedDay === d && d !== null
            const isCurr = d !== null && isToday(d)
            const itemsOnDay = d ? (dayItems[d] || []) : []

            return (
              <div
                key={i}
                role={d ? 'button' : undefined}
                tabIndex={d ? 0 : undefined}
                onClick={d ? () => setSelectedDay(selectedDay === d ? null : d) : undefined}
                onKeyDown={d ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(selectedDay === d ? null : d) } } : undefined}
                className={`min-h-[50px] sm:min-h-[58px] rounded-xl border p-1 sm:p-1.5 text-xs text-left transition-all select-none ${
                  !d ? 'border-transparent cursor-default'
                  : isSelected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-500/30 shadow-sm cursor-pointer'
                    : isCurr
                    ? 'border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/20 cursor-pointer'
                    : 'border-gray-100 dark:border-gray-800/80 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 cursor-pointer'
                }`}
              >
                {d && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] sm:text-xs font-semibold ${
                        isSelected
                          ? 'text-purple-600 dark:text-purple-300 font-bold'
                          : isCurr
                          ? 'text-purple-600 dark:text-purple-400 font-bold'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {d}
                      </span>
                      {isCurr && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Today" />}
                    </div>

                    <div className="mt-1 space-y-1">
                      {itemsOnDay.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDay(d)
                            handleOpenAnnouncement(item.a)
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium break-words flex items-center gap-1 cursor-pointer transition-all hover:ring-1 hover:ring-purple-400 ${
                            item.type === 'published' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : item.type === 'scheduled' ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                            : item.type === 'expiring' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                          title={`Click to view announcement: ${item.a.title}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TYPE_DOT[item.type] || 'bg-gray-400'}`} />
                          <span className="break-words font-semibold">{item.a.title}</span>
                        </div>
                      ))}
                      {itemsOnDay.length > 2 && (
                        <span className="text-[9px] font-bold text-gray-400 pl-1 block">+{itemsOnDay.length - 2} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Side Panel: Announcements for Selected Date or Tab */}
      <div
        style={calendarHeight ? { height: `${calendarHeight}px` } : undefined}
        className="glass-card p-4 sm:p-5 w-full lg:w-[380px] flex-shrink-0 flex flex-col shadow-sm max-lg:max-h-[500px]"
      >
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm sm:text-base">
                {selectedDay
                  ? format(new Date(year, month, selectedDay), 'dd MMM yyyy')
                  : `${activeTabData?.label || 'All'} Announcements`}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {displayItems.length}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {selectedDay
                ? 'Announcements active on this date'
                : 'Click any date on the calendar to filter, or inspect below.'}
            </p>
          </div>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              title="Show all tab announcements"
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        {displayItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No announcements found</p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedDay ? 'No announcements on this specific day.' : 'No announcements in this category.'}
            </p>
          </div>
        ) : (
          <div
            ref={listRef}
            className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0 overscroll-contain"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#a78bfa #f3f4f6' }}
          >
            {displayItems.map((item, idx) => {
              const a = item.a

              return (
                <div
                  key={a.id || idx}
                  onClick={() => handleOpenAnnouncement(a)}
                  title="Click to view full announcement details (same as list view)"
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white/60 dark:bg-gray-800/40 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className={`w-2 h-2 rounded-full inline-block ${TYPE_DOT[item.type] || 'bg-gray-400'}`} />
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {TYPE_LABEL[item.type] || item.type}
                      </span>
                      {a.status && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          a.status === 'PUBLISHED' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : a.status === 'SCHEDULED' ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {String(a.status).replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {a.isPinned && <Pin size={12} className="text-purple-500 flex-shrink-0" />}
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                    {a.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                    {a.body}
                  </p>

                  <div className="flex gap-1 flex-wrap mt-2.5">
                    {a.category && a.category !== 'GENERAL' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
                        {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
                      </span>
                    )}
                    <TargetAudienceBadges a={a} batches={batches} courses={courses} />
                    {a.requiresAcknowledgment && <Badge color="red">Ack Required</Badge>}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenAnnouncement(a); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-3 py-1.5 rounded-xl transition-all"
                      title="View full announcement details (same as list view)"
                    >
                      <Eye size={13} /> View Announcement
                    </button>

                    <div className="flex items-center gap-1">
                      {onPublish && (a.status === 'DRAFT' || a.status === 'SCHEDULED') && (
                        <IconButton
                          title="Publish Now"
                          onClick={(e) => { e.stopPropagation(); onPublish(a.id); }}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        >
                          <Send size={12} />
                        </IconButton>
                      )}
                      {onSubmitForApproval && a.status === 'DRAFT' && (
                        <IconButton
                          title="Submit for Approval"
                          onClick={(e) => { e.stopPropagation(); onSubmitForApproval(a.id); }}
                          className="bg-sky-50 text-sky-600 hover:bg-sky-100"
                        >
                          <Upload size={12} />
                        </IconButton>
                      )}
                      {onApprove && a.status === 'PENDING_APPROVAL' && (
                        <IconButton
                          title="Approve"
                          onClick={(e) => { e.stopPropagation(); onApprove(a.id); }}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        >
                          <Check size={12} />
                        </IconButton>
                      )}
                      {onReject && a.status === 'PENDING_APPROVAL' && (
                        <IconButton
                          title="Reject"
                          onClick={(e) => { e.stopPropagation(); onReject(a.id); }}
                          className="bg-amber-50 text-amber-600 hover:bg-amber-100"
                        >
                          <XIcon size={12} />
                        </IconButton>
                      )}
                      {onEdit && (
                        <IconButton
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                          className="bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <Pencil size={12} />
                        </IconButton>
                      )}
                      {onDelete && (
                        <IconButton
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
                          className="bg-red-50 text-red-500 hover:bg-red-100"
                        >
                          <Trash2 size={12} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {localModalAnnouncement && (
        <ViewAnnouncementModal
          a={localModalAnnouncement}
          batches={batches}
          courses={courses}
          assignments={assignments}
          onClose={() => setLocalModalAnnouncement(null)}
          onPreviewAttachment={onPreviewAttachment}
        />
      )}
    </div>
  )
}
