'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Pencil, Trash2, Send, Lock, Unlock, Paperclip, X, RefreshCw, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { formatAssignmentDueDate, format12HourTime } from '@/utils/assignmentDate'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'
import SearchableSelect from '@/components/admin/SearchableSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'
import TimePicker12 from '@/components/ui/TimePicker12'
import { resolveFileUrl } from '@/lib/api'

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  SCHEDULED: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  PUBLISHED: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  CLOSED: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
}

const EMPTY_FORM = {
  title: '', description: '', courseId: '', batchId: '',
  startDate: '', publishTime: '', dueDate: '', closeTime: '', totalMarks: 100,
  attachmentUrl: '', attachmentName: '',
}

const toOptions = (list, labelFn) => list.map(item => ({ value: String(item.id), label: labelFn(item) }))

function isPublishDateInFuture(startDate, publishTime) {
  if (!startDate) return false
  const time = publishTime || '00:00'
  const startDT = new Date(`${startDate}T${time}`)
  return startDT > new Date()
}

function validateAssignmentDates(startDate, publishTime, dueDate, closeTime) {
  if (!startDate || !dueDate) return null
  const startDT = new Date(`${startDate}T${publishTime || '00:00'}`)
  const dueDT = new Date(`${dueDate}T${closeTime || '23:59'}`)
  if (dueDT < startDT) {
    if (startDate > dueDate) {
      return 'End date cannot be earlier than start date'
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
  const [deletingAssignment, setDeletingAssignment] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [closingAssignment, setClosingAssignment] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const [reopeningAssignment, setReopeningAssignment] = useState(null)
  const [isReopening, setIsReopening] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState(null) // { url, name }
  const [errors, setErrors] = useState({})
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
    courseService.list().then(r => setCourses(r.data || [])).catch(() => { })
    batchService.list().then(r => setBatches(r.data || [])).catch(() => { })
  }, [])

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const openCreate = () => {
    setEditAssignment(null)
    setForm(EMPTY_FORM)
    setErrors({})
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
      publishTime: assignment.publishTime ? assignment.publishTime.substring(0, 5) : '',
      dueDate: assignment.dueDate,
      closeTime: assignment.closeTime ? assignment.closeTime.substring(0, 5) : '',
      totalMarks: assignment.totalMarks,
      attachmentUrl: assignment.attachmentUrl || '',
      attachmentName: assignment.attachmentName || '',
    })
    setErrors({})
    setPanelOpen(true)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx', '.doc'].includes(ext)) {
      toast.error(`"${file.name}" is not supported. Only PDF or DOCX files are allowed`)
      e.target.value = ''
      return
    }
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
    title: form.title.trim(),
    description: form.description?.trim() || '',
    courseId: form.courseId ? Number(form.courseId) : null,
    batchId: form.batchId ? Number(form.batchId) : null,
    startDate: form.startDate || null,
    publishTime: form.publishTime || null,
    dueDate: form.dueDate || null,
    closeTime: form.closeTime || null,
    totalMarks: form.totalMarks !== '' && form.totalMarks !== null && form.totalMarks !== undefined
      ? Number(form.totalMarks)
      : (status === 'DRAFT' ? 100 : null),
    attachmentUrl: form.attachmentUrl || null,
    attachmentName: form.attachmentName || null,
    status,
  })

  const validateForm = (status) => {
    const errs = {}

    if (!form.title?.trim()) {
      errs.title = 'Please enter assignment Title'
    }

    if (status !== 'DRAFT') {
      if (!form.description?.trim()) {
        errs.description = 'Please enter assignment Description'
      }
      if (!form.courseId) {
        errs.courseId = 'Please select a Course'
      }
      if (!form.batchId) {
        errs.batchId = 'Please select a Batch'
      }
      if (!form.startDate) {
        errs.startDate = 'Please select a Start Date'
      }
      if (!form.dueDate) {
        errs.dueDate = 'Please select an End Date'
      }
      if (form.totalMarks === '' || form.totalMarks === null || form.totalMarks === undefined) {
        errs.totalMarks = 'Please enter Total Marks (1 to 100)'
      } else {
        const marksNum = Number(form.totalMarks)
        if (isNaN(marksNum) || marksNum < 1 || marksNum > 100) {
          errs.totalMarks = 'Total Marks must be between 1 and 100'
        }
      }
      if (dateError) {
        errs.date = dateError
      }
      if (marksError && !errs.totalMarks) {
        errs.totalMarks = marksError
      }
    }

    return errs
  }

  const handleSubmit = async (status) => {
    const errs = validateForm(status)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const firstError = Object.values(errs)[0]
      toast.error(firstError)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const payload = buildPayload(status)
      if (editAssignment) {
        await assignmentService.update(editAssignment.id, payload)
        toast.success(status === 'SCHEDULED' ? '📅 Assignment scheduled successfully' : 'Assignment updated successfully')
      } else {
        await assignmentService.create(payload)
        toast.success(
          status === 'SCHEDULED'
            ? '📅 Assignment scheduled – will publish automatically'
            : status === 'PUBLISHED'
              ? 'Assignment published'
              : 'Assignment saved as draft'
        )
      }
      setPanelOpen(false)
      setForm(EMPTY_FORM)
      setEditAssignment(null)
      load()
    } catch (err) {
      toast.error(err.message || `Failed to ${editAssignment ? 'update' : 'create'} assignment`)
    } finally { setSaving(false) }
  }

  const handlePublishSubmit = () => {
    if (isPublishDateInFuture(form.startDate, form.publishTime)) {
      toast.error('Please click Schedule option')
      return
    }
    handleSubmit('PUBLISHED')
  }

  const handleScheduleSubmit = () => {
    if (!form.startDate) {
      toast.error('Please select a Publish / Start Date to schedule')
      return
    }
    if (!isPublishDateInFuture(form.startDate, form.publishTime)) {
      toast.error('Publish date and time must be in the future to schedule')
      return
    }
    handleSubmit('SCHEDULED')
  }

  const handlePublish = async (id) => {
    try {
      const res = await assignmentService.publish(id)
      const returnedStatus = res?.data?.status
      if (returnedStatus === 'SCHEDULED') {
        toast.success('📅 Assignment scheduled – students have been notified')
      } else {
        toast.success('✅ Assignment published – students have been notified')
      }
      load()
    } catch (err) { toast.error(err.message || 'Failed to publish') }
  }

  const handleConfirmClose = async () => {
    if (!closingAssignment) return
    setIsClosing(true)
    try {
      await assignmentService.close(closingAssignment.id)
      toast.success('Assignment closed')
      setClosingAssignment(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to close')
    } finally {
      setIsClosing(false)
    }
  }

  const handleConfirmReopen = async () => {
    if (!reopeningAssignment) return
    setIsReopening(true)
    try {
      await assignmentService.reopen(reopeningAssignment.id)
      toast.success('Assignment reopened')
      setReopeningAssignment(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to reopen')
    } finally {
      setIsReopening(false)
    }
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
      toast.error(err.message || 'Failed to delete assignment')
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
    setErrors(prev => ({ ...prev, courseId: undefined, batchId: undefined }))
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
      <div className="glass-card p-4 flex flex-col sm:flex-row flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-purple-400 flex-shrink-0" />
          <input
            placeholder="Search assignments..."
            className="bg-transparent text-sm outline-none w-full text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <CustomSelect
          value={courseFilter}
          onChange={(val) => { setCourseFilter(val); setPage(1) }}
          options={courses.map(c => ({ value: c.id, label: c.title }))}
          placeholder="All Courses"
          searchable={courses.length >= 10}
          compact
        />
        <CustomSelect
          value={batchFilter}
          onChange={(val) => { setBatchFilter(val); setPage(1) }}
          options={headerFilterBatches.map(b => ({ value: b.id, label: b.name }))}
          placeholder="All Batches"
          searchable={headerFilterBatches.length >= 10}
          compact
        />
        <CustomSelect
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setPage(1) }}
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'CLOSED', label: 'Closed' },
          ]}
          placeholder="All Status"
          compact
        />
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <Calendar size={14} className="text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">From:</span>
          <input
            type="date"
            value={dueDateFrom}
            max={dueDateTo || undefined}
            onChange={e => {
              const val = e.target.value
              if (val && dueDateTo && val > dueDateTo) {
                toast.error('"From" date cannot be later than "To" date')
                return
              }
              setDueDateFrom(val)
              setPage(1)
            }}
            className="bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Due date from"
          />
          {dueDateFrom && (
            <button
              type="button"
              onClick={() => { setDueDateFrom(''); setPage(1) }}
              className="text-gray-400 hover:text-purple-600 text-xs ml-0.5"
              title="Clear From date"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <Calendar size={14} className="text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">To:</span>
          <input
            type="date"
            value={dueDateTo}
            min={dueDateFrom || undefined}
            onChange={e => {
              const val = e.target.value
              if (val && dueDateFrom && val < dueDateFrom) {
                toast.error('"To" date cannot be earlier than "From" date')
                return
              }
              setDueDateTo(val)
              setPage(1)
            }}
            className="bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Due date to"
          />
          {dueDateTo && (
            <button
              type="button"
              onClick={() => { setDueDateTo(''); setPage(1) }}
              className="text-gray-400 hover:text-purple-600 text-xs ml-0.5"
              title="Clear To date"
            >
              ×
            </button>
          )}
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
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                  {['Assignment', 'Course', 'Batch', 'End Date', 'Marks', 'Status', 'Actions'].map(h => (
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
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{formatAssignmentDueDate(a.dueDate, a.closeTime, a.closeTime ? 'dd MMM yyyy, h:mm a' : 'dd MMM yyyy')}</td>
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
                          {a.status === 'SCHEDULED' && (
                            <button
                              title={`Scheduled – publishes on ${a.startDate}${a.publishTime ? ' at ' + format12HourTime(a.publishTime) : ''}`}
                              className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center cursor-default"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                          {a.status === 'PUBLISHED' && (
                            <button onClick={() => setClosingAssignment(a)}
                              className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 flex items-center justify-center transition-colors" title="Close">
                              <Lock size={14} />
                            </button>
                          )}
                          {a.status === 'CLOSED' && (
                            <button onClick={() => setReopeningAssignment(a)}
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
        width="w-full sm:w-[540px] lg:w-[600px]"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => {
                setForm(f => ({ ...f, title: e.target.value }))
                if (errors.title) setErrors(prev => ({ ...prev, title: undefined }))
              }}
              placeholder="Java Basics Assignment"
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 ${
                errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.title}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={e => {
                setForm(f => ({ ...f, description: e.target.value }))
                if (errors.description) setErrors(prev => ({ ...prev, description: undefined }))
              }}
              rows={4}
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 resize-none ${
                errors.description ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.description}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course *</label>
            <SearchableSelect
              options={courseOptions}
              value={form.courseId}
              onChange={handleCourseChange}
              placeholder="Select course"
              searchPlaceholder="Search course..."
              error={!!errors.courseId}
            />
            {errors.courseId && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.courseId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch *</label>
            <SearchableSelect
              options={batchOptions}
              value={form.batchId}
              onChange={(v) => {
                setForm(f => ({ ...f, batchId: v }))
                if (errors.batchId) setErrors(prev => ({ ...prev, batchId: undefined }))
              }}
              placeholder="Select batch"
              searchPlaceholder="Search batch..."
              error={!!errors.batchId}
            />
            {errors.batchId && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.batchId}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.startDate}
                max={form.dueDate || undefined}
                onChange={e => {
                  const newStart = e.target.value
                  setForm(f => ({
                    ...f,
                    startDate: newStart,
                  }))
                  if (errors.startDate) setErrors(prev => ({ ...prev, startDate: undefined }))
                }}
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 ${
                  errors.startDate ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Publish Time</label>
              <TimePicker12
                value={form.publishTime}
                onChange={val => setForm(f => ({ ...f, publishTime: val }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
              <input
                type="date"
                min={form.startDate || new Date().toISOString().slice(0, 10)}
                value={form.dueDate}
                onChange={e => {
                  setForm(f => ({ ...f, dueDate: e.target.value }))
                  if (errors.dueDate) setErrors(prev => ({ ...prev, dueDate: undefined }))
                }}
                className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 ${
                  errors.dueDate || dateError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
              {errors.dueDate && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.dueDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Close Time</label>
              <TimePicker12
                value={form.closeTime}
                onChange={val => setForm(f => ({ ...f, closeTime: val }))}
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
                const clean = e.target.value.replace(/[^0-9]/g, '')
                setForm(f => ({ ...f, totalMarks: clean }))
                if (errors.totalMarks) setErrors(prev => ({ ...prev, totalMarks: undefined }))
              }}
              className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 ${
                errors.totalMarks || marksError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
              }`}
            />
            {(errors.totalMarks || marksError) && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.totalMarks || marksError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Attachment (PDF or DOCX only)</label>
            {form.attachmentName ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 min-w-0">
                  <Paperclip size={14} className="text-purple-500 flex-shrink-0" /> <span className="break-words">{form.attachmentName}</span>
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFile({ url: resolveFileUrl(form.attachmentUrl), name: form.attachmentName })}
                    className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-2 py-1 rounded-lg transition-colors"
                    title="Preview file"
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, attachmentUrl: '', attachmentName: '' }))}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Remove file">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip"
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 file:text-sm file:font-semibold hover:file:bg-purple-100"
              />
            )}
            {uploading && <p className="text-xs text-purple-500 mt-1">Uploading...</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            {editAssignment && editAssignment.status !== 'DRAFT' && editAssignment.status !== 'SCHEDULED' ? (
              <button type="button" disabled={saving} onClick={() => handleSubmit(editAssignment.status)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60">
                {saving ? 'Updating...' : 'Update Assignment'}
              </button>
            ) : (
              <>
                <button type="button" disabled={saving} onClick={() => handleSubmit('DRAFT')}
                  className="flex-1 py-2.5 px-2 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors disabled:opacity-60">
                  Save as Draft
                </button>
                <button type="button" disabled={saving} onClick={handleScheduleSubmit}
                  className="flex-1 py-2.5 px-2 rounded-xl border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300 text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm">
                  <Clock size={15} />
                  <span>Schedule</span>
                </button>
                <button type="button" disabled={saving} onClick={handlePublishSubmit}
                  className="flex-1 py-2.5 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/20">
                  <Send size={15} />
                  <span>{saving ? 'Saving...' : 'Publish'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </SlidePanel>

      <DeleteConfirmModal
        isOpen={Boolean(deletingAssignment)}
        onClose={() => !isDeleting && setDeletingAssignment(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Assignment?"
        itemName={deletingAssignment?.title}
        loading={isDeleting}
      />

      {/* Close Confirmation Modal (matches Image 3 style) */}
      <ConfirmModal
        isOpen={Boolean(closingAssignment)}
        onClose={() => !isClosing && setClosingAssignment(null)}
        onConfirm={handleConfirmClose}
        title="Close Assignment?"
        tone="warning"
        icon={Lock}
        confirmLabel="Close Assignment"
        loading={isClosing}
        loadingText="Closing..."
        message={
          <>
            Are you sure you want to close{' '}
            <strong className="text-slate-800 dark:text-gray-200 font-semibold">"{closingAssignment?.title}"</strong>?
            Students will no longer be able to submit.
          </>
        }
      />

      {/* Reopen Confirmation Modal (matches Image 3 style) */}
      <ConfirmModal
        isOpen={Boolean(reopeningAssignment)}
        onClose={() => !isReopening && setReopeningAssignment(null)}
        onConfirm={handleConfirmReopen}
        title="Reopen Assignment?"
        tone="success"
        icon={Unlock}
        confirmLabel="Reopen"
        loading={isReopening}
        loadingText="Reopening..."
        message={
          <>
            Are you sure you want to reopen{' '}
            <strong className="text-slate-800 dark:text-gray-200 font-semibold">"{reopeningAssignment?.title}"</strong>?
            Students will be able to submit again.
          </>
        }
      />

      {previewFile && (
        <ViewAttachmentModal
          url={previewFile.url}
          name={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
