'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import {
  Pin, Trash2, Pencil, Plus, Send, Copy, ArrowLeft,
  BarChart3, History, CalendarDays, Check, X as XIcon, Paperclip,
  ChevronLeft, ChevronRight, Eye, Megaphone, FileText, Sparkles,
  Users, Calendar, Clock, Bookmark, Info, ChevronDown, Upload,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi, resolveFileUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import assignmentService from '@/services/assignmentService'
import DateTimePicker from '@/components/ui/DateTimePicker'
import CustomSelect from '@/components/ui/CustomSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { useConfirmModal } from '@/components/ui/ConfirmModal'

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

function formatSafe(val, fmtStr) {
  if (!val) return null
  try {
    const d = typeof val === 'string' && val.length === 10 && !val.includes('T')
      ? new Date(val + 'T00:00:00')
      : new Date(val)
    return isNaN(d.getTime()) ? null : format(d, fmtStr)
  } catch {
    return null
  }
}

const emptyForm = {
  title: '', body: '',
  batchId: '', courseId: '',
  isPinned: false, expiresAt: '', category: 'GENERAL', priority: 'NORMAL',
  requiresAcknowledgment: false, allowComments: false,
  scheduledAt: '',
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
    batchId: form.batchId || null,
    isPinned: form.isPinned,
    expiresAt: form.expiresAt || null,
    category: form.category,
    status,
    priority: form.priority,
    scheduledAt: status === 'SCHEDULED' && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    requiresAcknowledgment: form.requiresAcknowledgment,
    allowComments: form.allowComments,
    actionType: null,
    actionReferenceId: null,
    actionLabel: null,
    actionUrl: null,
    collegeId: null,
    courseId: form.courseId || null,
    audienceRuleType: 'NONE',
    audienceRuleValue: null,
    audienceRuleReferenceId: null,
  })

  const handleSave = async (e, status) => {
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
    if (status === 'SCHEDULED') {
      if (!form.scheduledAt) {
        toast.error('Pick a schedule date/time first')
        return
      }
      const scheduledDate = new Date(form.scheduledAt)
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }
    if (status === 'PUBLISHED' && form.scheduledAt) {
      const scheduledDate = new Date(form.scheduledAt)
      if (!isNaN(scheduledDate.getTime()) && scheduledDate > new Date()) {
        const confirmed = await ask({
          title: 'Publish Now Instead?',
          message: `You have set a schedule time (${format(scheduledDate, 'MMM d, yyyy h:mm a')}), but "Publish" will send the announcement immediately. Do you want to publish now?`,
          confirmLabel: 'Publish Now',
          tone: 'warning',
        })
        if (!confirmed) return
      }
    }
    if (form.expiresAt) {
      const publishDate = (status === 'SCHEDULED' && form.scheduledAt)
        ? form.scheduledAt.split('T')[0]
        : getTodayString()
      if (form.expiresAt <= publishDate) {
        toast.error(
          (status === 'SCHEDULED' && form.scheduledAt)
            ? `Expiry date must be after the scheduled publishing date (${publishDate})`
            : `Expiry date must be after the published date (tomorrow or later)`
        )
        return
      }
    }
    setSaving(true)
    try {
      const payload = buildPayload(status)
      if (editId) {
        await adminApi.updateAnnouncement(editId, payload)
        toast.success('Updated')
      } else {
        await adminApi.createAnnouncement(payload)
        toast.success(
          status === 'DRAFT' ? 'Saved as draft'
            : status === 'SCHEDULED' ? 'Scheduled'
            : status === 'PENDING_APPROVAL' ? 'Submitted for approval'
            : 'Announcement sent!'
        )
      }
      setFormOpen(false)
      setEditId(null)
      setForm(emptyForm)
      load()
    } catch (err) { toast.error(err?.message || 'Failed') } finally { setSaving(false) }
  }

  const handlePublish = async (id) => {
    try { await adminApi.publishAnnouncement(id); toast.success('Published'); load() }
    catch (err) { toast.error(err?.message || 'Failed to publish') }
  }
  const handleApprove = async (id) => {
    try { await adminApi.approveAnnouncement(id); toast.success('Approved'); load() }
    catch (err) { toast.error(err?.message || 'Failed to approve') }
  }
  const handleReject = async (id) => {
    try { await adminApi.rejectAnnouncement(id); toast.success('Rejected back to draft'); load() }
    catch (err) { toast.error(err?.message || 'Failed to reject') }
  }
  const handleDuplicate = async (id) => {
    try { await adminApi.duplicateAnnouncement(id); toast.success('Duplicated as draft'); load() }
    catch (err) { toast.error(err?.message || 'Failed to duplicate') }
  }
  const handleSubmitForApproval = async (id) => {
    try { await adminApi.submitAnnouncementForApproval(id); toast.success('Submitted for approval'); load() }
    catch (err) { toast.error(err?.message || 'Failed to submit for approval') }
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
    } catch {
      toast.error('Failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (a) => {
    setEditId(a.id)
    setForm({
      title: a.title, body: a.body,
      batchId: a.batchId || '', courseId: a.courseId || '',
      isPinned: a.isPinned, expiresAt: a.expiresAt ? a.expiresAt.split('T')[0] : '',
      category: a.category || 'GENERAL', priority: a.priority || 'NORMAL',
      requiresAcknowledgment: !!a.requiresAcknowledgment, allowComments: !!a.allowComments,
      scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : '',
    })
    setFormOpen(true)
  }

  const sortPinnedFirst = (list) => [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  const sections = [
    { key: 'ALL', label: 'All', color: 'text-purple-600', items: sortPinnedFirst(announcements), emptyText: 'No announcements yet.' },
    { key: 'PUBLISHED', label: 'Published', color: 'text-emerald-600', items: sortPinnedFirst(announcements.filter(a => a.status === 'PUBLISHED')), emptyText: 'No published announcements yet.' },
    { key: 'DRAFT', label: 'Drafts', color: 'text-gray-500', items: sortPinnedFirst(announcements.filter(a => a.status === 'DRAFT')), emptyText: 'No drafts yet.' },
    { key: 'SCHEDULED', label: 'Scheduled', color: 'text-sky-600', items: sortPinnedFirst(announcements.filter(a => a.status === 'SCHEDULED')), emptyText: 'Nothing scheduled yet.' },
  ]
  const otherItems = sortPinnedFirst(announcements.filter(a => !['PUBLISHED', 'DRAFT', 'SCHEDULED'].includes(a.status)))
  if (otherItems.length > 0) {
    sections.push({ key: 'OTHER', label: 'Other', color: 'text-amber-600', items: otherItems, emptyText: '' })
  }
  const activeTabData = sections.find(s => s.key === activeSection) || sections[0]

  // Every admin announcement endpoint - edit, delete, publish, approve, reject, duplicate,
  // analytics, history - requires ADMIN or SUPERADMIN on the backend (AdminAnnouncementController
  // is class-level @PreAuthorize'd). A TRAINER can view this page but every one of those calls
  // would 403, so only wire the handlers in for roles that can actually use them - TRAINER gets
  // a read-only list instead of buttons that always fail.
  const cardProps = {
    batches, courses, assignments,
    onView: setViewingAnnouncement,
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
            <button onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 border border-gray-200 text-gray-600 dark:text-gray-300 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CalendarDays size={14} /> {view === 'list' ? 'Calendar' : 'List'}
            </button>
            {canCreate && (
              <button onClick={() => { setFormOpen(true); setEditId(null); setForm(emptyForm) }}
                className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-md shadow-purple-500/20 active:scale-95 transition-all">
                <Plus size={16} />
                Create Announcement
              </button>
            )}
          </div>
        )}
      </div>

      {formOpen ? (
        <AnnouncementForm
          form={form} setForm={setForm} editId={editId} saving={saving} onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditId(null) }}
          batches={batches} courses={courses} assignments={assignments}
        />
      ) : (
        <>
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1 -mx-1 px-1">
            {sections.map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0 ${activeSection === s.key ? `border-current ${s.color}` : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {s.label} ({s.items.length})
              </button>
            ))}
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
              {...(canCreate ? {
                onEdit: handleEdit,
                onDelete: handleDelete,
                onDetails: setDetailsFor,
                onPublish: handlePublish,
                onApprove: handleApprove,
                onReject: handleReject,
                onDuplicate: handleDuplicate,
                onSubmitForApproval: handleSubmitForApproval,
              } : {})}
            />
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 glass-card animate-pulse" />)}
            </div>
          ) : (
            <AnnouncementSection title={activeTabData.label} color={activeTabData.color} items={activeTabData.items}
              emptyText={activeTabData.emptyText} cardProps={cardProps} hideTitle />
          )}
        </>
      )}


      {detailsFor && (
        <DetailsModal announcementId={detailsFor.id} initialTab={detailsFor.tab} onClose={() => setDetailsFor(null)} />
      )}

      {viewingAnnouncement && (
        <ViewAnnouncementModal a={viewingAnnouncement} batches={batches}
          courses={courses} assignments={assignments} onClose={() => setViewingAnnouncement(null)} />
      )}

      <DeleteConfirmModal
        isOpen={!!deletingAnnouncement}
        onClose={() => { if (!deleting) setDeletingAnnouncement(null) }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete Announcement?"
        itemName={deletingAnnouncement?.title}
      />

      {confirmModal}
    </div>
  )
}

const PLACEHOLDER_TOKENS = ['{{studentName}}', '{{batchName}}', '{{courseName}}', '{{attendancePercentage}}', '{{date}}']

function AnnouncementForm({ form, setForm, editId, saving, onSave, onCancel, batches, courses, assignments = [] }) {
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const toggle = (key) => () => setForm(f => ({ ...f, [key]: !f[key] }))
  const bodyRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [audienceCount, setAudienceCount] = useState(null)

  const todayStr = getTodayString()
  const publishDate = form.scheduledAt ? form.scheduledAt.split('T')[0] : todayStr
  const minExpiryDate = getDayAfter(publishDate)
  const isExpiryInvalid = !!(form.expiresAt && form.expiresAt <= publishDate)

  const usesPlaceholders = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(`${form.title} ${form.body}`)

  useEffect(() => {
    if (!usesPlaceholders) { setPreview(null); return }
    const timer = setTimeout(() => {
      adminApi.previewAnnouncementPlaceholders(form.title, form.body, form.courseId, form.batchId)
        .then(r => setPreview(r.data.data))
        .catch(() => setPreview(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.title, form.body, form.courseId, form.batchId, usesPlaceholders])

  useEffect(() => {
    const timer = setTimeout(() => {
      adminApi.getAnnouncementAudienceCount({
        batchId: form.batchId || null,
        collegeId: null,
        courseId: form.courseId || null,
        audienceRuleType: 'NONE',
        audienceRuleValue: null,
        audienceRuleReferenceId: null,
      })
        .then(r => setAudienceCount(r.data.data?.count ?? null))
        .catch(() => setAudienceCount(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.batchId, form.courseId])

  const insertPlaceholder = (token) => {
    const el = bodyRef.current
    const start = el ? (el.selectionStart ?? form.body.length) : form.body.length
    const end = el ? (el.selectionEnd ?? form.body.length) : form.body.length
    const newBody = form.body.slice(0, start) + token + form.body.slice(end)
    setForm(f => ({ ...f, body: newBody }))
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

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
              placeholder="e.g. Campus Placement Drive: TechCorp Registration Open"
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
              placeholder="Write your announcement details here. You can click any token below to personalize the message per student..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 p-4 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all shadow-2xs leading-relaxed"
            />

            {/* Token helper bar */}
            <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 mt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Personalization Tokens</span>
                <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">(click to insert at cursor position)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDER_TOKENS.map(token => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertPlaceholder(token)}
                    title={`Insert ${token}`}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-medium bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/80 rounded-lg px-2.5 py-1 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300 transition-all shadow-2xs active:scale-95"
                  >
                    <Plus size={10} className="text-purple-500" /> {token}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            {usesPlaceholders && (
              <div className="mt-3 border-l-4 border-l-purple-500 border border-purple-200/80 dark:border-purple-800/60 rounded-xl p-4 bg-gradient-to-r from-purple-50/60 to-violet-50/40 dark:from-purple-950/30 dark:to-violet-950/20 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Eye size={14} className="text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wide">
                      Live Student Preview (Sample Profile)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                    Auto-Resolved
                  </span>
                </div>
                {preview ? (
                  <div className="space-y-1 bg-white/80 dark:bg-gray-900/80 p-3 rounded-lg border border-purple-100 dark:border-purple-900/40">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{preview.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{preview.body || 'No message content'}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Generating preview with student data...</p>
                )}
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <Info size={11} className="text-purple-500 flex-shrink-0" />
                  Real students will see tokens dynamically replaced with their own name, batch, course, and attendance rate.
                </p>
              </div>
            )}
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Select which cohorts or courses should receive this notice</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
              Default: Broadcast to Everyone
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Batch"
              value={form.batchId}
              onChange={(val) => setForm(f => ({ ...f, batchId: val }))}
              options={batches.map(b => [b.id, b.name])}
              allLabel="All Batches (Anyone in any batch)"
            />
            <Select
              label="Target Course"
              value={form.courseId}
              onChange={(val) => setForm(f => ({ ...f, courseId: val }))}
              options={courses.map(c => [c.id, c.title])}
              allLabel="All Courses (Anyone in any course)"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Estimated Recipients: {audienceCount !== null ? `${audienceCount} student(s)` : 'Calculating...'}
                </span>
                <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                  Confirmed for all students matching the selected criteria.
                </p>
              </div>
            </div>
            {form.batchId && form.courseId && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/40 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                Intersection Filter Active
              </span>
            )}
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Specify notice type, expiration date, and automated scheduling</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Category <span className="text-purple-600">*</span>
              </label>
              <CustomSelect
                  value={form.category}
                  onChange={(val) => setForm(f => ({ ...f, category: val }))}
                  options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))}
                  clearable={false}
                />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Expires On (Optional)
                </label>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  Must be after {form.scheduledAt ? 'scheduled date' : 'published date'}
                </span>
              </div>
              <input
                type="date"
                min={minExpiryDate}
                value={form.expiresAt}
                onChange={set('expiresAt')}
                className={`w-full h-11 px-3.5 rounded-xl border ${
                  isExpiryInvalid
                    ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-purple-500/20'
                } bg-white dark:bg-gray-800 text-sm font-medium outline-none focus:ring-2 text-gray-800 dark:text-gray-200 shadow-2xs transition-all`}
              />
              {isExpiryInvalid ? (
                <p className="text-[11px] text-rose-500 font-medium mt-1">
                  Expiry date must be after the published date ({publishDate}). Minimum: {minExpiryDate}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave blank for no expiration. If set, must be after {publishDate}.
                </p>
              )}
            </div>
          </div>

          {/* Schedule for Later & Pin to Top */}
          <div className="pt-3.5 border-t border-gray-200/60 dark:border-gray-700/60 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={14} className="text-sky-500" />
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Schedule for Automated Publishing (Optional)
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">
                Leave blank to publish immediately, or choose a future date & time for hands-free publishing.
              </p>
              <div className="w-full min-w-0">
                <DateTimePicker
                  disablePast
                  minDate={new Date().toISOString().split('T')[0]}
                  value={form.scheduledAt}
                  onChange={val => setForm(f => ({ ...f, scheduledAt: val }))}
                />
              </div>
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

        {/* Form Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={e => onSave(e, 'DRAFT')}
              className="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Bookmark size={14} /> Save as Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={e => onSave(e, 'SCHEDULED')}
              className="px-4 py-2.5 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/20 text-sm font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Clock size={14} /> Schedule
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={e => onSave(e, 'PUBLISHED')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2 active:scale-98"
            >
              <Send size={14} />
              {saving ? 'Publishing...' : (editId ? 'Update & Publish' : 'Publish Announcement')}
            </button>
          </div>
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

function AnnouncementSection({ title, color, items, emptyText, cardProps, hideTitle }) {
  return (
    <div className="space-y-3">
      {!hideTitle && <p className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title} ({items.length})</p>}
      {items.length === 0 ? (
        emptyText && <p className="text-sm text-gray-400 glass-card p-6 text-center">{emptyText}</p>
      ) : (
        items.map(a => <AnnouncementCard key={a.id} a={a} {...cardProps} />)
      )}
    </div>
  )
}

function AnnouncementCard({ a, batches, courses, assignments = [], onEdit, onDelete, onPublish, onApprove, onReject, onDuplicate, onSubmitForApproval, onDetails, onView }) {
  const batch = batches.find(b => b.id === a.batchId)
  const course = courses.find(c => c.id === a.courseId)
  const isDraft = a.status === 'DRAFT'
  const isScheduled = a.status === 'SCHEDULED'
  const isPending = a.status === 'PENDING_APPROVAL'
  const todayStr = getTodayString()
  const isPastExpiry = !!(a.expiresAt && a.expiresAt < todayStr)
  const isExpired = a.status === 'EXPIRED' || isPastExpiry
  const usesPlaceholders = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(`${a.title} ${a.body}`)

  return (
    <div className={`glass-card p-5 ${a.isPinned ? 'border-purple-300 dark:border-purple-700' : ''} ${isDraft || isExpired ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(a)} title="Click to view details">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            {batch ? <Badge color="purple">{batch.name}</Badge> : <Badge color="blue">All Students</Badge>}
            {course && <Badge color="cyan">{course.title}</Badge>}
            {a.requiresAcknowledgment && <Badge color="red">Ack Required</Badge>}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{a.body}</p>
          {usesPlaceholders && (
            <p className="text-[10px] text-purple-400 mt-1 italic">Contains placeholders — each student sees this resolved with their own name, batch, course and attendance.</p>
          )}
          {a.actionLabel && (
            <span className="inline-block mt-2 text-xs font-semibold text-purple-600 border border-purple-200 rounded-lg px-2 py-1">
              {a.actionLabel}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            {a.expiresAt && (
              <span className={`flex items-center gap-1 font-medium ${isExpired ? 'text-rose-500 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                <Calendar size={12} className="flex-shrink-0" />
                {isExpired ? `Expired on ${formatSafe(a.expiresAt, 'dd MMM yyyy')}` : `Expires on ${formatSafe(a.expiresAt, 'dd MMM yyyy')}`}
              </span>
            )}
          </div>
          {isScheduled && a.scheduledAt && <p className="text-[10px] text-sky-500 mt-0.5">Scheduled for {format(new Date(a.scheduledAt), 'dd MMM yyyy, HH:mm')}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80 sm:justify-end flex-wrap">
          {onDetails && (
            <IconButton title="Analytics & History" onClick={() => onDetails({ id: a.id, tab: 'analytics' })} className="bg-gray-100 text-gray-500 hover:bg-gray-200">
              <BarChart3 size={13} />
            </IconButton>
          )}
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
          {onDuplicate && (
            <IconButton title="Duplicate" onClick={() => onDuplicate(a.id)} className="bg-gray-100 text-gray-500 hover:bg-gray-200">
              <Copy size={13} />
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

function ViewAnnouncementModal({ a, batches = [], courses = [], assignments = [], onClose }) {
  if (!a) return null

  const batch = (batches || []).find(b => b && a && String(b.id) === String(a.batchId))
  const course = (courses || []).find(c => c && a && String(c.id) === String(a.courseId))

  const createdStr = formatSafe(a.createdAt, 'dd MMM yyyy, HH:mm')
  const scheduledStr = formatSafe(a.scheduledAt, 'dd MMM yyyy, HH:mm')
  const expiresStr = formatSafe(a.expiresAt, 'dd MMM yyyy')
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
          {batch ? <Badge color="purple">{batch.name}</Badge> : <Badge color="blue">All Students</Badge>}
          {course && <Badge color="cyan">{course.title}</Badge>}
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
            <a href={resolveFileUrl(a.attachmentUrl)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5 hover:bg-sky-100 transition-colors">
              <Paperclip size={14} />
              <span>{a.attachmentName || 'Download Attachment'}</span>
            </a>
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
              const batch = (batches || []).find(b => b && a && String(b.id) === String(a.batchId))
              const course = (courses || []).find(c => c && a && String(c.id) === String(a.courseId))

              return (
                <div
                  key={a.id || idx}
                  onClick={() => handleOpenAnnouncement(a)}
                  title="Click to view full announcement details (same as list view)"
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white/60 dark:bg-gray-800/40 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                    {batch ? <Badge color="purple">{batch.name}</Badge> : <Badge color="blue">All Students</Badge>}
                    {course && <Badge color="cyan">{course.title}</Badge>}
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
                      {onDetails && (
                        <IconButton
                          title="Analytics & History"
                          onClick={(e) => { e.stopPropagation(); onDetails({ id: a.id, tab: 'analytics' }); }}
                          className="bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <BarChart3 size={12} />
                        </IconButton>
                      )}
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
                      {onDuplicate && (
                        <IconButton
                          title="Duplicate"
                          onClick={(e) => { e.stopPropagation(); onDuplicate(a.id); }}
                          className="bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <Copy size={12} />
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
        />
      )}
    </div>
  )
}
