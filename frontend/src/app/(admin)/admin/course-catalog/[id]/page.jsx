'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Upload, ExternalLink, Clock, BookOpen, Image as ImageIcon, Eye, Download, X,
  ZoomIn, ZoomOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import batchService from '@/services/batchService'
import { courseSchema } from '@/validations/courseValidation'
import EnrolledStudentsTab from '@/components/admin/course/EnrolledStudentsTab'
import ImportSyllabusModal from '@/components/admin/course/ImportSyllabusModal'
import SyllabusStatusModal from '@/components/admin/course/SyllabusStatusModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import MaterialPreviewModal from '@/components/ui/MaterialPreviewModal'
import { resolveFileUrl, adminApi } from '@/lib/api'

import SlidePanel from '@/components/admin/SlidePanel'
import CustomSelect from '@/components/ui/CustomSelect'
import MultiSelect from '@/components/ui/MultiSelect'

const TABS = ['Overview', 'Syllabus', 'Materials', 'Batches', 'Enrolled Students']
const MATERIAL_TYPES = ['PDF', 'DOCUMENT', 'PRESENTATION', 'VIDEO', 'LINK', 'OTHER']
const ALLOWED_EXTENSIONS_BY_TYPE = {
  PDF: ['pdf'],
  DOCUMENT: ['doc', 'docx', 'txt', 'rtf', 'odt'],
  PRESENTATION: ['ppt', 'pptx'],
  VIDEO: ['mp4', 'mov', 'webm', 'mkv', 'avi'],
  OTHER: ['csv', 'xls', 'xlsx', 'txt', 'zip', 'rar', '7z', 'tar', 'gz', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
}

export default function CourseManagePage({ params }) {
  const router = useRouter()
  const { user } = useAuth()
  const { id: courseId } = params
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [trainers, setTrainers] = useState([])
  const [loadingTrainers, setLoadingTrainers] = useState(false)

  // Edit course state
  const [editingCourse, setEditingCourse] = useState(false)
  const [savingCourse, setSavingCourse] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const {
    register: registerCourse,
    handleSubmit: handleSubmitCourse,
    reset: resetCourseForm,
    watch: watchCourse,
    setValue: setCourseValue,
    formState: { errors: courseErrors, isSubmitting: isSubmittingCourse, isDirty: isCourseDirty },
  } = useForm({
    resolver: zodResolver(courseSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      courseCode: '',
      description: '',
      durationValue: '',
      durationUnit: 'months',
      level: 'BEGINNER',
      status: 'PUBLISHED',
      thumbnail: '',
    },
  })
  const editThumbnailValue = watchCourse('thumbnail')

  useEffect(() => {
    setLoadingTrainers(true)
    adminApi.getTrainers({ limit: 200, status: 'active' })
      .then(res => {
        const list = res.data?.data?.trainers || []
        const activeList = list.filter(t => t.active === true)
        activeList.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setTrainers(activeList)
      })
      .catch(err => {
        console.error('Failed to load trainers:', err)
      })
      .finally(() => setLoadingTrainers(false))
  }, [])

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'TRAINER') {
      router.replace('/admin/dashboard')
    }
  }, [user, router])

  function parseDurationStr(duration) {
    if (!duration || !duration.trim()) return null
    const match = duration.trim().match(/^(\d+)\s+(days?|weeks?|months?|years?)$/i)
    if (!match) return null
    const value = match[1]
    const raw = match[2].toLowerCase()
    const unit = raw.endsWith('s') ? raw : raw + 's'
    return { durationValue: value, durationUnit: unit }
  }

  const loadCourse = useCallback(() => {
    courseService.get(courseId)
      .then(r => {
        setCourse(r.data)
        if (r.data) {
          const parsed = parseDurationStr(r.data.duration)
          resetCourseForm({
            title: r.data.title || '',
            courseCode: r.data.courseCode || '',
            description: r.data.description || '',
            durationValue: parsed?.durationValue || '',
            durationUnit: parsed?.durationUnit || 'months',
            level: r.data.level || 'BEGINNER',
            status: r.data.status || 'PUBLISHED',
            thumbnail: r.data.thumbnail || '',
          })
        }
      })
      .catch(() => toast.error('Failed to load course'))
      .finally(() => setLoading(false))
  }, [courseId, resetCourseForm])

  useEffect(() => { loadCourse() }, [loadCourse])

  const handleOpenEdit = () => {
    if (!course) return
    const parsed = parseDurationStr(course.duration)
    resetCourseForm({
      title: course.title || '',
      courseCode: course.courseCode || '',
      description: course.description || '',
      durationValue: parsed?.durationValue || '',
      durationUnit: parsed?.durationUnit || 'months',
      level: course.level || 'BEGINNER',
      status: course.status || 'PUBLISHED',
      thumbnail: course.thumbnail || '',
    })
    setEditingCourse(true)
  }

  const onSaveCourse = async (data) => {
    setSavingCourse(true)
    try {
      await courseService.update(course.id, {
        title: data.title.trim(),
        courseCode: data.courseCode?.trim() || null,
        description: data.description.trim(),
        duration: `${data.durationValue.trim()} ${data.durationUnit}`,
        level: data.level,
        status: data.status,
        thumbnail: data.thumbnail?.trim() || null,
      })
      toast.success('Course updated successfully', { id: 'save-course' })
      setEditingCourse(false)
      loadCourse()
    } catch (err) {
      toast.error(err.message || 'Failed to save course', { id: 'save-course' })
    } finally {
      setSavingCourse(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (user?.role === 'TRAINER') return
    if (!newStatus) return
    try {
      await courseService.updateStatus(courseId, newStatus)
      setCourse(c => ({ ...c, status: newStatus }))
      toast.success(`Course status changed to ${newStatus}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to update course status')
    }
  }

  if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'TRAINER') return null

  if (loading) return <div className="max-w-7xl mx-auto"><div className="h-40 glass-card animate-pulse" /></div>
  if (!course) return <div className="max-w-7xl mx-auto glass-card p-16 text-center text-gray-400">Course not found</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Link href="/admin/course-catalog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
        <ArrowLeft size={14} /> Back to Courses
      </Link>

      <div className="glass-card p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{course.title}</h1>
              {course.courseCode && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono uppercase">
                  {course.courseCode}
                </span>
              )}
              <CourseStatusBadge
                status={course.status}
                disabled={user?.role === 'TRAINER'}
                title={user?.role !== 'TRAINER' ? "Click to change course status" : undefined}
                onChange={user?.role !== 'TRAINER' ? handleStatusChange : undefined}
              />
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
          </div>

          {user?.role !== 'TRAINER' && (
            <button
              onClick={handleOpenEdit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors shadow-xs self-start"
            >
              <Pencil size={13} /> Edit Course
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'
              }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab course={course} onEdit={handleOpenEdit} />}
      {tab === 'Syllabus' && <SyllabusTab courseId={courseId} />}
      {tab === 'Materials' && <MaterialsTab courseId={courseId} />}
      {tab === 'Batches' && <BatchesTab courseId={courseId} courseTitle={course.title} trainers={trainers} loadingTrainers={loadingTrainers} />}
      {tab === 'Enrolled Students' && (
        <EnrolledStudentsTab courseId={courseId} courseTitle={course.title} courseStatus={course.status} />
      )}

      {/* Edit Course Slide Panel */}
      <SlidePanel
        open={editingCourse}
        onClose={() => setEditingCourse(false)}
        title="Edit Course"
        isDirty={isCourseDirty}
      >
        <form onSubmit={handleSubmitCourse(onSaveCourse)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              {...registerCourse('title')}
              type="text"
              placeholder="Enter course title"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
            {courseErrors.title && <span className="text-xs text-red-500 mt-1 block">{courseErrors.title.message}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Course Code
              </label>
              <input
                {...registerCourse('courseCode')}
                type="text"
                placeholder="Enter course code"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 uppercase"
              />
              {courseErrors.courseCode && <span className="text-xs text-red-500 mt-1 block">{courseErrors.courseCode.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              {...registerCourse('description')}
              rows={4}
              placeholder="Enter course description"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            {courseErrors.description && <span className="text-xs text-red-500 mt-1 block">{courseErrors.description.message}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration *</label>
              <div className="flex gap-2">
                <input
                  {...registerCourse('durationValue', {
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
                  placeholder="Enter duration"
                  onKeyDown={e => {
                    if (['e', 'E', '+', '.'].includes(e.key)) e.preventDefault()
                  }}
                  className="w-1/2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
                <CustomSelect
                  value={watchCourse('durationUnit')}
                  onChange={(val) => setCourseValue('durationUnit', val, { shouldValidate: true })}
                  options={[
                    { value: 'days', label: 'Days' },
                    { value: 'weeks', label: 'Weeks' },
                    { value: 'months', label: 'Months' },
                    { value: 'years', label: 'Years' },
                  ]}
                />
              </div>
              {(courseErrors.durationValue || courseErrors.durationUnit) && (
                <span className="text-xs text-red-500 mt-1 block">
                  {courseErrors.durationValue?.message || courseErrors.durationUnit?.message || 'Duration is required'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Level *</label>
              <CustomSelect
                value={watchCourse('level')}
                onChange={(val) => setCourseValue('level', val, { shouldValidate: true })}
                options={[
                  { value: 'BEGINNER', label: 'BEGINNER' },
                  { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
                  { value: 'ADVANCED', label: 'ADVANCED' },
                ]}
              />
              {courseErrors.level && <span className="text-xs text-red-500 mt-1 block">{courseErrors.level.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status *</label>
              <CustomSelect
                value={watchCourse('status')}
                onChange={(val) => setCourseValue('status', val, { shouldValidate: true })}
                options={
                  course?.status === 'DRAFT'
                    ? [
                        { value: 'DRAFT', label: 'DRAFT' },
                        { value: 'PUBLISHED', label: 'PUBLISHED' },
                      ]
                    : course?.status === 'PUBLISHED'
                      ? [
                          { value: 'PUBLISHED', label: 'PUBLISHED' },
                          { value: 'ARCHIVED', label: 'ARCHIVED' },
                        ]
                      : [
                          { value: 'ARCHIVED', label: 'ARCHIVED' },
                          { value: 'PUBLISHED', label: 'PUBLISHED' },
                        ]
                }
              />
            {courseErrors.status && <span className="text-xs text-red-500 mt-1 block">{courseErrors.status.message}</span>}
            {course?.status === 'ARCHIVED' && (
              <p className="text-xs text-gray-500 mt-1">ARCHIVED can be published again (ARCHIVED → PUBLISHED).</p>
            )}
            {course?.status === 'PUBLISHED' && (
              <p className="text-xs text-gray-500 mt-1">PUBLISHED can only be archived. Content edits preserve published status.</p>
            )}
            {course?.status === 'DRAFT' && (
              <p className="text-xs text-gray-500 mt-1">DRAFT can be published (DRAFT → PUBLISHED).</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Thumbnail</label>
            <div className="flex gap-2">
              <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-xs font-semibold transition-colors">
                <Upload size={14} />
                <span>{uploadingThumb ? 'Uploading...' : 'Upload Thumbnail'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingThumb}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!file.type || !file.type.startsWith('image/')) {
                      toast.error('Thumbnail must be an image file (JPG, PNG, WebP, or GIF)')
                      e.target.value = ''
                      return
                    }
                    setUploadingThumb(true)
                    try {
                      const res = await courseContentService.uploadMaterial(file, 'OTHER')
                      const url = res?.data?.url || res?.url || res?.data?.fileUrl || res?.fileUrl
                      if (url) {
                        setCourseValue('thumbnail', url, { shouldValidate: true, shouldDirty: true })
                        toast.success('Thumbnail uploaded')
                      } else {
                        toast.error('Could not obtain uploaded image URL')
                      }
                    } catch (err) {
                      toast.error(err.message || 'Failed to upload image')
                    } finally {
                      setUploadingThumb(false)
                      e.target.value = ''
                    }
                  }}
                />
              </label>
            </div>
            {editThumbnailValue && (
              <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <img
                  src={resolveFileUrl(editThumbnailValue)}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEditingCourse(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCourse || isSubmittingCourse}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingCourse ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}

function OverviewTab({ course, onEdit }) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [course?.thumbnail])

  const hasValidThumbnail = Boolean(course?.thumbnail && !imgError)

  return (
    <div className="glass-card p-3 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
        <h2 className="font-display font-bold text-base text-gray-900 dark:text-white">Course Overview</h2>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors self-start"
        >
          <Pencil size={13} /> Edit Details
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 items-start">
        <div className="space-y-3 text-sm">
          <p className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
            <span className="text-gray-400">Status:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{course.status}</span>
          </p>
          <p className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
            <span className="text-gray-400">Level:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{course.level}</span>
          </p>
          <p className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
            <span className="text-gray-400">Duration:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{course.duration}</span>
          </p>
          <p className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
            <span className="text-gray-400">Course Code:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {course.courseCode ? (
                <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-xs font-bold">
                  {course.courseCode}
                </span>
              ) : (
                <span className="text-gray-400 italic text-xs">Not set</span>
              )}
            </span>
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-xs mb-1.5 font-medium">Course Visual</p>
          {hasValidThumbnail ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-44 w-full bg-gray-900 group shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveFileUrl(course.thumbnail)}
                alt={course.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="text-xs font-semibold text-white truncate max-w-[70%] drop-shadow-sm">
                  {course.title}
                </span>
                {course.level && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-900/70 text-purple-200 backdrop-blur-md border border-purple-400/30">
                    {course.level}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-purple-100 dark:border-purple-900/30 h-44 w-full bg-gradient-to-br from-purple-700 via-indigo-700 to-slate-900 p-4 flex flex-col justify-between shadow-sm">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-sm pointer-events-none" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-purple-400/20 blur-sm pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <BookOpen size={20} className="text-white" />
                </div>
                {course.level && (
                  <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20">
                    {course.level}
                  </span>
                )}
              </div>

              <div className="relative z-10 space-y-0.5">
                {course.courseCode && (
                  <span className="text-[10px] font-mono font-bold text-purple-200 tracking-wider uppercase">
                    {course.courseCode}
                  </span>
                )}
                <h3 className="font-display font-bold text-base text-white leading-tight line-clamp-1 drop-shadow-sm">
                  {course.title}
                </h3>
              </div>
            </div>
          )}
        </div>

        <div className="sm:col-span-2 pt-2">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Description</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{course.description}</p>
        </div>
      </div>
    </div>
  )
}

const EMPTY_MODULE_FORM = { title: '', description: '', status: 'PUBLISHED', durationValue: '', durationUnit: 'WEEKS' }
const EMPTY_TOPIC_FORM = { title: '', description: '', status: 'PUBLISHED', durationHours: '' }
const DURATION_UNITS = ['HOURS', 'DAYS', 'WEEKS']

function DurationInput({ value, unit, onValueChange, onUnitChange, small, onKeyDown }) {
  const size = small ? 'py-1.5 text-xs' : 'py-2 text-xs'
  return (
    <div className="flex gap-1">
      <input type="number" min="1" value={value} onChange={e => onValueChange(e.target.value)} placeholder="Duration"
        onKeyDown={onKeyDown}
        className={`w-16 sm:w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 ${size} outline-none focus:ring-2 focus:ring-purple-500`} />
      <CustomSelect
        value={unit}
        onChange={onUnitChange}
        options={DURATION_UNITS.map(u => ({ value: u, label: u.charAt(0) + u.slice(1).toLowerCase() }))}
        compact
      />
    </div>
  )
}

function formatDuration(value, unit) {
  if (!value) return null
  const label = (unit || 'WEEKS').toLowerCase()
  return `${value} ${value === 1 ? label.slice(0, -1) : label}`
}

function formatTime12h(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  if (isNaN(h)) return time24
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const hFormatted = String(h).padStart(2, '0')
  return `${hFormatted}:${m} ${ampm}`
}

function formatTimeForInput(val) {
  if (!val) return ''
  return String(val).slice(0, 5)
}

function calculateDuration(start, end) {
  if (!start || !end) return ''
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return ''
  const diff = (endH * 60 + endM) - (startH * 60 + startM)
  return diff > 0 ? String(diff) : ''
}

function StatusBadge({ status, onChange, disabled, title }) {
  const isDraft = status === 'DRAFT'
  const isArchived = status === 'ARCHIVED'

  let badgeStyle = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  let selectStyle = 'bg-emerald-100 text-emerald-700 border-emerald-300/70 hover:bg-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'

  if (isDraft) {
    badgeStyle = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    selectStyle = 'bg-amber-100 text-amber-700 border-amber-300/70 hover:bg-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
  } else if (isArchived) {
    badgeStyle = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    selectStyle = 'bg-red-100 text-red-700 border-red-300/70 hover:bg-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
  }

  if (!onChange) {
    return (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeStyle}`}>
        {status || 'PUBLISHED'}
      </span>
    )
  }

  return (
    <div className="relative inline-flex items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
      <CustomSelect
        value={status || 'PUBLISHED'}
        disabled={disabled}
        onChange={onChange}
        compact
        className={`!py-0.5 !px-2.5 !text-[11px] font-bold rounded-full border shadow-xs ${selectStyle}`}
        options={[
          { value: 'PUBLISHED', label: 'PUBLISHED' },
          { value: 'DRAFT', label: 'DRAFT' },
          { value: 'ARCHIVED', label: 'ARCHIVED' },
        ]}
      />
    </div>
  )
}

function CourseStatusBadge({ status, onChange, disabled }) {
  if (!onChange) {
    const colorClass = status === 'DRAFT'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : status === 'ARCHIVED'
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'

    return (
      <span
        className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${colorClass}`}
      >
        {status || 'DRAFT'}
      </span>
    )
  }

  const isDraft = status === 'DRAFT'
  const isArchived = status === 'ARCHIVED'
  const colorClass = isDraft
    ? 'bg-amber-100 text-amber-700 border-amber-300/70 hover:bg-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
    : isArchived
      ? 'bg-orange-100 text-orange-700 border-orange-300/70 hover:bg-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800'
      : 'bg-emerald-100 text-emerald-700 border-emerald-300/70 hover:bg-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'

  return (
    <div className="relative inline-flex items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
      <CustomSelect
        value={status || 'PUBLISHED'}
        disabled={disabled}
        onChange={onChange}
        compact
        className={`!py-1 !px-3 !text-xs font-semibold rounded-full border shadow-xs ${colorClass}`}
        options={
          isDraft
            ? [
                { value: 'DRAFT', label: 'DRAFT' },
                { value: 'PUBLISHED', label: 'PUBLISH' },
              ]
            : isArchived
              ? [
                  { value: 'ARCHIVED', label: 'ARCHIVED' },
                  { value: 'PUBLISHED', label: 'PUBLISH' },
                ]
              : [
                  { value: 'PUBLISHED', label: 'PUBLISHED' },
                  { value: 'ARCHIVED', label: 'ARCHIVE' },
                ]
        }
      />
    </div>
  )
}

function StatusSelect({ value, onChange, small }) {
  return (
    <CustomSelect
      value={value || 'PUBLISHED'}
      onChange={onChange}
      options={[
        { value: 'DRAFT', label: 'Draft' },
        { value: 'PUBLISHED', label: 'Published' },
        { value: 'ARCHIVED', label: 'Archived' },
      ]}
      compact={small}
    />
  )
}



function SyllabusMaterialBadge({ material }) {
  const [previewing, setPreviewing] = useState(false)
  return (
    <>
      <div
        onClick={() => setPreviewing(true)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/20 text-xs cursor-pointer hover:bg-purple-100/70 dark:hover:bg-purple-900/40 transition-colors"
        title={`Click to view: ${material.title}`}
      >
        <span className="text-sm flex-shrink-0">
          {material.type === 'PDF' ? '📄' : material.type === 'VIDEO' ? '🎬' : material.type === 'PRESENTATION' ? '🖥️' : material.type === 'LINK' ? '🔗' : '📁'}
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-200 break-words" title={material.title}>
          {material.title}
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase">
          {material.type}
        </span>
        {material.visibility && material.visibility !== 'PUBLISHED' && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">
            {material.visibility}
          </span>
        )}
        <span className="text-purple-600 hover:text-purple-800 ml-0.5">
          <Eye size={11} />
        </span>
      </div>
      {previewing && (
        <MaterialPreviewModal material={material} onClose={() => setPreviewing(false)} />
      )}
    </>
  )
}

function SyllabusTab({ courseId }) {
  const { user } = useAuth()
  const canManageSyllabus = ['SUPERADMIN', 'ADMIN'].includes(user?.role)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showAddModule, setShowAddModule] = useState(false)
  const [newModule, setNewModule] = useState(EMPTY_MODULE_FORM)
  const [showImportModal, setShowImportModal] = useState(false)

  // Module edit state
  const [editingModule, setEditingModule] = useState(null)

  // Topic add/edit state
  const [showAddTopic, setShowAddTopic] = useState({})
  const [newTopic, setNewTopic] = useState({})
  const [editingTopic, setEditingTopic] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState('PUBLISHED')
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null, name: '' })
  const [deleteLoading, setDeleteLoading] = useState(false)

  function openStatusModal(desiredStatus) {
    setTargetStatus(desiredStatus || 'PUBLISHED')
    setStatusModalOpen(true)
  }

  async function handleConfirmSyllabusStatus({ status: newStatus, includeTopics }) {
    setStatusUpdating(true)
    try {
      const res = await courseContentService.updateSyllabusStatus(courseId, newStatus, includeTopics)
      const data = res.data || res
      setModules(Array.isArray(data) ? data : (data?.data || []))
      toast.success(
        includeTopics
          ? `All modules and topics marked as ${newStatus}`
          : `All modules marked as ${newStatus}`
      )
      setStatusModalOpen(false)
    } catch {
      try {
        if (includeTopics) {
          await Promise.all(modules.map(async m => {
            await courseContentService.updateModule(m.id, {
              title: m.title,
              description: m.description || '',
              status: newStatus,
              durationValue: m.durationValue != null && m.durationValue !== '' ? Number(m.durationValue) : null,
              durationUnit: m.durationValue != null && m.durationValue !== '' ? (m.durationUnit || 'WEEKS') : null,
            })
            if (m.topics && m.topics.length > 0) {
              await Promise.all(m.topics.map(t =>
                courseContentService.updateTopic(t.id, {
                  title: t.title,
                  description: t.description || '',
                  status: newStatus,
                  durationHours: t.durationHours != null && t.durationHours !== '' ? Number(t.durationHours) : null,
                })
              ))
            }
          }))
          toast.success(`All modules and topics marked as ${newStatus}`)
        } else {
          await Promise.all(modules.map(m =>
            courseContentService.updateModule(m.id, {
              title: m.title,
              description: m.description || '',
              status: newStatus,
              durationValue: m.durationValue != null && m.durationValue !== '' ? Number(m.durationValue) : null,
              durationUnit: m.durationValue != null && m.durationValue !== '' ? (m.durationUnit || 'WEEKS') : null,
            })
          ))
          toast.success(`All modules marked as ${newStatus}`)
        }
        load()
        setStatusModalOpen(false)
      } catch (err) {
        toast.error(err.message || 'Failed to update syllabus status')
        load()
      }
    } finally {
      setStatusUpdating(false)
    }
  }

  async function updateModuleStatus(module, newStatus) {
    if (!module || !newStatus || module.status === newStatus) return
    setModules(prev => prev.map(m => m.id === module.id ? { ...m, status: newStatus } : m))
    try {
      await courseContentService.updateModule(module.id, {
        title: module.title,
        description: module.description || '',
        status: newStatus,
        durationValue: module.durationValue != null && module.durationValue !== '' ? Number(module.durationValue) : null,
        durationUnit: module.durationValue != null && module.durationValue !== '' ? (module.durationUnit || 'WEEKS') : null,
      })
      toast.success(`Module marked as ${newStatus}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update module status')
      load()
    }
  }

  async function updateTopicStatus(topic, newStatus) {
    if (!topic || !newStatus || topic.status === newStatus) return
    setModules(prev => prev.map(m => ({
      ...m,
      topics: (m.topics || []).map(t => t.id === topic.id ? { ...t, status: newStatus } : t)
    })))
    try {
      await courseContentService.updateTopic(topic.id, {
        title: topic.title,
        description: topic.description || '',
        status: newStatus,
        durationHours: topic.durationHours != null && topic.durationHours !== '' ? Number(topic.durationHours) : null,
      })
      toast.success(`Topic marked as ${newStatus}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update topic status')
      load()
    }
  }

  function promptDeleteModule(m) {
    setDeleteModal({
      open: true,
      type: 'module',
      id: m.id,
      name: m.title,
    })
  }

  function promptDeleteTopic(t) {
    setDeleteModal({
      open: true,
      type: 'topic',
      id: t.id,
      name: t.title,
    })
  }

  async function handleConfirmDelete() {
    if (!deleteModal.id) return
    setDeleteLoading(true)
    try {
      if (deleteModal.type === 'module') {
        await courseContentService.deleteModule(deleteModal.id)
        toast.success('Module deleted')
      } else if (deleteModal.type === 'topic') {
        await courseContentService.deleteTopic(deleteModal.id)
        toast.success('Topic deleted')
      }
      setDeleteModal({ open: false, type: null, id: null, name: '' })
      load()
    } catch {
      toast.error(`Failed to delete ${deleteModal.type || 'item'}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  const load = useCallback((isInitial = false) => {
    setLoading(true)
    courseContentService.getModules(courseId)
      .then(r => {
        const data = r.data || []
        setModules(data)
        setExpanded(prev => {
          if (isInitial || Object.keys(prev).length === 0) {
            const initialExpanded = {}
            data.forEach(m => { initialExpanded[m.id] = true })
            return initialExpanded
          }
          return prev
        })
      })
      .catch(() => toast.error('Failed to load syllabus'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { load(true) }, [load])

  function getModuleHours(durationValue, durationUnit) {
    if (!durationValue || isNaN(Number(durationValue)) || Number(durationValue) <= 0) return 0
    const val = Number(durationValue)
    const u = (durationUnit || 'WEEKS').toUpperCase()
    if (u === 'HOURS') return val
    if (u === 'DAYS') return val * 24
    if (u === 'WEEKS') return val * 7 * 24
    return val
  }

  // --- Module Actions ---
  async function addModule() {
    const title = (newModule.title || '').trim()
    if (!title) {
      toast.error('Module title is required')
      return
    }
    try {
      await courseContentService.createModule(courseId, {
        title,
        description: (newModule.description || '').trim(),
        status: newModule.status || 'PUBLISHED',
        durationValue: newModule.durationValue ? Number(newModule.durationValue) : null,
        durationUnit: newModule.durationValue ? newModule.durationUnit : null,
      })
      toast.success('Module created')
      setNewModule(EMPTY_MODULE_FORM)
      setShowAddModule(false)
      load()
    } catch (err) { toast.error(err.message || 'Failed to add module') }
  }

  function openEditModule(m) {
    setEditingModule({
      id: m.id,
      title: m.title || '',
      description: m.description || '',
      status: m.status || 'PUBLISHED',
      durationValue: m.durationValue ? String(m.durationValue) : '',
      durationUnit: m.durationUnit || 'WEEKS',
    })
  }

  async function saveModuleEdit() {
    if (!editingModule) return
    const title = (editingModule.title || '').trim()
    if (!title) {
      toast.error('Module title is required')
      return
    }
    if (editingModule.durationValue) {
      const newModuleHours = getModuleHours(editingModule.durationValue, editingModule.durationUnit)
      const existingModule = modules.find(m => m.id === editingModule.id)
      const totalTopicsHours = (existingModule?.topics || []).reduce((sum, t) => sum + (t.durationHours || 0), 0)
      if (totalTopicsHours > 0 && newModuleHours < totalTopicsHours) {
        toast.error(`Module duration (${newModuleHours}h) cannot be less than total topic duration (${totalTopicsHours}h)`)
        return
      }
    }
    try {
      await courseContentService.updateModule(editingModule.id, {
        title,
        description: (editingModule.description || '').trim(),
        status: editingModule.status || 'PUBLISHED',
        durationValue: editingModule.durationValue ? Number(editingModule.durationValue) : null,
        durationUnit: editingModule.durationValue ? editingModule.durationUnit : null,
      })
      toast.success('Module updated')
      setEditingModule(null)
      load()
    } catch (err) { toast.error(err.message || 'Failed to update module') }
  }

  async function deleteModule(id) {
    setDeleteModal({ open: true, type: 'module', id, name: '' })
  }

  async function moveModule(idx, direction) {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= modules.length) return
    const reordered = [...modules]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(targetIdx, 0, moved)
    setModules(reordered)
    try {
      await courseContentService.reorderModules(courseId, reordered.map(m => m.id))
    } catch { toast.error('Failed to reorder'); load() }
  }

  // --- Topic Actions ---
  async function addTopic(moduleId) {
    const topicForm = newTopic[moduleId] || EMPTY_TOPIC_FORM
    const title = (topicForm.title || '').trim()
    if (!title) {
      toast.error('Topic title is required')
      return
    }

    const topicHours = topicForm.durationHours ? Number(topicForm.durationHours) : 0
    if (topicHours < 0) {
      toast.error('Topic duration cannot be negative')
      return
    }
    if (topicHours > 0) {
      const module = modules.find(m => m.id === moduleId)
      const moduleHours = getModuleHours(module?.durationValue, module?.durationUnit)
      if (!moduleHours) {
        toast.error('Please set the module duration before adding topic duration')
        return
      }
      const existingTopicHours = (module?.topics || []).reduce((sum, t) => sum + (t.durationHours || 0), 0)
      if (existingTopicHours + topicHours > moduleHours) {
        toast.error(`Topic duration (${existingTopicHours + topicHours}h) cannot exceed module duration (${moduleHours}h)`)
        return
      }
    }

    try {
      await courseContentService.createTopic(moduleId, {
        title,
        description: (topicForm.description || '').trim(),
        status: topicForm.status || 'PUBLISHED',
        durationHours: topicForm.durationHours ? Number(topicForm.durationHours) : null,
      })
      toast.success('Topic added')
      setNewTopic(prev => ({ ...prev, [moduleId]: EMPTY_TOPIC_FORM }))
      setShowAddTopic(prev => ({ ...prev, [moduleId]: false }))
      load()
    } catch (err) { toast.error(err.message || 'Failed to add topic') }
  }

  function openEditTopic(t) {
    setEditingTopic({
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'PUBLISHED',
      durationHours: t.durationHours ? String(t.durationHours) : '',
    })
  }

  async function saveTopicEdit() {
    if (!editingTopic) return
    const title = (editingTopic.title || '').trim()
    if (!title) {
      toast.error('Topic title is required')
      return
    }
    const topicHours = editingTopic.durationHours ? Number(editingTopic.durationHours) : 0
    if (topicHours < 0) {
      toast.error('Topic duration cannot be negative')
      return
    }
    if (topicHours > 0) {
      const module = modules.find(m => (m.topics || []).some(t => t.id === editingTopic.id))
      const moduleHours = getModuleHours(module?.durationValue, module?.durationUnit)
      if (!moduleHours) {
        toast.error('Please set the module duration before setting topic duration')
        return
      }
      const otherTopicsHours = (module?.topics || [])
        .filter(t => t.id !== editingTopic.id)
        .reduce((sum, t) => sum + (t.durationHours || 0), 0)
      if (otherTopicsHours + topicHours > moduleHours) {
        toast.error(`Topic duration (${otherTopicsHours + topicHours}h) cannot exceed module duration (${moduleHours}h)`)
        return
      }
    }

    try {
      await courseContentService.updateTopic(editingTopic.id, {
        title,
        description: (editingTopic.description || '').trim(),
        status: editingTopic.status || 'PUBLISHED',
        durationHours: editingTopic.durationHours ? Number(editingTopic.durationHours) : null,
      })
      toast.success('Topic updated')
      setEditingTopic(null)
      load()
    } catch (err) { toast.error(err.message || 'Failed to update topic') }
  }

  async function deleteTopic(id) {
    setDeleteModal({ open: true, type: 'topic', id, name: '' })
  }

  async function moveTopic(moduleId, currentTopics, idx, direction) {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= currentTopics.length) return
    const reordered = [...currentTopics]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(targetIdx, 0, moved)

    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, topics: reordered } : m))
    try {
      await courseContentService.reorderTopics(moduleId, reordered.map(t => t.id))
    } catch { toast.error('Failed to reorder'); load() }
  }

  if (loading) return <div className="glass-card p-8 animate-pulse h-40" />

  return (
    <div className="glass-card p-3 sm:p-5 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Syllabus</h2>
          <p className="text-xs text-gray-500">
            {modules.length} {modules.length === 1 ? 'module' : 'modules'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {modules.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allExpanded = modules.every(m => expanded[m.id])
                const next = {}
                modules.forEach(m => { next[m.id] = !allExpanded })
                setExpanded(next)
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors"
            >
              {modules.every(m => expanded[m.id]) ? 'Collapse All' : 'Expand All'}
            </button>
          )}
          {canManageSyllabus && modules.length > 0 && (
            <div className="relative inline-flex items-center">
              <CustomSelect
                disabled={statusUpdating}
                value=""
                onChange={(val) => {
                  if (val) openStatusModal(val)
                }}
                options={[
                  { value: 'PUBLISHED', label: 'Publish All...' },
                  { value: 'DRAFT', label: 'Draft All...' },
                ]}
                placeholder={statusUpdating ? 'Updating...' : 'Syllabus Status'}
              />
            </div>
          )}
          {canManageSyllabus && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-1.5 border border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Upload size={14} /> Import Syllabus
            </button>
          )}
          {canManageSyllabus && (
            <button
              type="button"
              onClick={() => setShowAddModule(s => !s)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {showAddModule ? 'Cancel' : <><Plus size={14} /> Add Module</>}
            </button>
          )}
        </div>
      </div>

      {/* Add Module Form (Revealed upon clicking + Add Module) */}
      {showAddModule && (
        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
          <p className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">New Module</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              value={newModule.title}
              onChange={e => setNewModule(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addModule()}
              placeholder="New module title *"
              className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
            <StatusSelect value={newModule.status} onChange={v => setNewModule(f => ({ ...f, status: v }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              value={newModule.description}
              onChange={e => setNewModule(f => ({ ...f, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addModule()}
              placeholder="Module description (optional)"
              className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
            <DurationInput
              value={newModule.durationValue}
              unit={newModule.durationUnit}
              onValueChange={v => setNewModule(f => ({ ...f, durationValue: v }))}
              onUnitChange={u => setNewModule(f => ({ ...f, durationUnit: u }))}
              onKeyDown={e => e.key === 'Enter' && addModule()}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowAddModule(false); setNewModule(EMPTY_MODULE_FORM) }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addModule}
              disabled={!newModule.title.trim()}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Plus size={14} /> Create Module
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {modules.length === 0 && !showAddModule && (
        <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No modules in syllabus yet</p>
          <p className="text-xs text-gray-400 mb-4">Start by adding the first module to build your course syllabus.</p>
          <button
            type="button"
            onClick={() => setShowAddModule(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> Add First Module
          </button>
        </div>
      )}

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((m, i) => {
          const isModuleEditing = editingModule?.id === m.id
          const hasModuleMaterials = m.materials && m.materials.length > 0
          const topics = m.topics || []

          return (
            <div key={m.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
              {/* Module Header or Edit Form */}
              {isModuleEditing ? (
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 space-y-3 border-b border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Edit Module {i + 1}
                    </span>
                    <StatusSelect small value={editingModule.status} onChange={v => setEditingModule(f => ({ ...f, status: v }))} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-gray-400 mb-1">Module Title *</label>
                      <input
                        value={editingModule.title}
                        onChange={e => setEditingModule(f => ({ ...f, title: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Duration</label>
                      <DurationInput
                        small
                        value={editingModule.durationValue}
                        unit={editingModule.durationUnit}
                        onValueChange={v => setEditingModule(f => ({ ...f, durationValue: v }))}
                        onUnitChange={u => setEditingModule(f => ({ ...f, durationUnit: u }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Description (optional)</label>
                    <textarea
                      rows={2}
                      value={editingModule.description}
                      onChange={e => setEditingModule(f => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingModule(null)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveModuleEdit}
                      disabled={!editingModule.title.trim()}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                      className="flex items-center gap-1.5 flex-1 text-left min-w-0"
                    >
                      <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-gray-400 flex-shrink-0">
                        {expanded[m.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-words">
                        {m.title}
                      </span>
                    </button>
                    {canManageSyllabus && (
                      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditModule(m)}
                          className="w-7 h-7 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center transition-colors"
                          title="Edit Module"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDeleteModule(m)}
                          title="Delete Module"
                          className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 pl-8">
                    <StatusBadge
                      status={m.status}
                      title="Click to switch module status"
                      onChange={(newStatus) => updateModuleStatus(m, newStatus)}
                    />
                    {canManageSyllabus && expanded[m.id] && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveModule(i, -1)}
                          disabled={i === 0}
                          title="Move Up"
                          className="px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 flex items-center gap-0.5 text-[10px] text-gray-500 transition-colors"
                        >
                          <ChevronUp size={10} /> Up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveModule(i, 1)}
                          disabled={i === modules.length - 1}
                          title="Move Down"
                          className="px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 flex items-center gap-0.5 text-[10px] text-gray-500 transition-colors"
                        >
                          <ChevronDown size={10} /> Dn
                        </button>
                      </>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">
                      {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
                      {formatDuration(m.durationValue, m.durationUnit) && ` · ${formatDuration(m.durationValue, m.durationUnit)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Module Description & Materials */}
              {m.description && !isModuleEditing && (
                <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                  {m.description}
                </p>
              )}

              {hasModuleMaterials && !isModuleEditing && (
                <div className="px-4 py-2 bg-purple-50/30 dark:bg-purple-950/10 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Module Materials:</span>
                  {m.materials.map(mat => (
                    <SyllabusMaterialBadge key={mat.id} material={mat} />
                  ))}
                </div>
              )}

              {/* Module Expanded Content: Topics & Sessions */}
              {expanded[m.id] && (
                <div className="p-4 space-y-3 bg-gray-50/30 dark:bg-gray-900/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Topics ({topics.length})
                    </span>
                    {canManageSyllabus && (
                      <button
                        type="button"
                        onClick={() => setShowAddTopic(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1"
                      >
                        <Plus size={12} /> {showAddTopic[m.id] ? 'Cancel' : 'Add Topic'}
                      </button>
                    )}
                  </div>

                  {/* Add Topic Form */}
                  {showAddTopic[m.id] && (
                    <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-white dark:bg-gray-900 space-y-2">
                      <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">New Topic</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={(newTopic[m.id] || EMPTY_TOPIC_FORM).title}
                          onChange={e => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), title: e.target.value } }))}
                          placeholder="New topic title *"
                          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="number"
                          min="1"
                          value={(newTopic[m.id] || EMPTY_TOPIC_FORM).durationHours}
                          onChange={e => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), durationHours: e.target.value } }))}
                          placeholder="Hours"
                          className="w-full sm:w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <StatusSelect
                          small
                          value={(newTopic[m.id] || EMPTY_TOPIC_FORM).status}
                          onChange={v => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), status: v } }))}
                        />
                      </div>
                      <input
                        value={(newTopic[m.id] || EMPTY_TOPIC_FORM).description}
                        onChange={e => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), description: e.target.value } }))}
                        placeholder="Topic description (optional)"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddTopic(prev => ({ ...prev, [m.id]: false }))}
                          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => addTopic(m.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Add Topic
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Topics Listing */}
                  {topics.length === 0 && !showAddTopic[m.id] ? (
                    <p className="text-xs text-gray-400 py-2 italic">No topics in this module yet.</p>
                  ) : (
                    topics.map((t, ti) => {
                      const isTopicEditing = editingTopic?.id === t.id
                      const hasTopicMaterials = t.materials && t.materials.length > 0

                      return (
                        <div key={t.id} className="p-3 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 space-y-2.5">
                          {/* Topic Item or Edit Form */}
                          {isTopicEditing ? (
                            <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 space-y-2 border border-purple-200 dark:border-purple-800">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">Edit Topic</span>
                                <StatusSelect small value={editingTopic.status} onChange={v => setEditingTopic(f => ({ ...f, status: v }))} />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  value={editingTopic.title}
                                  onChange={e => setEditingTopic(f => ({ ...f, title: e.target.value }))}
                                  placeholder="Topic title *"
                                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <input
                                  type="number"
                                  min="1"
                                  value={editingTopic.durationHours}
                                  onChange={e => setEditingTopic(f => ({ ...f, durationHours: e.target.value }))}
                                  placeholder="Hours"
                                  className="w-full sm:w-20 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                              <input
                                value={editingTopic.description}
                                onChange={e => setEditingTopic(f => ({ ...f, description: e.target.value }))}
                                placeholder="Topic description (optional)"
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTopic(null)}
                                  className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveTopicEdit}
                                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold"
                                >
                                  Save Topic
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-0 break-words flex-1">
                                  {t.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge
                                  status={t.status}
                                  title="Click to switch topic status"
                                  onChange={(newStatus) => updateTopicStatus(t, newStatus)}
                                />
                                {canManageSyllabus && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditTopic(t)}
                                      className="w-6 h-6 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center"
                                      title="Edit Topic"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => promptDeleteTopic(t)}
                                      title="Delete Topic"
                                      className="w-6 h-6 rounded hover:bg-red-100 text-red-500 flex items-center justify-center"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </>
                                )}
                              </div>
                              {(t.durationHours || t.description) && (
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  {t.durationHours && (
                                    <span className="flex items-center gap-0.5">
                                      <Clock size={10} /> {t.durationHours}h
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {t.description && !isTopicEditing && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">{t.description}</p>
                          )}

                          {/* Topic Materials */}
                          {hasTopicMaterials && (
                            <div className="flex flex-wrap items-center gap-1.5 pl-1 pt-1">
                              {t.materials.map(mat => (
                                <SyllabusMaterialBadge key={mat.id} material={mat} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ImportSyllabusModal
        courseId={courseId}
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => load()}
      />

      {/* Syllabus Bulk Status Modal */}
      <SyllabusStatusModal
        open={statusModalOpen}
        initialStatus={targetStatus}
        moduleCount={modules.length}
        topicCount={modules.reduce((sum, m) => sum + (m.topics?.length || 0), 0)}
        loading={statusUpdating}
        onClose={() => setStatusModalOpen(false)}
        onConfirm={handleConfirmSyllabusStatus}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.open}
        loading={deleteLoading}
        onClose={() => setDeleteModal({ open: false, type: null, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.type === 'module' ? 'Delete Module?' : 'Delete Topic?'}
        itemName={deleteModal.name}
        message={deleteModal.type === 'module'
          ? 'Are you sure you want to delete this module and all its topics? This action cannot be undone.'
          : 'Are you sure you want to delete this topic? This action cannot be undone.'}
      />
    </div>
  )
}

function MaterialsTab({ courseId }) {
  const { user } = useAuth()
  const canManageMaterials = ['SUPERADMIN', 'ADMIN'].includes(user?.role)
  const [modules, setModules] = useState([])
  const [scope, setScope] = useState('COURSE')
  const [moduleId, setModuleId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'PDF', url: '', description: '', visibility: 'PUBLISHED' })
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState(null)
  const [materialDeleteModal, setMaterialDeleteModal] = useState({ open: false, id: null })

  useEffect(() => {
    courseContentService.getModules(courseId).then(r => setModules(r.data || [])).catch(() => { })
  }, [courseId])

  const topics = modules.find(m => String(m.id) === String(moduleId))?.topics || []

  const ownerId = scope === 'COURSE' ? courseId : scope === 'MODULE' ? moduleId : topicId
  const ownerParamKey = { COURSE: 'courseId', MODULE: 'moduleId', TOPIC: 'topicId' }[scope]

  const load = useCallback(() => {
    if (!ownerId) { setMaterials([]); return }
    setLoading(true)
    courseContentService.getMaterials({ [ownerParamKey]: ownerId })
      .then(r => setMaterials(r.data || []))
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setLoading(false))
  }, [ownerId, ownerParamKey])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setForm({ title: '', type: 'PDF', url: '', description: '', visibility: 'PUBLISHED' })
    setEditingId(null)
    setErrors({})
  }

  function openEdit(m) {
    if (!canManageMaterials) return
    setEditingId(m.id)
    setForm({ title: m.title, type: m.type, url: m.url, description: m.description || '', visibility: m.visibility || 'PUBLISHED' })
    setErrors({})
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canManageMaterials) {
      toast.error('Only administrators can manage course materials')
      return
    }
    if (!editingId && !ownerId) { toast.error('Select a target first'); return }

    const newErrors = {}
    if (!form.title?.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!form.url?.trim()) {
      newErrors.url = 'File / URL is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    setSaving(true)
    try {
      const payload = { title: form.title.trim(), type: form.type, url: form.url.trim(), description: form.description, visibility: form.visibility }
      if (editingId) {
        await courseContentService.updateMaterial(editingId, payload)
        toast.success('Material updated')
      } else {
        await courseContentService.createMaterial({ ...payload, [ownerParamKey]: Number(ownerId) })
        toast.success('Material added')
      }
      resetForm()
      load()
    } catch (err) { toast.error(err.message || 'Failed to save material') } finally { setSaving(false) }
  }

  async function handleUpload(e) {
    if (!canManageMaterials) {
      toast.error('Only administrators can upload materials')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowed = form.type && ALLOWED_EXTENSIONS_BY_TYPE[form.type]
      ? ALLOWED_EXTENSIONS_BY_TYPE[form.type]
      : Object.values(ALLOWED_EXTENSIONS_BY_TYPE).flat()

    if (ext && !allowed.includes(ext)) {
      toast.error(`File type not allowed: .${ext}`)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const res = await courseContentService.uploadMaterial(file, form.type)
      setForm(f => ({ ...f, url: res.data.url, title: f.title || res.data.originalName }))
      setErrors(prev => ({
        ...prev,
        url: '',
        ...(res.data?.originalName ? { title: '' } : {})
      }))
      toast.success('File uploaded')
    } catch (err) { toast.error(err.message || 'Upload failed') } finally { setUploading(false); e.target.value = '' }
  }

  async function handleDelete(id) {
    if (!canManageMaterials) {
      toast.error('Only administrators can delete materials')
      return
    }
    setMaterialDeleteModal({ open: true, id })
  }

  async function handleConfirmMaterialDelete() {
    if (!materialDeleteModal.id) return
    try {
      await courseContentService.deleteMaterial(materialDeleteModal.id)
      setMaterialDeleteModal({ open: false, id: null })
      load()
    } catch { toast.error('Failed to delete material') }
  }

  async function moveMaterial(index, direction) {
    if (!canManageMaterials) {
      toast.error('Only administrators can reorder materials')
      return
    }
    const newOrder = [...materials]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) return
      ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setMaterials(newOrder)
    try { await courseContentService.reorderMaterials(newOrder.map(m => m.id)) } catch { toast.error('Failed to reorder'); load() }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {['COURSE', 'MODULE', 'TOPIC'].map(s => (
            <button key={s} onClick={() => { setScope(s); setModuleId(''); setTopicId('') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${scope === s ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {s === 'COURSE' ? 'Course-level' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {(scope === 'MODULE' || scope === 'TOPIC') && (
          <CustomSelect
            value={moduleId}
            onChange={(val) => { setModuleId(val); setTopicId('') }}
            options={modules.map(m => ({ value: m.id, label: m.title }))}
            placeholder="Select module..."
            clearable
          />
        )}
        {scope === 'TOPIC' && (
          <CustomSelect
            value={topicId}
            onChange={(val) => setTopicId(val)}
            disabled={!moduleId}
            options={topics.map(t => ({ value: t.id, label: t.title }))}
            placeholder="Select topic..."
            clearable
          />
        )}
      </div>

      {!ownerId ? (
        <div className="glass-card p-10 text-center text-gray-400 text-sm">
          {canManageMaterials ? 'Pick a target above to manage its materials.' : 'Pick a target above to view its materials.'}
        </div>
      ) : (
        <div className={canManageMaterials ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
          {canManageMaterials && (
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{editingId ? 'Edit Material' : 'Add Material'}</p>
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <div>
                  <input
                    value={form.title}
                    onChange={e => {
                      setForm(f => ({ ...f, title: e.target.value }))
                      if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
                    }}
                    placeholder="Title *"
                    className={`w-full rounded-xl border ${
                      errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                    } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2`}
                  />
                  {errors.title && <span className="text-xs text-red-500 mt-1 block">{errors.title}</span>}
                </div>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CustomSelect
                    value={form.type}
                    onChange={(val) => setForm(f => ({ ...f, type: val }))}
                    options={MATERIAL_TYPES.map(t => ({ value: t, label: t }))}
                  />
                  <StatusSelect value={form.visibility} onChange={v => setForm(f => ({ ...f, visibility: v }))} />
                </div>
                <div>
                  <input
                    value={form.url}
                    onChange={e => {
                      setForm(f => ({ ...f, url: e.target.value }))
                      if (errors.url) setErrors(prev => ({ ...prev, url: '' }))
                    }}
                    placeholder="URL (or upload a file below) *"
                    className={`w-full rounded-xl border ${
                      errors.url ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                    } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2`}
                  />
                  {errors.url && <span className="text-xs text-red-500 mt-1 block">{errors.url}</span>}
                </div>
                <label className="flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload file instead'}
                  <input
                    type="file"
                    className="hidden"
                    accept={ALLOWED_EXTENSIONS_BY_TYPE[form.type] ? ALLOWED_EXTENSIONS_BY_TYPE[form.type].map(ext => `.${ext}`).join(',') : undefined}
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
                <div className="flex gap-2">
                  {editingId && <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20"
                  >
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Material'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Materials</p>
            {loading ? <div className="h-24 animate-pulse bg-gray-100 rounded-xl" /> : materials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No materials yet.</p>
            ) : (
              <div className="space-y-2">
                {materials.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100/70 dark:hover:bg-gray-750 transition-colors">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setPreviewMaterial(m)}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 break-words hover:text-purple-600 dark:hover:text-purple-400 transition-colors" title={m.title}>
                          {m.title}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0 whitespace-nowrap">
                          {m.type}
                        </span>
                        <StatusBadge status={m.visibility} />
                      </div>
                      {m.description && <p className="text-xs text-gray-400 break-words">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => setPreviewMaterial(m)} title="Preview Material" className="w-7 h-7 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center cursor-pointer"><Eye size={13} /></button>
                      {canManageMaterials && (
                        <>
                          <button onClick={() => moveMaterial(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={12} /></button>
                          <button onClick={() => moveMaterial(i, 1)} disabled={i === materials.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={12} /></button>
                          <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-lg hover:bg-purple-100 text-purple-600 flex items-center justify-center"><Pencil size={12} /></button>
                          <button onClick={() => handleDelete(m.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {previewMaterial && (
        <MaterialPreviewModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      <DeleteConfirmModal
        isOpen={materialDeleteModal.open}
        onClose={() => setMaterialDeleteModal({ open: false, id: null })}
        onConfirm={handleConfirmMaterialDelete}
        title="Delete Material?"
        message="Are you sure you want to delete this material? This action cannot be undone."
      />
    </div>
  )
}

function BatchesTab({ courseId, courseTitle, trainers = [], loadingTrainers = false }) {
  const { user } = useAuth()
  const canCreateBatch = ['SUPERADMIN', 'ADMIN'].includes(user?.role)
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30, trainerIds: [] })
  const [saving, setSaving] = useState(false)

  // Clean Time Pickers
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')

  const load = useCallback(() => {
    setLoading(true)
    batchService.list()
      .then(r => {
        let list = (r.data || []).filter(b => String(b.course?.id) === String(courseId))
        if (user?.role === 'TRAINER' && user?.id) {
          list = list.filter(b => (b.trainers || []).some(t => t.id === user.id))
        }
        setBatches(list)
      })
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false))
  }, [courseId, user?.role, user?.id])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canCreateBatch) {
      toast.error('Only Super Admins and Admins can create batches')
      return
    }
    setSaving(true)
    const formattedTiming = startTime && endTime ? `${formatTime12h(startTime)} - ${formatTime12h(endTime)}` : ''
    try {
      await batchService.create({
        ...form,
        timing: formattedTiming,
        courseId: Number(courseId),
        trainerIds: form.trainerIds.map(Number),
        maxStudents: Number(form.maxStudents),
      })
      toast.success('Batch created')
      setShowForm(false)
      setForm({ name: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30, trainerIds: [] })
      load()
    } catch (err) { toast.error(err.message || 'Failed to create batch') } finally { setSaving(false) }
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-gray-500">Batches running for <span className="font-semibold text-gray-700 dark:text-gray-200">{courseTitle}</span></p>
        {canCreateBatch && (
          <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold">
            <Plus size={13} /> {showForm ? 'Cancel' : 'New Batch'}
          </button>
        )}
      </div>

      {canCreateBatch && showForm && (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter batch name"
              className="w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Trainers (Optional)</label>
            <MultiSelect
              value={form.trainerIds}
              onChange={(vals) => setForm(f => ({ ...f, trainerIds: vals.map(String) }))}
              disabled={loadingTrainers}
              options={trainers.filter(t => t.active === true).map(t => ({
                value: String(t.id),
                label: t.name + (t.designation ? ` · ${t.designation}` : ''),
              }))}
              placeholder={loadingTrainers ? 'Loading trainers...' : 'Select trainers (optional)'}
              searchable
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
            <input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={form.startDate}
              onChange={e => {
                const newStart = e.target.value
                setForm(f => ({
                  ...f,
                  startDate: newStart,
                  endDate: f.endDate && newStart && f.endDate < newStart ? '' : f.endDate,
                }))
              }}
              className="w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
            <input
              required
              type="date"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mode *</label>
            <CustomSelect
              value={form.mode}
              onChange={(val) => setForm(f => ({ ...f, mode: val }))}
              options={[
                { value: 'ONLINE', label: 'ONLINE' },
                { value: 'OFFLINE', label: 'OFFLINE' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Students *</label>
            <input type="number" min="1" max="500" value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))} placeholder="Max students"
              className="w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {(() => {
            const isNewBatchValid = Boolean(
              form.name?.trim() &&
              form.startDate &&
              form.endDate &&
              form.startDate <= form.endDate &&
              (!startTime || !endTime || startTime < endTime) &&
              form.mode &&
              form.maxStudents &&
              Number(form.maxStudents) >= 1 &&
              Number(form.maxStudents) <= 500
            )
            return (
              <button
                type="submit"
                disabled={saving || !isNewBatchValid}
                className="sm:col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-500/20"
              >
                {saving ? 'Creating...' : 'Create Batch'}
              </button>
            )
          })()}
        </form>
      )}

      {loading ? <div className="h-24 animate-pulse bg-gray-100 rounded-xl" /> : batches.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No batches for this course yet.</p>
      ) : (
        <div className="space-y-2">
          {batches.map(b => (
            <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 break-words">{b.name}</p>
                <p className="text-xs text-gray-400 break-words">{b.startDate} — {b.endDate} · {b.mode} · {b.timing}</p>
              </div>
              <Link href="/admin/batches" className="text-xs font-semibold text-purple-600 hover:underline flex-shrink-0">Manage in Batches</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
