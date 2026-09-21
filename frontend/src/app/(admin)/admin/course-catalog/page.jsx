'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Clock, BarChart2, FolderOpen, Eye, EyeOff, Search, Archive, RotateCcw, X, Upload, BookOpen, ArrowLeft, Loader2, FileDown, FileUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import { resolveFileUrl } from '@/lib/api'
import { courseSchema } from '@/validations/courseValidation'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import CsvImportModal from '@/components/admin/CsvImportModal'

const LEVEL_COLORS = {
  BEGINNER: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  INTERMEDIATE: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  ADVANCED: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
}

const STATUS_COLORS = {
  DRAFT: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40',
  PUBLISHED: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
  ARCHIVED: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40',
}

const EMPTY_FORM = { title: '', courseCode: '', description: '', durationValue: '', durationUnit: 'months', level: 'BEGINNER', thumbnail: '', status: 'DRAFT' }
const EMPTY_COUNTS = { published: 0, draft: 0, archived: 0, total: 0 }

export default function CourseCatalogPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingCourseStatus, setEditingCourseStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebouncedValue(searchInput, 400)
  const [statusCounts, setStatusCounts] = useState(EMPTY_COUNTS)
  const [deletingCourse, setDeletingCourse] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [exportingCourses, setExportingCourses] = useState(false)
  const thumbFileInputRef = useRef(null)
  const coursesAbortRef = useRef(null)

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'TRAINER') {
      router.replace('/admin/dashboard')
    }
  }, [user, router])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(courseSchema), defaultValues: EMPTY_FORM, mode: 'onChange' })

  const thumbnailValue = watch('thumbnail')

  const load = useCallback(() => {
    coursesAbortRef.current?.abort()
    const controller = new AbortController()
    coursesAbortRef.current = controller
    setLoading(true)
    courseService.list({
      search: searchQuery.trim() || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    }, { signal: controller.signal })
      .then(r => setCourses(r.data || []))
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return
        toast.error(err.message || 'Failed to load courses')
      })
      .finally(() => {
        if (coursesAbortRef.current === controller) setLoading(false)
      })
  }, [searchQuery, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let active = true
    courseService.statusCounts()
      .then(r => { if (active) setStatusCounts(r.data || EMPTY_COUNTS) })
      .catch(() => { if (active) setStatusCounts(EMPTY_COUNTS) })
    return () => { active = false }
  }, [])

  function openCreate() {
    setEditingId(null)
    setEditingCourseStatus(null)
    reset(EMPTY_FORM)
    setPanelOpen(true)
  }

  function parseDuration(duration) {
    if (!duration || !duration.trim()) return null
    const match = duration.trim().match(/^(\d+)\s+(days?|weeks?|months?|years?)$/i)
    if (!match) return null
    const value = match[1]
    const raw = match[2].toLowerCase()
    const unit = raw.endsWith('s') ? raw : raw + 's'
    return { durationValue: value, durationUnit: unit }
  }

  function openEdit(course) {
    setEditingId(course.id)
    setEditingCourseStatus(course.status)
    const parsed = parseDuration(course.duration)
    reset({
      title: course.title,
      courseCode: course.courseCode || '',
      description: course.description,
      durationValue: parsed?.durationValue || '',
      durationUnit: parsed?.durationUnit || 'months',
      level: course.level,
      thumbnail: course.thumbnail || '',
      status: course.status,
    })
    setPanelOpen(true)
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      const duration = `${data.durationValue.trim()} ${data.durationUnit}`
      const payload = {
        title: data.title,
        courseCode: data.courseCode,
        description: data.description,
        duration,
        level: data.level,
        thumbnail: data.thumbnail,
        status: data.status,
      }
      if (editingId) {
        await courseService.update(editingId, payload)
        toast.success('Course updated')
      } else {
        await courseService.create(payload)
        toast.success('Course created')
      }
      setPanelOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save course')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(course, nextStatus) {
    setStatusUpdatingId(course.id)
    try {
      await courseService.updateStatus(course.id, nextStatus)
      const labels = {
        PUBLISHED: 'Course published',
        ARCHIVED: 'Course archived',
      }
      toast.success(labels[nextStatus] || 'Status updated')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCourse) return
    setIsDeleting(true)
    try {
      await courseService.remove(deletingCourse.id)
      toast.success('Course deleted')
      setDeletingCourse(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete course')
    } finally {
      setIsDeleting(false)
    }
  }

  const counts = {
    ALL: statusCounts.total ?? (statusCounts.published + statusCounts.draft + statusCounts.archived),
    DRAFT: statusCounts.draft,
    PUBLISHED: statusCounts.published,
    ARCHIVED: statusCounts.archived,
  }

  const hasActiveFilter = statusFilter !== 'ALL' || searchInput.trim() !== ''

  function downloadCoursesCSV() {
    setExportingCourses(true)
    const headers = ['Title', 'Course Code', 'Description', 'Duration', 'Level', 'Status']
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = (courses || []).map(c => [
      esc(c.title),
      esc(c.courseCode || ''),
      esc(c.description || ''),
      esc(c.duration || ''),
      esc(c.level || ''),
      esc(c.status || ''),
    ])
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `courses-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExportingCourses(false)
  }

  function downloadCoursesCSV() {
    const headers = ['Title', 'Course Code', 'Description', 'Duration', 'Level', 'Status']
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = (courses || []).map(c => [
      esc(c.title), esc(c.courseCode), esc(c.description), esc(c.duration), esc(c.level), esc(c.status),
    ])
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `courses-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadCourseImportTemplateCSV() {
    const headers = ['Title', 'Course Code', 'Description', 'Duration', 'Level', 'Status']
    const sample = {
      Title: 'Master Full Stack Java Development',
      'Course Code': 'FS-JAVA-2024',
      Description: 'Comprehensive full stack Java course covering Spring Boot, React and PostgreSQL.',
      Duration: '6 months',
      Level: 'BEGINNER',
      Status: 'DRAFT',
    }
    const esc = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const csv = '\uFEFF' + headers.join(',') + '\r\n' + [headers, ...Object.values(sample)].map(esc).join(',')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'courses-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'TRAINER') {
    return null
  }

  const isTrainer = user?.role === 'TRAINER'

  if (panelOpen) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-500/5 w-full min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {editingId ? 'Edit Course' : 'Create New Course'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {editingId ? 'Update course syllabus, duration, thumbnail and publication status.' : 'Design and publish a new course curriculum with structure, level, and duration.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Section 1: Course Information */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">1</div>
              <span>Course Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course Title *</label>
                <input
                  {...register('title')}
                  placeholder="e.g. Master Full Stack Java Development"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                {errors.title && <span className="text-xs text-red-500 mt-1 block">{errors.title.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course Code</label>
                <input
                  {...register('courseCode')}
                  placeholder="e.g. FS-JAVA-2024"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 uppercase transition-all"
                />
                {errors.courseCode && <span className="text-xs text-red-500 mt-1 block">{errors.courseCode.message}</span>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description *</label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Comprehensive overview of modules, target audience, learning outcomes and prerequisites..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
              />
              {errors.description && <span className="text-xs text-red-500 mt-1 block">{errors.description.message}</span>}
            </div>
          </div>

          {/* Section 2: Structure & Duration */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</div>
              <span>Structure &amp; Duration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Duration *</label>
                <div className="flex gap-2">
                  <input
                    {...register('durationValue', {
                      required: 'Duration is required',
                      validate: v => {
                        if (!v || v === '') return 'Duration is required'
                        const n = parseInt(v, 10)
                        if (isNaN(n) || n <= 0) return 'Duration must be a positive number'
                        return true
                      }
                    })}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 6"
                    onKeyDown={e => {
                      if (['e', 'E', '+', '.'].includes(e.key)) e.preventDefault()
                    }}
                    className="w-1/2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  <div className="w-1/2">
                    <CustomSelect
                      value={watch('durationUnit')}
                      onChange={(val) => setValue('durationUnit', val, { shouldValidate: true })}
                      options={[
                        { value: 'days', label: 'Days' },
                        { value: 'weeks', label: 'Weeks' },
                        { value: 'months', label: 'Months' },
                        { value: 'years', label: 'Years' },
                      ]}
                    />
                  </div>
                </div>
                {(errors.durationValue || errors.durationUnit) && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.durationValue?.message || errors.durationUnit?.message || 'Duration is required'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Proficiency Level *</label>
                <CustomSelect
                  value={watch('level')}
                  onChange={(val) => setValue('level', val, { shouldValidate: true })}
                  options={[
                    { value: 'BEGINNER', label: 'BEGINNER' },
                    { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
                    { value: 'ADVANCED', label: 'ADVANCED' },
                  ]}
                />
                {errors.level && <span className="text-xs text-red-500 mt-1 block">{errors.level.message}</span>}
              </div>
            </div>
          </div>

          {/* Section 3: Classification & Status */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
              <span>Classification &amp; Media</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status *</label>
                <CustomSelect
                  value={watch('status')}
                  onChange={(val) => setValue('status', val, { shouldValidate: true })}
                  options={
                    editingId
                      ? editingCourseStatus === 'DRAFT'
                        ? [
                            { value: 'DRAFT', label: 'DRAFT' },
                            { value: 'PUBLISHED', label: 'PUBLISHED' },
                          ]
                        : editingCourseStatus === 'ARCHIVED'
                          ? [
                              { value: 'ARCHIVED', label: 'ARCHIVED' },
                              { value: 'PUBLISHED', label: 'PUBLISHED' },
                            ]
                          : [
                              { value: 'PUBLISHED', label: 'PUBLISHED' },
                              { value: 'ARCHIVED', label: 'ARCHIVED' },
                            ]
                      : [
                          { value: 'DRAFT', label: 'DRAFT' },
                        ]
                  }
                />
                {errors.status && <span className="text-xs text-red-500 mt-1 block">{errors.status.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course Thumbnail</label>
                <div className="flex gap-2">
                  <input
                    ref={thumbFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (!file.type || !file.type.startsWith('image/')) {
                        toast.error('Thumbnail must be an image file (JPG, PNG, WebP, or GIF)')
                        if (thumbFileInputRef.current) thumbFileInputRef.current.value = ''
                        return
                      }
                      setUploadingThumb(true)
                      try {
                        const res = await courseContentService.uploadMaterial(file, 'OTHER')
                        const url = res?.data?.url || res?.url || res?.data?.fileUrl || res?.fileUrl
                        if (url) {
                          setValue('thumbnail', url, { shouldValidate: true, shouldDirty: true })
                          toast.success('Thumbnail uploaded')
                        } else {
                          toast.error('Could not obtain uploaded image URL')
                        }
                      } catch (err) {
                        toast.error(err.message || 'Failed to upload thumbnail')
                      } finally {
                        setUploadingThumb(false)
                        if (thumbFileInputRef.current) thumbFileInputRef.current.value = ''
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => thumbFileInputRef.current?.click()}
                    disabled={uploadingThumb}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {uploadingThumb ? 'Uploading...' : 'Upload Thumbnail'}
                  </button>
                </div>
                {thumbnailValue && (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-40 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative group">
                    <img
                      src={resolveFileUrl(thumbnailValue)}
                      alt="Thumbnail preview"
                      className="w-full h-40 object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setValue('thumbnail', '', { shouldValidate: true, shouldDirty: true })}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors shadow-sm"
                      title="Remove thumbnail"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
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
              type="submit"
              disabled={saving || isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20 flex items-center gap-2"
            >
              {(saving || isSubmitting) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingId ? 'Saving Changes...' : 'Creating Course...'}
                </>
              ) : (
                editingId ? 'Save Changes' : 'Create Course'
              )}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">
            {isTrainer ? 'My Courses' : 'Courses'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isTrainer ? 'Courses associated with your assigned batches.' : 'Core course records, served by the Java API.'}
          </p>
        </div>
        {!isTrainer && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700"
          >
            <Plus size={16} /> Add Course
          </button>
        )}
      </div>

      {/* Export & Import toolbar */}
      {!isTrainer && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
          >
            <Upload size={14} /> Import Courses
          </button>
          <button
            onClick={downloadCoursesCSV}
            disabled={exportingCourses}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {exportingCourses ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {exportingCourses ? 'Exporting...' : 'Export Courses'}
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All', count: counts.ALL },
            { id: 'DRAFT', label: 'Drafts', count: counts.DRAFT },
            { id: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED },
            { id: 'ARCHIVED', label: 'Archived', count: counts.ARCHIVED },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 glass-card animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        hasActiveFilter ? (
          <div className="glass-card p-12 text-center text-gray-400 space-y-2">
            <p className="text-sm">No courses matching your filter.</p>
            <button
              onClick={() => { setStatusFilter('ALL'); setSearchInput('') }}
              className="text-xs text-purple-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="glass-card p-16 text-center text-gray-400">
            {isTrainer ? 'No courses associated with your assigned batches yet.' : 'No courses yet.'}
          </div>
        )
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(c => (
            <div key={c.id} className="glass-card p-5 flex flex-col gap-3 overflow-hidden group">
              <CourseCardThumbnail course={c} />
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-base leading-tight text-gray-900 dark:text-white">{c.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${LEVEL_COLORS[c.level]}`}>{c.level}</span>
              </div>
              <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[c.status]}`}>{c.status}</span>
              <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock size={11} /> {c.duration}</span>
                {c.courseCode && <span className="flex items-center gap-1"><BarChart2 size={11} /> {c.courseCode}</span>}
              </div>
              <Link href={`/admin/course-catalog/${c.id}`}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-semibold hover:from-purple-700 hover:to-violet-700 transition-colors">
                <FolderOpen size={12} /> {isTrainer ? 'View Content & Syllabus' : 'Manage Content'}
              </Link>
              {!isTrainer && (
                <>
                  <div className="flex gap-2">
                    {c.status === 'DRAFT' && (
                      <button onClick={() => handleStatusChange(c, 'PUBLISHED')} disabled={statusUpdatingId === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors disabled:opacity-60 border border-emerald-200/60 dark:border-emerald-800/40">
                        <Eye size={12} /> Publish
                      </button>
                    )}
                    {c.status === 'PUBLISHED' && (
                      <button onClick={() => handleStatusChange(c, 'ARCHIVED')} disabled={statusUpdatingId === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-950/60 transition-colors disabled:opacity-60 border border-orange-200/60 dark:border-orange-800/40">
                        <Archive size={12} /> Archive
                      </button>
                    )}
                    {c.status === 'ARCHIVED' && (
                      <button onClick={() => handleStatusChange(c, 'PUBLISHED')} disabled={statusUpdatingId === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors disabled:opacity-60 border border-emerald-200/60 dark:border-emerald-800/40">
                        <RotateCcw size={12} /> Unarchive
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200/60 dark:border-purple-800/40">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setDeletingCourse(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors border border-red-200/60 dark:border-red-800/40">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}



      <CsvImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Courses"
        subtitle="Bulk create courses from a CSV file. Download the template for the exact column format."
        entityLabel="course"
        templateFilename="courses-import-template.csv"
        templateHeaders={['Title', 'Course Code', 'Description', 'Duration', 'Level', 'Status']}
        templateRows={[[
          'Master Full Stack Java Development',
          'FS-JAVA-2024',
          'Comprehensive full stack Java course covering Spring Boot, React and PostgreSQL.',
          '6 months',
          'BEGINNER',
          'DRAFT',
        ]]}
        requiredColumns={['title']}
        submitFn={(file) => courseService.bulkImport(file)}
        onSuccess={load}
        helpLines={[
          'Import up to 1000 courses at once.',
          'Required column: Title.',
          'Level must be BEGINNER, INTERMEDIATE or ADVANCED.',
          'Status is optional — blank or DRAFT keeps the course as a draft.',
        ]}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingCourse)}
        onClose={() => setDeletingCourse(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Course?"
        itemName={deletingCourse?.title}
        loading={isDeleting}
      />
    </div>
  )
}

function CourseCardThumbnail({ course }) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [course?.thumbnail])

  if (course?.thumbnail && !imgError) {
    return (
      <div className="relative -mx-5 -mt-5 mb-1 h-36 overflow-hidden bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <img
          src={resolveFileUrl(course.thumbnail)}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      </div>
    )
  }

  return (
    <div className="relative -mx-5 -mt-5 mb-1 h-32 bg-gradient-to-br from-purple-700 via-indigo-700 to-slate-900 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-sm pointer-events-none" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-purple-400/20 blur-sm pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
          <BookOpen size={16} />
        </div>
        {course?.courseCode && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs">
            {course.courseCode}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-white/90 text-xs font-semibold font-display line-clamp-1 drop-shadow-sm">{course?.title}</p>
      </div>
    </div>
  )
}

