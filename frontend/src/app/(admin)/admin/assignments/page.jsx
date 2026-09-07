'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Pencil, Trash2, Send, Lock, Paperclip, X, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'
import SearchableSelect from '@/components/admin/SearchableSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

const STATUS_COLORS = {
  DRAFT:     'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  CLOSED:    'bg-red-100 text-red-700',
}

const EMPTY_FORM = {
  title: '', description: '', courseId: '', batchId: '',
  startDate: '', dueDate: '', totalMarks: 100,
  attachmentUrl: '', attachmentName: '',
}

const toOptions = (list, labelFn) => list.map(item => ({ value: String(item.id), label: labelFn(item) }))

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
  const [deletingAssignment, setDeletingAssignment] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const searchTimer = useRef(null)

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
    setForm({
      title: assignment.title,
      description: assignment.description,
      courseId: String(assignment.course.id),
      batchId: String(assignment.batch.id),
      startDate: assignment.startDate || '',
      dueDate: assignment.dueDate,
      totalMarks: assignment.totalMarks,
      attachmentUrl: assignment.attachmentUrl || '',
      attachmentName: assignment.attachmentName || '',
    })
    setPanelOpen(true)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await assignmentService.upload(file)
      setForm(f => ({ ...f, attachmentUrl: r.data.url, attachmentName: r.data.fileName }))
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err.message || 'Only PDF and DOC/DOCX files are allowed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const buildPayload = (status) => ({
    title: form.title,
    description: form.description,
    courseId: Number(form.courseId),
    batchId: Number(form.batchId),
    startDate: form.startDate || null,
    dueDate: form.dueDate,
    totalMarks: Number(form.totalMarks),
    attachmentUrl: form.attachmentUrl || null,
    attachmentName: form.attachmentName || null,
    status,
  })

  const handleSubmit = async (status) => {
    if (!form.title || !form.description || !form.courseId || !form.batchId || !form.dueDate || !form.totalMarks) {
      toast.error('Please fill in all required fields')
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

  const courseOptions = toOptions(courses, c => c.title)
  const batchOptions = toOptions(batches, b => b.name)

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
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-purple-400 flex-shrink-0" />
          <input
            placeholder="Search assignments..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>
        <input
          type="date" value={dueDateFrom} onChange={e => { setDueDateFrom(e.target.value); setPage(1) }}
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          title="Due date from"
        />
        <input
          type="date" value={dueDateTo} onChange={e => { setDueDateTo(e.target.value); setPage(1) }}
          className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none border-0"
          title="Due date to"
        />
        <button onClick={load} className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
          <RefreshCw size={15} />
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
                          className="font-semibold text-gray-800 dark:text-white hover:text-purple-600 transition-colors text-left">
                          {a.title}
                        </button>
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
                            className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(a)}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          {a.status === 'DRAFT' && (
                            <button onClick={() => handlePublish(a.id)}
                              className="w-7 h-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors" title="Publish">
                              <Send size={14} />
                            </button>
                          )}
                          {a.status === 'PUBLISHED' && (
                            <button onClick={() => handleClose(a.id)}
                              className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors" title="Close">
                              <Lock size={14} />
                            </button>
                          )}
                          <button onClick={() => setDeletingAssignment(a)}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
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
              onChange={(v) => setForm(f => ({ ...f, courseId: v }))}
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Marks *</label>
            <input
              type="number" min="1"
              value={form.totalMarks}
              onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Attachment (PDF, DOCX, or XLS only)</label>
            {form.attachmentName ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                  <Paperclip size={14} className="text-purple-500 flex-shrink-0" /> {form.attachmentName}
                </span>
                <button type="button" onClick={() => setForm(f => ({ ...f, attachmentUrl: '', attachmentName: '' }))}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept=".pdf,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 file:text-sm file:font-semibold hover:file:bg-purple-100"
              />
            )}
            {uploading && <p className="text-xs text-purple-500 mt-1">Uploading...</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="button" disabled={saving} onClick={() => handleSubmit('DRAFT')}
              className="flex-1 py-2.5 rounded-xl border border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-colors disabled:opacity-60">
              Save as Draft
            </button>
            <button type="button" disabled={saving} onClick={() => handleSubmit('PUBLISHED')}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60">
              {saving ? 'Saving...' : 'Publish'}
            </button>
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
    </div>
  )
}
