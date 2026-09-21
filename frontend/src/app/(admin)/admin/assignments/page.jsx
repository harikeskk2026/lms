'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Eye, Pencil, Trash2, Send, Lock, Unlock, Paperclip, X, RefreshCw, Calendar, Clock, AlertCircle, ArrowLeft, Loader2, FileText, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { formatAssignmentDueDate, format12HourTime } from '@/utils/assignmentDate'
import toast from 'react-hot-toast'
import assignmentService from '@/services/assignmentService'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SearchableSelect from '@/components/admin/SearchableSelect'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import Pagination from '@/components/ui/Pagination'
import { resolveFileUrl } from '@/lib/api'

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  SCHEDULED: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  PUBLISHED: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  CLOSED: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
}

const EMPTY_FORM = {
  title: '', description: '', courseId: '', batchId: '',
  startDate: '', publishTime: '', dueDate: '', closeTime: '', totalMarks: '',
  attachmentUrl: '', attachmentName: '',
  attachments: [],
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
  const cleanPubTime = publishTime ? publishTime.substring(0, 5) : '00:00'
  const cleanCloseTime = closeTime ? closeTime.substring(0, 5) : '23:59'
  const startDT = new Date(`${startDate}T${cleanPubTime}`)
  const dueDT = new Date(`${dueDate}T${cleanCloseTime}`)
  if (isNaN(startDT.getTime()) || isNaN(dueDT.getTime())) return null

  if (dueDT <= startDT) {
    if (startDate > dueDate) {
      return 'End date cannot be earlier than start date'
    }
    return 'End date & close time must be after start date & publish time'
  }
  return null
}

function validateTotalMarks(val) {
  if (val === '' || val === null || val === undefined) {
    return null
  }
  const strVal = String(val).trim()
  const num = Number(strVal)
  if (isNaN(num) || num < 1 || num > 100) {
    return 'Total marks must be between 1 and 100.'
  }
  return null
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
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
  const [errors, setErrors] = useState({})
  const searchTimer = useRef(null)

  const dateError = validateAssignmentDates(form.startDate, form.publishTime, form.dueDate, form.closeTime)
  const marksError = validateTotalMarks(form.totalMarks)
  const isFutureStart = isPublishDateInFuture(form.startDate, form.publishTime)

  const loadAbortRef = useRef(null)

  const load = useCallback(() => {
    loadAbortRef.current?.abort()
    const controller = new AbortController()
    loadAbortRef.current = controller
    setLoading(true)
    const limitParam = pageSize === 'all' ? 1000 : pageSize
    assignmentService.list({
      search: search || undefined,
      courseId: courseFilter || undefined,
      batchId: batchFilter || undefined,
      status: statusFilter || undefined,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
      page,
      limit: limitParam,
    }, { signal: controller.signal })
      .then(r => {
        const d = r.data
        setAssignments(d.assignments)
        setTotal(d.total)
        setTotalPages(pageSize === 'all' ? 1 : d.totalPages)
      })
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return
        toast.error(err.message || 'Failed to load assignments')
      })
      .finally(() => {
        if (loadAbortRef.current === controller) setLoading(false)
      })
  }, [search, courseFilter, batchFilter, statusFilter, dueDateFrom, dueDateTo, page, pageSize])

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
    const existingAtts = assignment.attachments?.length > 0
      ? assignment.attachments
      : (assignment.attachmentUrl ? [{ fileUrl: assignment.attachmentUrl, fileName: assignment.attachmentName }] : [])

    const initialMarks = assignment.totalMarks != null
      ? String(Math.min(100, Math.max(1, Math.round(Number(assignment.totalMarks)))))
      : ''

    setForm({
      title: assignment.title,
      description: assignment.description,
      courseId: assignment.course?.id != null ? String(assignment.course.id) : '',
      batchId: assignment.batch?.id != null ? String(assignment.batch.id) : '',
      startDate: assignment.startDate || '',
      publishTime: assignment.publishTime ? assignment.publishTime.substring(0, 5) : '',
      dueDate: assignment.dueDate,
      closeTime: assignment.closeTime ? assignment.closeTime.substring(0, 5) : '',
      totalMarks: initialMarks,
      attachmentUrl: assignment.attachmentUrl || '',
      attachmentName: assignment.attachmentName || '',
      attachments: existingAtts,
    })
    setErrors({})
    setPanelOpen(true)
  }

  const ALLOWED_ASSIGNMENT_EXTENSIONS = ['.pdf', '.doc', '.docx']

  const handleFileChange = async (e) => {
    const pickedFiles = Array.from(e.target.files || [])
    if (pickedFiles.length === 0) return

    // Validate all selected files against allowed formats
    const invalidFiles = []
    const validFiles = []
    for (const file of pickedFiles) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      if (!ALLOWED_ASSIGNMENT_EXTENSIONS.includes(ext)) {
        invalidFiles.push(file.name)
      } else {
        validFiles.push(file)
      }
    }

    if (invalidFiles.length > 0) {
      const errMsg = `Only PDF (.pdf) and Word (.doc, .docx) files are allowed. Unsupported file: "${invalidFiles.join(', ')}"`
      setErrors(prev => ({ ...prev, attachment: errMsg }))
      toast.error(errMsg)
      e.target.value = ''
      return
    }

    // Clear any previous attachment errors since all files are valid
    setErrors(prev => {
      const next = { ...prev }
      delete next.attachment
      return next
    })

    setUploading(true)
    try {
      const uploadResults = await Promise.allSettled(
        validFiles.map(file => assignmentService.upload(file).then(r => ({ ...r.data, originalFileName: file.name })))
      )
      const successful = []
      const failed = []

      uploadResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value?.url) {
          successful.push({
            fileUrl: res.value.url,
            fileName: res.value.fileName || res.value.originalFileName || validFiles[i].name
          })
        } else {
          failed.push(validFiles[i].name)
        }
      })

      if (successful.length > 0) {
        setForm(f => {
          const currentList = f.attachments?.length > 0
            ? f.attachments
            : (f.attachmentUrl ? [{ fileUrl: f.attachmentUrl, fileName: f.attachmentName }] : [])
          const merged = [...currentList, ...successful]
          return {
            ...f,
            attachments: merged,
            attachmentUrl: merged[0]?.fileUrl || '',
            attachmentName: merged[0]?.fileName || '',
          }
        })
        toast.success(`${successful.length} file${successful.length > 1 ? 's' : ''} uploaded successfully`)
      }

      if (failed.length > 0) {
        const errMsg = `Failed to upload: ${failed.join(', ')}`
        setErrors(prev => ({ ...prev, attachment: errMsg }))
        toast.error(errMsg)
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to upload attachments'
      setErrors(prev => ({ ...prev, attachment: errMsg }))
      toast.error(errMsg)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveAttachment = (indexToRemove) => {
    setForm(f => {
      const currentList = f.attachments?.length > 0
        ? f.attachments
        : (f.attachmentUrl ? [{ fileUrl: f.attachmentUrl, fileName: f.attachmentName }] : [])
      const updated = currentList.filter((_, idx) => idx !== indexToRemove)
      return {
        ...f,
        attachments: updated,
        attachmentUrl: updated[0]?.fileUrl || '',
        attachmentName: updated[0]?.fileName || '',
      }
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next.attachment
      return next
    })
  }

  const buildPayload = (status) => {
    const attList = form.attachments && form.attachments.length > 0 ? form.attachments : []
    return {
      title: form.title.trim(),
      description: form.description?.trim() || '',
      courseId: form.courseId ? Number(form.courseId) : null,
      batchId: form.batchId ? Number(form.batchId) : null,
      startDate: form.startDate || null,
      publishTime: form.publishTime || null,
      dueDate: form.dueDate || null,
      closeTime: form.closeTime || null,
      totalMarks: form.totalMarks !== '' && form.totalMarks !== null && form.totalMarks !== undefined
        ? Math.min(100, Math.max(1, Math.round(Number(String(form.totalMarks).trim()))))
        : null,
      attachments: attList,
      attachmentUrl: attList[0]?.fileUrl || form.attachmentUrl || null,
      attachmentName: attList[0]?.fileName || form.attachmentName || null,
      status,
    }
  }

  const validateForm = (status) => {
    const errs = {}

    if (!form.title?.trim()) {
      errs.title = 'Please enter assignment Title'
    }

    if (!form.courseId) {
      errs.courseId = 'Please select a Course'
    }

    if (!form.batchId) {
      errs.batchId = 'Please select a Batch'
    }

    const hasSubmissions = editAssignment && Number(editAssignment.submissionCount) > 0
    if (hasSubmissions) {
      const initialCourseId = editAssignment.course?.id != null ? String(editAssignment.course.id) : ''
      const initialBatchId = editAssignment.batch?.id != null ? String(editAssignment.batch.id) : ''
      const isCourseChanged = form.courseId && String(form.courseId) !== initialCourseId
      const isBatchChanged = form.batchId && String(form.batchId) !== initialBatchId

      if (isCourseChanged) {
        errs.courseId = 'Course and Batch cannot be changed once students have submitted.'
      }
      if (isBatchChanged) {
        errs.batchId = 'Course and Batch cannot be changed once students have submitted.'
      }
    }

    const totalMarksErr = validateTotalMarks(form.totalMarks)
    if (totalMarksErr) {
      errs.totalMarks = totalMarksErr
    }

    if (status !== 'DRAFT') {
      if (!form.description?.trim()) {
        errs.description = 'Please enter assignment Description'
      }
      if (!form.startDate) {
        errs.startDate = 'Please select a Start Date'
      }
      if (!form.publishTime) {
        errs.publishTime = 'Please select a Publish Time'
      }
      if (!form.dueDate) {
        errs.dueDate = 'Please select an End Date'
      }
      if (!form.closeTime) {
        errs.closeTime = 'Please select a Close Time'
      }
    }

    if (dateError) {
      errs.date = dateError
    }

    return errs
  }

  const handleSubmit = async (status) => {
    const errs = validateForm(status)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const firstErrMsg = errs.courseId || errs.batchId || errs.date || errs.title || errs.startDate || errs.dueDate || errs.publishTime || errs.closeTime || errs.totalMarks || Object.values(errs)[0]
      if (firstErrMsg) {
        toast.error(firstErrMsg)
      }
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
      const errMsg = err?.response?.data?.message || err.message || `Failed to ${editAssignment ? 'update' : 'create'} assignment`
      toast.error(errMsg)
    } finally { setSaving(false) }
  }

  const handlePublishSubmit = () => {
    handleSubmit('PUBLISHED')
  }

  const handleScheduleSubmit = () => {
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
    const hasSubmissions = editAssignment && Number(editAssignment.submissionCount) > 0
    const initialCourseId = editAssignment?.course?.id != null ? String(editAssignment.course.id) : ''

    if (hasSubmissions && selectedCourseId && String(selectedCourseId) !== initialCourseId) {
      setErrors(prev => ({ ...prev, courseId: 'Course and Batch cannot be changed once students have submitted.' }))
      toast.error('Course and Batch cannot be changed once students have submitted.')
      return
    }

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

  if (panelOpen) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {editAssignment ? 'Edit Assignment' : 'Create New Assignment'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {editAssignment ? 'Update assignment scope, schedule, deadline, and reference files.' : 'Assign coursework, define deadlines, and attach resources for a batch.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assignments
          </button>
        </div>

        <div className="space-y-6">
          {/* Section 1: Assignment Content */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">1</div>
              <span>Assignment Content</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assignment Title *</label>
              <input
                value={form.title}
                onChange={e => {
                  setForm(f => ({ ...f, title: e.target.value }))
                  if (errors.title) setErrors(prev => ({ ...prev, title: undefined }))
                }}
                placeholder="e.g. Build a Spring Boot REST API with JWT Authentication"
                className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                  errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
              {errors.title && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => {
                  setForm(f => ({ ...f, description: e.target.value }))
                  if (errors.description) setErrors(prev => ({ ...prev, description: undefined }))
                }}
                placeholder="Provide detailed submission instructions, coding requirements, deliverables, and rubric details..."
                rows={4}
                className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 resize-none transition-all ${
                  errors.description ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Section 2: Target Course & Cohort */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</div>
              <span>Target Course &amp; Cohort</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course *</label>
                <SearchableSelect
                  options={courseOptions}
                  value={form.courseId}
                  onChange={handleCourseChange}
                  placeholder="Select course"
                  searchPlaceholder="Search course..."
                  disabled={!!(editAssignment && Number(editAssignment.submissionCount) > 0)}
                  error={!!errors.courseId}
                />
                {errors.courseId && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.courseId}</p>
                )}
                {editAssignment && Number(editAssignment.submissionCount) > 0 && !errors.courseId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                    Course and Batch cannot be changed once students have submitted ({editAssignment.submissionCount} submission{editAssignment.submissionCount > 1 ? 's' : ''}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Batch *</label>
                <SearchableSelect
                  options={batchOptions}
                  value={form.batchId}
                  onChange={(v) => {
                    const hasSubmissions = editAssignment && Number(editAssignment.submissionCount) > 0
                    const initialBatchId = editAssignment?.batch?.id != null ? String(editAssignment.batch.id) : ''
                    if (hasSubmissions && v && String(v) !== initialBatchId) {
                      setErrors(prev => ({ ...prev, batchId: 'Course and Batch cannot be changed once students have submitted.' }))
                      toast.error('Course and Batch cannot be changed once students have submitted.')
                      return
                    }
                    setForm(f => ({ ...f, batchId: v }))
                    if (errors.batchId) setErrors(prev => ({ ...prev, batchId: undefined }))
                  }}
                  placeholder="Select batch"
                  searchPlaceholder="Search batch..."
                  disabled={!!(editAssignment && Number(editAssignment.submissionCount) > 0)}
                  error={!!errors.batchId}
                />
                {errors.batchId && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.batchId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Schedule & Deadline */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
              <span>Schedule &amp; Deadline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
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
                  className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                    errors.startDate ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                  }`}
                />
                {errors.startDate && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Publish Time</label>
                <input
                  type="time"
                  value={form.publishTime}
                  onChange={e => {
                    setForm(f => ({ ...f, publishTime: e.target.value }))
                    if (errors.publishTime) setErrors(prev => ({ ...prev, publishTime: undefined }))
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                    errors.publishTime || dateError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                  }`}
                />
                {errors.publishTime && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.publishTime}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">End Date</label>
                <input
                  type="date"
                  min={form.startDate || new Date().toISOString().slice(0, 10)}
                  value={form.dueDate}
                  onChange={e => {
                    setForm(f => ({ ...f, dueDate: e.target.value }))
                    if (errors.dueDate) setErrors(prev => ({ ...prev, dueDate: undefined }))
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                    errors.dueDate || dateError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                  }`}
                />
                {errors.dueDate && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Close Time</label>
                <input
                  type="time"
                  value={form.closeTime}
                  onChange={e => {
                    setForm(f => ({ ...f, closeTime: e.target.value }))
                    if (errors.closeTime) setErrors(prev => ({ ...prev, closeTime: undefined }))
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                    errors.closeTime || dateError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                  }`}
                />
                {errors.closeTime && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.closeTime}</p>
                )}
              </div>
            </div>

            {dateError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 font-medium animate-fadeIn">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
                <span>{dateError}</span>
              </div>
            )}
          </div>

          {/* Section 4: Grading & Resources */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">4</div>
              <span>Grading &amp; Resources</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Total Marks
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={form.totalMarks}
                placeholder="Enter marks (1 - 100)"
                onKeyDown={e => {
                  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return
                  if (e.ctrlKey || e.metaKey) return
                  if (!/[\d.]/.test(e.key)) e.preventDefault()
                }}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') {
                    setForm(f => ({ ...f, totalMarks: '' }))
                    if (errors.totalMarks) setErrors(prev => ({ ...prev, totalMarks: undefined }))
                    return
                  }
                  const clean = raw.replace(/[^0-9.]/g, '')
                  if (clean === '') {
                    setForm(f => ({ ...f, totalMarks: '' }))
                    return
                  }
                  const num = parseFloat(clean)
                  if (!isNaN(num)) {
                    if (num > 100) {
                      setForm(f => ({ ...f, totalMarks: '100' }))
                    } else if (clean.includes('.')) {
                      if (clean.endsWith('.') && clean.indexOf('.') === clean.lastIndexOf('.')) {
                        setForm(f => ({ ...f, totalMarks: clean }))
                      } else {
                        const rounded = Math.min(100, Math.max(1, Math.round(num)))
                        setForm(f => ({ ...f, totalMarks: String(rounded) }))
                      }
                    } else {
                      const intStr = clean.slice(0, 3)
                      if (Number(intStr) > 100) {
                        setForm(f => ({ ...f, totalMarks: '100' }))
                      } else {
                        setForm(f => ({ ...f, totalMarks: intStr }))
                      }
                    }
                  } else {
                    setForm(f => ({ ...f, totalMarks: '' }))
                  }
                  if (errors.totalMarks) setErrors(prev => ({ ...prev, totalMarks: undefined }))
                }}
                onBlur={() => {
                  if (form.totalMarks !== '' && form.totalMarks !== null && form.totalMarks !== undefined) {
                    const num = parseFloat(String(form.totalMarks))
                    if (!isNaN(num)) {
                      const rounded = Math.min(100, Math.max(1, Math.round(num)))
                      setForm(f => ({ ...f, totalMarks: String(rounded) }))
                    }
                  }
                }}
                className={`w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 transition-all ${
                  errors.totalMarks || (form.totalMarks !== '' && marksError)
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                }`}
              />
              {(errors.totalMarks || (form.totalMarks !== '' && marksError)) && (
                <p className="text-xs text-red-500 font-medium mt-1">
                  {errors.totalMarks || marksError}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Attachments (PDF, DOC, DOCX only)
                </label>
                {(form.attachments?.length > 0 || form.attachmentName) && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                    {(form.attachments?.length || (form.attachmentName ? 1 : 0))} file{(form.attachments?.length || (form.attachmentName ? 1 : 0)) > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* List of Attached Files */}
              {(form.attachments?.length > 0 ? form.attachments : (form.attachmentName ? [{ fileUrl: form.attachmentUrl, fileName: form.attachmentName }] : [])).length > 0 && (
                <div className="space-y-1.5 mb-2.5 max-h-40 overflow-y-auto pr-1">
                  {(form.attachments?.length > 0 ? form.attachments : [{ fileUrl: form.attachmentUrl, fileName: form.attachmentName }]).map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-gray-800/80 px-3.5 py-2 text-xs"
                    >
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 min-w-0 font-medium">
                        <Paperclip size={13} className="text-purple-500 flex-shrink-0" />
                        <span className="break-words truncate max-w-[280px]">{att.fileName}</span>
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* File Upload Input */}
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:bg-purple-50 dark:file:bg-purple-950/50 file:text-purple-600 dark:file:text-purple-300 file:text-xs file:font-semibold hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 cursor-pointer"
                />
              </div>

              {/* Inline Error Message */}
              {errors.attachment && (
                <div className="mt-1.5 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 font-medium animate-fadeIn">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{errors.attachment}</span>
                </div>
              )}

              {uploading && (
                <p className="text-xs text-purple-500 mt-1.5 flex items-center gap-1.5 font-medium">
                  <Clock size={12} className="animate-spin" /> Uploading file(s)...
                </p>
              )}
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
            <div className="flex items-center gap-2">
              {editAssignment && editAssignment.status !== 'DRAFT' && editAssignment.status !== 'SCHEDULED' ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(editAssignment.status)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20 disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Assignment'
                  )}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit('DRAFT')}
                    className="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 text-xs sm:text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                  {isFutureStart ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleScheduleSubmit}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Clock size={15} />
                          Schedule
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handlePublishSubmit}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          Publish
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

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
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{a.course?.title || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{a.batch?.name || '—'}</td>
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

        <Pagination
          total={total}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
          pageSizeOptions={[5, 10, 20, 50]}
          showAllOption
          label="assignments"
        />
      </div>



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
    </div>
  )
}
