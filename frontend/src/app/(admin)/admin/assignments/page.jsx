'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Pencil, Trash2, Send, Lock, Unlock, Paperclip, X, RefreshCw, Calendar, Upload } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'
import SearchableSelect from '@/components/admin/SearchableSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'

const STATUS_COLORS = {
  DRAFT:     'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  PUBLISHED: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  CLOSED:    'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
}

const EMPTY_FORM = {
  title: '', description: '', courseId: '', batchId: '',
  startDate: '', publishTime: '', dueDate: '', closeTime: '', totalMarks: 100,
  attachmentUrl: '', attachmentName: '',
  attachments: [],
}

const toOptions = (list, labelFn) => list.map(item => ({ value: String(item.id), label: labelFn(item) }))

function validateAssignmentDates(startDate, publishTime, dueDate, closeTime) {
  if (!startDate || !dueDate) return null
  const startDT = new Date(`${startDate}T${publishTime || '00:00'}`)
  const dueDT = new Date(`${dueDate}T${closeTime || '23:59'}`)
  if (dueDT < startDT) {
    if (startDate > dueDate) {
      return 'Due date cannot be earlier than publish / start date'
    }
    return 'Close time must be after publish time when on the same date'
  }
  return null
}

function validateTotalMarks(val) {
  if (val === '' || val === null || val === undefined) {
    return 'Please enter correct value below 100'
  }
  const strVal = String(val).trim()
  if (!/^\d+$/.test(strVal)) {
    return 'Please enter correct value below 100'
  }
  const num = Number(strVal)
  if (num < 1 || num > 100) {
    return 'Please enter correct value below 100'
  }
  return null
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dueDateFrom, setDueDateFrom] = useState('')
  const [dueDateTo, setDueDateTo] = useState('')
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [deletingAssignment, setDeletingAssignment] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const searchTimer = useRef(null)

  const dateError = validateAssignmentDates(form.startDate, form.publishTime, form.dueDate, form.closeTime)
  const marksError = validateTotalMarks(form.totalMarks)

  const load = useCallback(() => {
    setLoading(true)
    assignmentService.list({
      search: search || undefined,
      courseId: courseFilter || undefined,
      batchId: batchFilter || undefined,
      status: statusFilter || undefined,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
      page,
      limit: 20,
    })
      .then(r => {
        const d = r.data
        setAssignments(d.assignments)
        setTotal(d.total)
        setTotalPages(d.totalPages)
      })
      .catch(err => toast.error(err.message || 'Failed to load assignments'))
      .finally(() => setLoading(false))
  }, [search, courseFilter, batchFilter, statusFilter, dueDateFrom, dueDateTo, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    batchService.list().then(r => setBatches(r.data || [])).catch(() => {})
  }, [])

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const openCreate = () => {
    setEditAssignment(null)
    setForm(EMPTY_FORM)
    setPanelOpen(true)
  }

  const openEdit = (assignment) => {
    setEditAssignment(assignment)
    const initialAttachments = assignment.attachments && assignment.attachments.length > 0
      ? assignment.attachments.map(a => ({ fileUrl: a.fileUrl, fileName: a.fileName }))
      : assignment.attachmentUrl
        ? [{ fileUrl: assignment.attachmentUrl, fileName: assignment.attachmentName }]
        : []
    setForm({
      title: assignment.title,
      description: assignment.description,
      courseId: String(assignment.course.id),
      batchId: String(assignment.batch.id),
      startDate: assignment.startDate || '',
      publishTime: assignment.publishTime ? assignment.publishTime.substring(0, 5) : '',
      dueDate: assignment.dueDate,
      closeTime: assignment.closeTime ? assignment.closeTime.substring(0, 5) : '',
      totalMarks: assignment.totalMarks,
      attachmentUrl: assignment.attachmentUrl || '',
      attachmentName: assignment.attachmentName || '',
      attachments: initialAttachments,
    })
    setPanelOpen(true)
  }

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return
    setUploading(true)
    try {
      let uploaded = []
      try {
        const r = await assignmentService.uploadMultiple(selectedFiles)
        uploaded = r.data || []
      } catch (batchErr) {
        for (const file of selectedFiles) {
          const r = await assignmentService.upload(file)
          if (r?.data) uploaded.push(r.data)
        }
      }
      const newAttachments = uploaded.map(u => ({ fileUrl: u.url, fileName: u.fileName }))
      setForm(f => ({
        ...f,
        attachments: [...(f.attachments || []), ...newAttachments],
        attachmentUrl: f.attachmentUrl || newAttachments[0]?.fileUrl || '',
        attachmentName: f.attachmentName || newAttachments[0]?.fileName || '',
      }))
      toast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded`)
    } catch (err) {
      toast.error(err.message || 'Failed to upload attachment(s)')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeAttachment = (indexToRemove) => {
    setForm(f => {
      const next = (f.attachments || []).filter((_, i) => i !== indexToRemove)
      return {
        ...f,
        attachments: next,
        attachmentUrl: next[0]?.fileUrl || '',
        attachmentName: next[0]?.fileName || '',
      }
    })
  }

  const buildPayload = (status) => {
    const attList = (form.attachments || []).map(a => ({ fileUrl: a.fileUrl, fileName: a.fileName }))
    return {
      title: form.title,
      description: form.description,
      courseId: Number(form.courseId),
      batchId: Number(form.batchId),
      startDate: form.startDate || null,
      publishTime: form.publishTime || null,
      dueDate: form.dueDate,
      closeTime: form.closeTime || null,
      totalMarks: Number(form.totalMarks),
      attachmentUrl: attList[0]?.fileUrl || null,
      attachmentName: attList[0]?.fileName || null,
      attachments: attList,
      status,
    }
  }

  const handleSubmit = async (status) => {
    if (!form.title || !form.description || !form.courseId || !form.batchId || !form.dueDate || form.totalMarks === '' || form.totalMarks === null) {
      toast.error('Please fill in all required fields')
      return
    }
    if (dateError) {
      toast.error(dateError)
      return
    }
    if (marksError) {
      toast.error(marksError)
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload(status)
      if (editAssignment) {
        await assignmentService.update(editAssignment.id, payload)
        toast.success('Assignment updated successfully')
      } else {
        await assignmentService.create(payload)
        toast.success(status === 'PUBLISHED' ? 'Assignment published' : 'Assignment saved as draft')
      }
      setPanelOpen(false)
      setForm(EMPTY_FORM)
      setEditAssignment(null)
      load()
    } catch (err) {
      toast.error(err.message || `Failed to ${editAssignment ? 'update' : 'create'} assignment`)
    } finally { setSaving(false) }
  }

  const handlePublish = async (id) => {
    try { await assignmentService.publish(id); toast.success('Assignment published'); load() }
    catch (err) { toast.error(err.message || 'Failed to publish') }
  }

  const handleClose = async (id) => {
    if (!confirm('Close this assignment? Students will no longer be able to submit.')) return
    try { await assignmentService.close(id); toast.success('Assignment closed'); load() }
    catch (err) { toast.error(err.message || 'Failed to close') }
  }

  const handleReopen = async (id) => {
    if (!confirm('Reopen this assignment? Students will be able to submit again.')) return
    try { await assignmentService.reopen(id); toast.success('Assignment reopened'); load() }
    catch (err) { toast.error(err.message || 'Failed to reopen') }
  }

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return
    setIsDeleting(true)
    try {
      await assignmentService.remove(deletingAssignment.id)
      toast.success('Assignment deleted')
      setDeletingAssignment(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

const getBatchCourseId = (b) => {
  if (!b) return ''
  if (b.course && typeof b.course === 'object' && b.course.id != null) return String(b.course.id)
  if (b.course != null && typeof b.course !== 'object') return String(b.course)
  if (b.courseId != null) return String(b.courseId)
  return ''
}

  const handleCourseChange = (selectedCourseId) => {
    setForm(f => {
      const isBatchValid = selectedCourseId && f.batchId
        ? batches.some(b => String(b.id) === String(f.batchId) && getBatchCourseId(b) === String(selectedCourseId))
        : false

      return {
        ...f,
        courseId: selectedCourseId,
        batchId: isBatchValid ? f.batchId : '',
      }
    })
  }

  const courseOptions = toOptions(courses, c => c.title)
  const filteredBatches = form.courseId
    ? batches.filter(b => getBatchCourseId(b) === String(form.courseId))
    : batches
  const batchOptions = toOptions(filteredBatches, b => b.name)
  const headerFilterBatches = courseFilter
    ? batches.filter(b => getBatchCourseId(b) === String(courseFilter))
    : batches

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Assignments</h1>
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">{total}</span>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all">
          <Plus size={16} /> Create Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-purple-400 flex-shrink-0" />
          <input
            placeholder="Search assignments..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0 font-medium"
          value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0 font-medium"
          value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Batches</option>
          {headerFilterBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0 font-medium"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <Calendar size={14} className="text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">From:</span>
          <input
            type="date"
            value={dueDateFrom}
            onChange={e => { setDueDateFrom(e.target.value); setPage(1) }}
            className="bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Due date from"
          />
        </div>
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <Calendar size={14} className="text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">To:</span>
          <input
            type="date"
            value={dueDateTo}
            onChange={e => { setDueDateTo(e.target.value); setPage(1) }}
            className="bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Due date to"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-9 h-9 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50"
          title="Refresh List"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['Assignment', 'Course', 'Batch', 'Due Date', 'Marks', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No assignments found</td></tr>
                ) : (
                  assignments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => router.push(`/admin/assignments/${a.id}`)}
                          className="font-semibold text-gray-800 dark:text-white hover:text-purple-600 transition-colors text-left block">
                          {a.title}
                        </button>
                        {((a.attachments && a.attachments.length > 0) || a.attachmentUrl) && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <Paperclip size={11} className="text-purple-500" />
                              {a.attachments?.length ? `${a.attachments.length} file${a.attachments.length > 1 ? 's' : ''}` : (a.attachmentName || '1 file')}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const first = (a.attachments && a.attachments[0]) || { fileUrl: a.attachmentUrl, fileName: a.attachmentName }
                                setPreviewAttachment({ url: first.fileUrl, name: first.fileName })
                              }}
                              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                              title="Preview attachment"
                            >
                              <Eye size={11} /> Preview
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{a.course.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{a.batch.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{format(new Date(a.dueDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{a.totalMarks}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => router.push(`/admin/assignments/${a.id}`)}
                            className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(a)}
                            className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          {a.status === 'DRAFT' && (
                            <button onClick={() => handlePublish(a.id)}
                              className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/60 flex items-center justify-center transition-colors" title="Publish">
                              <Send size={14} />
                            </button>
                          )}
                          {a.status === 'PUBLISHED' && (
                            <button onClick={() => handleClose(a.id)}
                              className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 flex items-center justify-center transition-colors" title="Close">
                              <Lock size={14} />
                            </button>
                          )}
                          {a.status === 'CLOSED' && (
                            <button onClick={() => handleReopen(a.id)}
                              className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/60 flex items-center justify-center transition-colors" title="Reopen">
                              <Unlock size={14} />
                            </button>
                          )}
                          <button onClick={() => setDeletingAssignment(a)}
                            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 transition-colors">
              ← Prev
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-purple-50'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editAssignment ? 'Edit Assignment' : 'Create Assignment'}
        subtitle={editAssignment ? 'Update assignment details' : 'Assign work to a batch'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Java Basics Assignment"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course *</label>
            <SearchableSelect
              options={courseOptions}
              value={form.courseId}
              onChange={handleCourseChange}
              placeholder="Select course"
              searchPlaceholder="Search course..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch *</label>
            <SearchableSelect
              options={batchOptions}
              value={form.batchId}
              onChange={(v) => setForm(f => ({ ...f, batchId: v }))}
              placeholder="Select batch"
              searchPlaceholder="Search batch..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Publish / Start Date</label>
              <input
                type="date"
                value={form.startDate}
                max={form.dueDate || undefined}
                onChange={e => {
                  const newStart = e.target.value
                  setForm(f => ({
                    ...f,
                    startDate: newStart,
                    dueDate: f.dueDate && newStart && f.dueDate < newStart ? '' : f.dueDate,
                  }))
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Publish Time</label>
              <input
                type="time"
                value={form.publishTime}
                onChange={e => setForm(f => ({ ...f, publishTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Due / Close Date *</label>
              <input
                type="date"
                value={form.dueDate}
                min={form.startDate || undefined}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 ${
                  dateError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Close Time</label>
              <input
                type="time"
                value={form.closeTime}
                onChange={e => setForm(f => ({ ...f, closeTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {dateError && (
            <p className="text-xs text-red-500 font-medium -mt-1">{dateError}</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Marks *</label>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={form.totalMarks}
              onKeyDown={e => {
                // Disallow minus (-), plus (+), e/E, and period (.)
                if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                  e.preventDefault()
                }
              }}
              onChange={e => {
                const val = e.target.value
                setForm(f => ({ ...f, totalMarks: val }))
              }}
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 ${
                marksError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
              }`}
            />
            {marksError && (
              <p className="text-xs text-red-500 font-medium mt-1">{marksError}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Attachments (PDF, DOCX, or XLS only)
              </label>
              {(form.attachments?.length || 0) > 0 && (
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                  {form.attachments.length} attached
                </span>
              )}
            </div>

            {/* Upload drop zone / picker */}
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl p-4 text-center transition-colors bg-gray-50/60 dark:bg-gray-800/40">
              <input
                id="assignment-file-input"
                type="file"
                multiple
                accept=".pdf,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="assignment-file-input" className="cursor-pointer flex flex-col items-center justify-center">
                <Upload size={20} className="text-purple-600 dark:text-purple-400 mb-1.5" />
                <span className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400">
                  {uploading ? 'Uploading files...' : 'Click to browse or drop multiple files'}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">Upload single or multiple files (PDF, DOCX, XLS, XLSX)</span>
              </label>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 mt-2 text-xs text-purple-600 font-medium">
                <RefreshCw size={12} className="animate-spin" /> Uploading attachment(s)...
              </div>
            )}

            {/* List of uploaded attachments */}
            {(form.attachments || []).length > 0 && (
              <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto pr-1">
                {form.attachments.map((att, idx) => (
                  <div
                    key={`${att.fileName}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-xs shadow-sm hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 mr-2">
                      <Paperclip size={14} className="text-purple-500 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate" title={att.fileName}>
                        {att.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment({ url: att.fileUrl, name: att.fileName })}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                        title="Preview attachment"
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            {editAssignment ? (
              <button type="button" disabled={saving} onClick={() => handleSubmit(editAssignment.status)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60">
                {saving ? 'Updating...' : 'Update Assignment'}
              </button>
            ) : (
              <>
                <button type="button" disabled={saving} onClick={() => handleSubmit('DRAFT')}
                  className="flex-1 py-2.5 rounded-xl border border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-colors disabled:opacity-60">
                  Save as Draft
                </button>
                <button type="button" disabled={saving} onClick={() => handleSubmit('PUBLISHED')}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60">
                  {saving ? 'Saving...' : 'Publish'}
                </button>
              </>
            )}
          </div>
        </div>
      </SlidePanel>

      <DeleteConfirmModal
        isOpen={Boolean(deletingAssignment)}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Assignment?"
        itemName={deletingAssignment?.title}
        loading={isDeleting}
      />

      {previewAttachment && (
        <ViewAttachmentModal
          url={previewAttachment.url}
          name={previewAttachment.name}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  )
}
