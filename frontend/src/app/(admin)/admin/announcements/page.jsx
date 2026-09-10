'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import {
  Pin, Trash2, Pencil, Plus, Send, Copy, ArrowLeft,
  BarChart3, History, MessageSquare, CalendarDays, Check, X as XIcon, Paperclip,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi, resolveFileUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import assignmentService from '@/services/assignmentService'
import DateTimePicker12h from '@/components/ui/DateTimePicker12h'

const CATEGORIES = ['GENERAL', 'URGENT', 'PLACEMENT', 'EXAM', 'HOLIDAY', 'ATTENDANCE']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
const AUDIENCE_RULES = ['NONE', 'ATTENDANCE_BELOW', 'ASSIGNMENT_NOT_SUBMITTED', 'PLACEMENT_ELIGIBLE']

const CATEGORY_STYLES = {
  GENERAL:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  URGENT:     'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
  PLACEMENT:  'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
  EXAM:       'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40',
  HOLIDAY:    'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40',
  ATTENDANCE: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40',
}

const PRIORITY_STYLES = {
  LOW:      'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  NORMAL:   'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  HIGH:     'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40',
  CRITICAL: 'bg-red-600 dark:bg-red-700 text-white shadow-sm',
}

const emptyForm = {
  title: '', body: '',
  batchId: '', courseId: '',
  isPinned: false, expiresAt: '', category: 'GENERAL', priority: 'NORMAL',
  requiresAcknowledgment: false, allowComments: false,
  audienceRuleType: 'NONE', audienceRuleValue: '', audienceRuleReferenceId: '',
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
  const [detailsFor, setDetailsFor] = useState(null) // { id, tab: 'analytics'|'history'|'comments' }
  const [activeSection, setActiveSection] = useState('PUBLISHED')
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)

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
    audienceRuleType: form.audienceRuleType || 'NONE',
    audienceRuleValue: form.audienceRuleValue !== '' ? Number(form.audienceRuleValue) : null,
    audienceRuleReferenceId: form.audienceRuleReferenceId !== '' ? Number(form.audienceRuleReferenceId) : null,
  })

  const handleSave = async (e, status) => {
    e.preventDefault()
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
  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try { await adminApi.deleteAnnouncement(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const handleEdit = (a) => {
    setEditId(a.id)
    setForm({
      title: a.title, body: a.body,
      batchId: a.batchId || '', courseId: a.courseId || '',
      isPinned: a.isPinned, expiresAt: a.expiresAt ? a.expiresAt.split('T')[0] : '',
      category: a.category || 'GENERAL', priority: a.priority || 'NORMAL',
      requiresAcknowledgment: !!a.requiresAcknowledgment, allowComments: !!a.allowComments,
      audienceRuleType: a.audienceRuleType || 'NONE', audienceRuleValue: a.audienceRuleValue ?? '', audienceRuleReferenceId: a.audienceRuleReferenceId ?? '',
      scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : '',
    })
    setFormOpen(true)
  }

  const sortPinnedFirst = (list) => [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  const sections = [
    { key: 'PUBLISHED', label: 'Published', color: 'text-emerald-600', items: sortPinnedFirst(announcements.filter(a => a.status === 'PUBLISHED')), emptyText: 'No published announcements yet.' },
    { key: 'DRAFT', label: 'Drafts', color: 'text-gray-500', items: sortPinnedFirst(announcements.filter(a => a.status === 'DRAFT')), emptyText: 'No drafts yet.' },
    { key: 'SCHEDULED', label: 'Scheduled', color: 'text-sky-600', items: sortPinnedFirst(announcements.filter(a => a.status === 'SCHEDULED')), emptyText: 'Nothing scheduled yet.' },
  ]
  const otherItems = sortPinnedFirst(announcements.filter(a => !['PUBLISHED', 'DRAFT', 'SCHEDULED'].includes(a.status)))
  if (otherItems.length > 0) {
    sections.push({ key: 'OTHER', label: 'Other', color: 'text-amber-600', items: otherItems, emptyText: '' })
  }
  const activeTabData = sections.find(s => s.key === activeSection) || sections[0]

  const cardProps = { batches, courses, assignments, onEdit: handleEdit, onDelete: handleDelete,
    onPublish: handlePublish, onApprove: handleApprove, onReject: handleReject, onDuplicate: handleDuplicate,
    onDetails: setDetailsFor, onView: setViewingAnnouncement }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Announcements</h1>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 border border-gray-200 text-gray-600 dark:text-gray-300 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CalendarDays size={14} /> {view === 'list' ? 'Calendar' : 'List'}
          </button>
          {canCreate && (
            <button onClick={() => { setFormOpen(f => !f); setEditId(null); setForm(emptyForm) }}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-md shadow-purple-500/20 active:scale-95 transition-all">
              <Plus size={16} />
              {formOpen ? 'Close' : 'Create Announcement'}
            </button>
          )}
        </div>
      </div>

      {formOpen ? (
        <AnnouncementForm
          form={form} setForm={setForm} editId={editId} saving={saving} onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditId(null) }}
          batches={batches} courses={courses} assignments={assignments}
        />
      ) : (
        <>
          {view !== 'calendar' && (
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1 -mx-1 px-1">
              {sections.map(s => (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0 ${activeSection === s.key ? `border-current ${s.color}` : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {s.label} ({s.items.length})
                </button>
              ))}
            </div>
          )}

          {view === 'calendar' ? (
            <CalendarView announcements={announcements} />
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

  const usesPlaceholders = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(`${form.title} ${form.body}`)

  const filteredAssignments = assignments.filter(asg => {
    if (form.batchId && asg.batch?.id && asg.batch.id !== Number(form.batchId)) return false
    if (form.courseId && asg.course?.id && asg.course.id !== Number(form.courseId)) return false
    return true
  })

  useEffect(() => {
    if (!usesPlaceholders) { setPreview(null); return }
    const timer = setTimeout(() => {
      adminApi.previewAnnouncementPlaceholders(form.title, form.body)
        .then(r => setPreview(r.data.data))
        .catch(() => setPreview(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.title, form.body, usesPlaceholders])

  useEffect(() => {
    const timer = setTimeout(() => {
      adminApi.getAnnouncementAudienceCount({
        batchId: form.batchId || null,
        collegeId: null,
        courseId: form.courseId || null,
        audienceRuleType: form.audienceRuleType || 'NONE',
        audienceRuleValue: form.audienceRuleValue !== '' ? Number(form.audienceRuleValue) : null,
        audienceRuleReferenceId: form.audienceRuleReferenceId !== '' ? Number(form.audienceRuleReferenceId) : null,
      })
        .then(r => setAudienceCount(r.data.data?.count ?? null))
        .catch(() => setAudienceCount(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.batchId, form.courseId, form.audienceRuleType, form.audienceRuleValue, form.audienceRuleReferenceId])

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
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <h3 className="font-display font-bold text-gray-800 dark:text-white">{editId ? 'Edit Announcement' : 'New Announcement'}</h3>
        </div>
      </div>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
          <input value={form.title} onChange={set('title')} placeholder="Important Update" required
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Message *</label>
          <textarea ref={bodyRef} value={form.body} onChange={set('body')} rows={4} required
            placeholder="Use {{studentName}}, {{batchName}}, {{courseName}}, {{attendancePercentage}}, {{date}} for personalization"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-800 dark:text-gray-200" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PLACEHOLDER_TOKENS.map(token => (
              <button key={token} type="button" onClick={() => insertPlaceholder(token)}
                className="text-[11px] font-mono font-semibold bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2.5 py-1 hover:bg-purple-100">
                {token}
              </button>
            ))}
          </div>
          {usesPlaceholders && (
            <div className="mt-3 border border-purple-200 dark:border-purple-800 rounded-xl p-3 bg-purple-50/50 dark:bg-purple-900/10">
              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Preview (with sample student data)</p>
              {preview ? (
                <>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{preview.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{preview.body}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">Resolving...</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">Each real student sees their own name, batch, course and attendance in place of these tokens.</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audience Targeting</p>
            <span className="text-[11px] text-gray-400 font-normal">Leave as &quot;All&quot; to target everyone, or filter by Batch and Course</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Select label="Batch" value={form.batchId} onChange={set('batchId')} options={batches.map(b => [b.id, b.name])} allLabel="All Batches (Anyone in any batch)" />
            <Select label="Course" value={form.courseId} onChange={set('courseId')} options={courses.map(c => [c.id, c.title])} allLabel="All Courses (Anyone in any course)" />
          </div>
          <p className="text-[11px] text-purple-600/90 dark:text-purple-400/90 mt-1.5 italic">
            * Note: If both Batch and Course are selected, only students who belong to that Batch <u>and</u> are enrolled in that Course will receive this announcement.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Data-based rule</label>
            <select value={form.audienceRuleType} onChange={set('audienceRuleType')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200">
              {AUDIENCE_RULES.map(r => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          {form.audienceRuleType === 'ATTENDANCE_BELOW' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Threshold %</label>
              <input type="number" min="0" max="100" value={form.audienceRuleValue} onChange={set('audienceRuleValue')}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
            </div>
          )}
          {form.audienceRuleType === 'ASSIGNMENT_NOT_SUBMITTED' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Select Assignment <span className="text-xs text-gray-400 font-normal">(targets students who have NOT submitted)</span>
              </label>
              <select
                value={form.audienceRuleReferenceId}
                onChange={set('audienceRuleReferenceId')}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200"
              >
                <option value="">-- Choose an Assignment ({filteredAssignments.length} available) --</option>
                {filteredAssignments.map(asg => (
                  <option key={asg.id} value={asg.id}>
                    {asg.title} {asg.batch?.name ? `· Batch: ${asg.batch.name}` : asg.course?.title ? `· Course: ${asg.course.title}` : ''}
                  </option>
                ))}
              </select>
              {filteredAssignments.length === 0 && (
                <p className="text-[11px] text-amber-500 mt-1">No assignments found for the chosen Batch / Course.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {audienceCount !== null ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Estimated recipients: {audienceCount} student(s)</span>
          ) : (
            <span className="text-gray-400">Estimating audience...</span>
          )}
          <span className="text-gray-400">— confirmed for ALL targeted students, regardless of who is logged in</span>
        </div>

        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select value={form.category} onChange={set('category')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select value={form.priority} onChange={set('priority')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Expires (optional)</label>
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.expiresAt} onChange={set('expiresAt')}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
          </div>
        </div>

        {/* Dedicated spacious row for Schedule for so Date and Time are never squished */}
        <div className="pt-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Schedule for (optional)</label>
          <div className="w-full max-w-md">
            <DateTimePicker12h
              disablePast
              minDate={new Date().toISOString().split('T')[0]}
              value={form.scheduledAt}
              onChange={val => setForm(f => ({ ...f, scheduledAt: val }))}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Leave blank to publish immediately, or choose a future date & time to auto-publish.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <ToggleField label="Pin to top" checked={form.isPinned} onClick={toggle('isPinned')} />
          <ToggleField label="Requires Acknowledgment" checked={form.requiresAcknowledgment} onClick={toggle('requiresAcknowledgment')} />
          <ToggleField label="Allow Comments" checked={form.allowComments} onClick={toggle('allowComments')} />
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3 pt-2">
          <button type="button" onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center justify-center gap-1.5 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex flex-col sm:flex-row flex-1 gap-2.5 sm:gap-3 sm:justify-end">
            <button type="button" disabled={saving} onClick={e => onSave(e, 'DRAFT')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 text-sm font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 disabled:opacity-60 transition-colors">
              Save as Draft
            </button>
            <button type="button" disabled={saving} onClick={e => onSave(e, 'SCHEDULED')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-sky-300 dark:border-sky-700 text-sm font-semibold text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 disabled:opacity-60 transition-colors">
              Schedule
            </button>
            <button type="button" disabled={saving} onClick={e => onSave(e, 'PUBLISHED')}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60 shadow-sm hover:shadow transition-all">
              {saving ? 'Saving...' : (editId ? 'Update & Publish' : 'Publish')}
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
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select value={value} onChange={onChange}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200">
        <option value="">{allLabel}</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </div>
  )
}

function ToggleField({ label, checked, onClick }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-gray-200'}`} onClick={onClick}>
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow" style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
    </label>
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

function AnnouncementCard({ a, batches, courses, assignments = [], onEdit, onDelete, onPublish, onApprove, onReject, onDuplicate, onDetails, onView }) {
  const batch = batches.find(b => b.id === a.batchId)
  const course = courses.find(c => c.id === a.courseId)
  const targetAssignment = a.audienceRuleType === 'ASSIGNMENT_NOT_SUBMITTED' && a.audienceRuleReferenceId
    ? assignments.find(asg => asg.id === Number(a.audienceRuleReferenceId))
    : null
  const isDraft = a.status === 'DRAFT'
  const isScheduled = a.status === 'SCHEDULED'
  const isPending = a.status === 'PENDING_APPROVAL'
  const isExpired = a.status === 'EXPIRED'
  const usesPlaceholders = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(`${a.title} ${a.body}`)

  return (
    <div className={`glass-card p-5 ${a.isPinned ? 'border-purple-300 dark:border-purple-700' : ''} ${isDraft || isExpired ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(a)} title="Click to view details">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {a.isPinned && <Pin size={12} className="text-purple-500 flex-shrink-0" />}
            <h3 className="font-display font-bold text-gray-800 dark:text-white">{a.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.NORMAL}`}>{a.priority}</span>
            {(isDraft || isScheduled || isPending || isExpired) && (
              <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{a.status.replaceAll('_', ' ')}</span>
            )}
            {a.category && a.category !== 'GENERAL' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
                {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
              </span>
            )}
            {batch ? <Badge color="purple">{batch.name}</Badge> : <Badge color="blue">All Students</Badge>}
            {course && <Badge color="cyan">{course.title}</Badge>}
            {a.audienceRuleType && a.audienceRuleType !== 'NONE' && (
              <Badge color="amber">
                {a.audienceRuleType === 'ASSIGNMENT_NOT_SUBMITTED'
                  ? `Not Submitted: ${targetAssignment ? targetAssignment.title : `Assignment #${a.audienceRuleReferenceId}`}`
                  : a.audienceRuleType === 'ATTENDANCE_BELOW' && a.audienceRuleValue
                  ? `Attendance < ${a.audienceRuleValue}%`
                  : a.audienceRuleType.replaceAll('_', ' ')}
              </Badge>
            )}
            {a.requiresAcknowledgment && <Badge color="red">Ack Required</Badge>}
            {a.allowComments && <Badge color="gray">Comments On</Badge>}
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
          <p className="text-xs text-gray-400 mt-2">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
          {isScheduled && a.scheduledAt && <p className="text-[10px] text-sky-500 mt-0.5">Scheduled for {format(new Date(a.scheduledAt), 'dd MMM yyyy, HH:mm')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80 sm:justify-end w-full sm:w-auto">
          {isPending && (
            <>
              <IconButton title="Approve" onClick={() => onApprove(a.id)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check size={13} /></IconButton>
              <IconButton title="Reject" onClick={() => onReject(a.id)} className="bg-red-50 text-red-500 hover:bg-red-100"><XIcon size={13} /></IconButton>
            </>
          )}
          {(isDraft || isScheduled) && (
            <IconButton title="Publish Now" onClick={() => onPublish(a.id)} className="bg-purple-50 text-purple-600 hover:bg-purple-100"><Send size={13} /></IconButton>
          )}
          <IconButton title="Analytics" onClick={() => onDetails({ id: a.id, tab: 'analytics' })} className="bg-gray-100 text-gray-500 hover:bg-gray-200"><BarChart3 size={13} /></IconButton>
          <IconButton title="History" onClick={() => onDetails({ id: a.id, tab: 'history' })} className="bg-gray-100 text-gray-500 hover:bg-gray-200"><History size={13} /></IconButton>
          {a.allowComments && (
            <IconButton title="Comments" onClick={() => onDetails({ id: a.id, tab: 'comments' })} className="bg-gray-100 text-gray-500 hover:bg-gray-200"><MessageSquare size={13} /></IconButton>
          )}
          <IconButton title="Duplicate" onClick={() => onDuplicate(a.id)} className="bg-gray-100 text-gray-500 hover:bg-gray-200"><Copy size={13} /></IconButton>
          <IconButton title="Edit" onClick={() => onEdit(a)} className="bg-gray-100 text-gray-500 hover:bg-gray-200"><Pencil size={13} /></IconButton>
          <IconButton title="Delete" onClick={() => onDelete(a.id)} className="bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={13} /></IconButton>
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
  const [tab, setTab] = useState(initialTab)
  const [analytics, setAnalytics] = useState(null)
  const [history, setHistory] = useState(null)
  const [comments, setComments] = useState(null)

  useEffect(() => {
    if (tab === 'analytics' && !analytics) {
      adminApi.getAnnouncementAnalytics(announcementId).then(r => setAnalytics(r.data.data)).catch(() => setAnalytics({}))
    }
    if (tab === 'history' && !history) {
      adminApi.getAnnouncementHistory(announcementId).then(r => setHistory(r.data.data || [])).catch(() => setHistory([]))
    }
    if (tab === 'comments' && !comments) {
      adminApi.getAnnouncementComments(announcementId).then(r => setComments(r.data.data || [])).catch(() => setComments([]))
    }
  }, [tab, announcementId])

  return (
    <Modal title="Announcement Details" onClose={onClose}>
      <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {['analytics', 'history', 'comments'].map(t => (
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

      {tab === 'comments' && (
        comments ? (
          comments.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No comments yet.</p> : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.userName} <span className="text-gray-400 font-normal">({c.userRole})</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{c.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          )
        ) : <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
      )}
    </Modal>
  )
}

function ViewAnnouncementModal({ a, batches, courses, assignments = [], onClose }) {
  const batch = batches.find(b => b.id === a.batchId)
  const course = courses.find(c => c.id === a.courseId)
  const targetAssignment = a.audienceRuleType === 'ASSIGNMENT_NOT_SUBMITTED' && a.audienceRuleReferenceId
    ? assignments.find(asg => asg.id === Number(a.audienceRuleReferenceId))
    : null

  return (
    <Modal title="View Announcement" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {a.isPinned && <Pin size={12} className="text-purple-500" />}
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-lg">{a.title}</h3>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.NORMAL}`}>{a.priority}</span>
          <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{a.status.replaceAll('_', ' ')}</span>
          {a.category && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
              {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
            </span>
          )}
          {batch ? <Badge color="purple">{batch.name}</Badge> : <Badge color="blue">All Students</Badge>}
          {course && <Badge color="cyan">{course.title}</Badge>}
          {a.audienceRuleType && a.audienceRuleType !== 'NONE' && (
            <Badge color="amber">
              {a.audienceRuleType === 'ASSIGNMENT_NOT_SUBMITTED'
                ? `Not Submitted: ${targetAssignment ? targetAssignment.title : `Assignment #${a.audienceRuleReferenceId}`}`
                : a.audienceRuleType === 'ATTENDANCE_BELOW' && a.audienceRuleValue
                ? `Attendance < ${a.audienceRuleValue}%`
                : a.audienceRuleType.replaceAll('_', ' ')}
            </Badge>
          )}
          {a.requiresAcknowledgment && <Badge color="red">Ack Required</Badge>}
          {a.allowComments && <Badge color="gray">Comments On</Badge>}
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.body}</p>
        </div>

        {a.actionLabel && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Action Button</p>
            <span className="inline-block text-xs font-semibold text-purple-600 border border-purple-200 rounded-lg px-2 py-1">
              {a.actionLabel} {a.actionType ? `(${a.actionType.replaceAll('_', ' ')})` : ''}
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
            <p className="text-gray-700 dark:text-gray-300">{format(new Date(a.createdAt), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          {a.scheduledAt && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled For</p>
              <p className="text-sky-600">{format(new Date(a.scheduledAt), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          )}
          {a.expiresAt && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expires</p>
              <p className="text-amber-600">{format(new Date(a.expiresAt), 'dd MMM yyyy')}</p>
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

function CalendarView({ announcements }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const [selectedDay, setSelectedDay] = useState(null)

  const dayItems = {}
  announcements.forEach(a => {
    const mark = (dateStr, type) => {
      if (!dateStr) return
      const d = new Date(dateStr)
      if (d.getFullYear() !== year || d.getMonth() !== month) return
      const key = d.getDate()
      dayItems[key] = dayItems[key] || []
      dayItems[key].push({ a, type })
    }
    if (a.status === 'SCHEDULED') mark(a.scheduledAt, 'scheduled')
    if (a.status === 'PUBLISHED') mark(a.createdAt, 'published')
    if (a.expiresAt) mark(a.expiresAt, 'expiring')
  })

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const TYPE_DOT = { scheduled: 'bg-sky-500', published: 'bg-emerald-500', expiring: 'bg-amber-500' }
  const TYPE_LABEL = { scheduled: 'Scheduled for', published: 'Published on', expiring: 'Expires on' }
  const selectedItems = selectedDay ? (dayItems[selectedDay] || []) : []

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
      <div className="glass-card p-4 sm:p-5 flex-1 min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <p className="font-display font-bold text-gray-800 dark:text-white text-base sm:text-lg">{format(today, 'MMMM yyyy')}</p>
          <div className="flex gap-2.5 sm:gap-3 text-[10px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Scheduled</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Published</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Expiring</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[10px] font-bold text-gray-400 mb-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {cells.map((d, i) => (
            <button key={i} type="button" disabled={!d} onClick={() => setSelectedDay(d)}
              className={`min-h-[42px] sm:min-h-[48px] rounded-lg border p-0.5 sm:p-1.5 text-xs text-left transition-all ${!d ? 'border-transparent cursor-default' : selectedDay === d ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-100 dark:border-gray-800 hover:border-purple-200'}`}>
              {d && (
                <>
                  <span className={selectedDay === d ? 'text-purple-600 font-bold text-[11px] sm:text-xs' : 'text-gray-500 text-[11px] sm:text-xs'}>{d}</span>
                  <div className="flex gap-0.5 mt-0.5 sm:mt-1 flex-wrap">
                    {(dayItems[d] || []).slice(0, 4).map((item, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full inline-block ${TYPE_DOT[item.type]}`} title={`${item.type}: ${item.a.title}`} />
                    ))}
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="glass-card p-5 w-full lg:w-80 flex-shrink-0 flex flex-col max-h-[480px]">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <p className="font-display font-bold text-gray-800 dark:text-white">
              {format(new Date(year, month, selectedDay), 'dd MMM yyyy')}
            </p>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
              <XIcon size={16} />
            </button>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No announcements on this day.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#a78bfa #f3f4f6' }}>
              {selectedItems.map((item, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${TYPE_DOT[item.type]}`} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{TYPE_LABEL[item.type]}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.a.body}</p>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[item.a.priority] || PRIORITY_STYLES.NORMAL}`}>{item.a.priority}</span>
                    {item.a.category && item.a.category !== 'GENERAL' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[item.a.category] || CATEGORY_STYLES.GENERAL}`}>
                        {item.a.category.charAt(0) + item.a.category.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
