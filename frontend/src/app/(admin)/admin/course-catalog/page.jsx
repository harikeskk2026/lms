'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Clock, BarChart2, FolderOpen, Eye, EyeOff, Search, Archive, RotateCcw, X, Upload, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import { resolveFileUrl } from '@/lib/api'
import { courseSchema } from '@/validations/courseValidation'
import SlidePanel from '@/components/admin/SlidePanel'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

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

const EMPTY_FORM = { title: '', courseCode: '', slug: '', description: '', duration: '', level: 'BEGINNER', thumbnail: '', status: 'DRAFT' }

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
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingCourse, setDeletingCourse] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const thumbFileInputRef = useRef(null)

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
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(courseSchema), defaultValues: EMPTY_FORM })

  const thumbnailValue = watch('thumbnail')

  const load = useCallback(() => {
    setLoading(true)
    courseService.list()
      .then(r => setCourses(r.data || []))
      .catch(err => toast.error(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingId(null)
    setEditingCourseStatus(null)
    reset(EMPTY_FORM)
    setPanelOpen(true)
  }

  function openEdit(course) {
    setEditingId(course.id)
    setEditingCourseStatus(course.status)
    reset({
      title: course.title,
      courseCode: course.courseCode || '',
      slug: course.slug || '',
      description: course.description,
      duration: course.duration,
      level: course.level,
      thumbnail: course.thumbnail || '',
      status: course.status,
    })
    setPanelOpen(true)
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      if (editingId) {
        await courseService.update(editingId, data)
        toast.success('Course updated')
      } else {
        await courseService.create(data)
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
    ALL: courses.length,
    DRAFT: courses.filter(c => c.status === 'DRAFT').length,
    PUBLISHED: courses.filter(c => c.status === 'PUBLISHED').length,
    ARCHIVED: courses.filter(c => c.status === 'ARCHIVED').length,
  }

  const filteredCourses = courses.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    const q = searchQuery.trim().toLowerCase()
    if (!q) return matchesStatus

    const titleMatch = Boolean(c.title && c.title.toLowerCase().includes(q))
    const slugMatch = Boolean(c.slug && c.slug.toLowerCase().includes(q))
    const levelMatch = Boolean(c.level && c.level.toLowerCase().includes(q))
    return matchesStatus && (titleMatch || slugMatch || levelMatch)
  })

  if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'TRAINER') {
    return null
  }

  const isTrainer = user?.role === 'TRAINER'

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
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
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 glass-card animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-400">
          {isTrainer ? 'No courses associated with your assigned batches yet.' : 'No courses yet.'}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400 space-y-2">
          <p className="text-sm">No courses matching your filter.</p>
          <button
            onClick={() => { setStatusFilter('ALL'); setSearchQuery('') }}
            className="text-xs text-purple-600 font-semibold hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map(c => (
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
                <span className="flex items-center gap-1"><BarChart2 size={11} /> {c.slug}</span>
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

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input {...register('title')} placeholder="Full Stack Python"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.title && <span className="text-xs text-red-500 mt-1 block">{errors.title.message}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Course Code
              </label>
              <input {...register('courseCode')} placeholder="e.g. PY-101"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 uppercase" />
              {errors.courseCode && <span className="text-xs text-red-500 mt-1 block">{errors.courseCode.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Slug <span className="text-xs text-gray-400 font-normal">(URL Key)</span>
              </label>
              <input {...register('slug')} placeholder="e.g. python-2"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs lowercase" />
              {errors.slug && <span className="text-xs text-red-500 mt-1 block">{errors.slug.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea {...register('description')} rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            {errors.description && <span className="text-xs text-red-500 mt-1 block">{errors.description.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration *</label>
            <input {...register('duration')} placeholder="3 months"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.duration && <span className="text-xs text-red-500 mt-1 block">{errors.duration.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Level *</label>
            <select {...register('level')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
            {errors.level && <span className="text-xs text-red-500 mt-1 block">{errors.level.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status *</label>
            <select {...register('status')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              {!editingId && (
                <>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </>
              )}
              {editingId && (
                <>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </>
              )}
            </select>
            {errors.status && <span className="text-xs text-red-500 mt-1 block">{errors.status.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Thumbnail</label>
            <div className="flex gap-2">
              <input
                {...register('thumbnail')}
                placeholder="https://... or upload image"
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                ref={thumbFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
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
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Upload size={14} />
                {uploadingThumb ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {thumbnailValue && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-36 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative group">
                <img
                  src={resolveFileUrl(thumbnailValue)}
                  alt="Thumbnail preview"
                  className="w-full h-36 object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setValue('thumbnail', '', { shouldValidate: true, shouldDirty: true })}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                  title="Remove thumbnail"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60 hover:from-purple-700 hover:to-violet-700 transition-colors">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </SlidePanel>

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

