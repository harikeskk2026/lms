'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Upload, ExternalLink, Clock, BookOpen, Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import batchService from '@/services/batchService'
import EnrolledStudentsTab from '@/components/admin/course/EnrolledStudentsTab'
import { resolveFileUrl, adminApi } from '@/lib/api'

import SlidePanel from '@/components/admin/SlidePanel'

const TABS = ['Overview', 'Syllabus', 'Sessions', 'Materials', 'Batches', 'Enrolled Students']
const MATERIAL_TYPES = ['PDF', 'DOCUMENT', 'PRESENTATION', 'VIDEO', 'LINK', 'OTHER']
const ALLOWED_EXTENSIONS_BY_TYPE = {
  PDF: ['pdf'],
  DOCUMENT: ['doc', 'docx', 'txt', 'rtf', 'odt'],
  PRESENTATION: ['ppt', 'pptx'],
  VIDEO: ['mp4', 'mov', 'webm', 'mkv', 'avi'],
  OTHER: ['csv', 'xls', 'xlsx', 'txt', 'zip', 'rar', '7z', 'tar', 'gz', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
}
const EMPTY_SESSION = {
  title: '', description: '', trainerName: '', sessionDate: '', startTime: '', endTime: '',
  durationMinutes: '', type: 'LIVE', meetingUrl: '', recordingUrl: '', status: 'PUBLISHED',
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
  const [editForm, setEditForm] = useState({
    title: '',
    courseCode: '',
    slug: '',
    description: '',
    duration: '',
    level: 'BEGINNER',
    status: 'PUBLISHED',
    thumbnail: '',
  })

  useEffect(() => {
    setLoadingTrainers(true)
    adminApi.getTrainers({ limit: 200, status: 'active' })
      .then(res => {
        const list = res.data?.data?.trainers || []
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setTrainers(list)
      })
      .catch(err => {
        console.error('Failed to load trainers:', err)
      })
      .finally(() => setLoadingTrainers(false))
  }, [])

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      router.replace('/admin/dashboard')
    }
  }, [user, router])

  const loadCourse = useCallback(() => {
    courseService.get(courseId)
      .then(r => {
        setCourse(r.data)
        if (r.data) {
          setEditForm({
            title: r.data.title || '',
            courseCode: r.data.courseCode || '',
            slug: r.data.slug || '',
            description: r.data.description || '',
            duration: r.data.duration || '',
            level: r.data.level || 'BEGINNER',
            status: r.data.status || 'PUBLISHED',
            thumbnail: r.data.thumbnail || '',
          })
        }
      })
      .catch(() => toast.error('Failed to load course'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { loadCourse() }, [loadCourse])

  const handleOpenEdit = () => {
    if (!course) return
    setEditForm({
      title: course.title || '',
      courseCode: course.courseCode || '',
      slug: course.slug || '',
      description: course.description || '',
      duration: course.duration || '',
      level: course.level || 'BEGINNER',
      status: course.status || 'PUBLISHED',
      thumbnail: course.thumbnail || '',
    })
    setEditingCourse(true)
  }

  const handleSaveCourse = async (e) => {
    e.preventDefault()
    if (savingCourse) return
    if (!editForm.title?.trim() || !editForm.description?.trim() || !editForm.duration?.trim()) {
      toast.error('Please fill required fields (Title, Description, Duration)', { id: 'save-course' })
      return
    }
    setSavingCourse(true)
    try {
      await courseService.update(course.id, {
        title: editForm.title.trim(),
        courseCode: editForm.courseCode?.trim() || null,
        slug: editForm.slug?.trim() || null,
        description: editForm.description.trim(),
        duration: editForm.duration.trim(),
        level: editForm.level,
        status: editForm.status,
        thumbnail: editForm.thumbnail?.trim() || null,
      })
      toast.success('Course updated successfully', { id: 'save-course' })
      setEditingCourse(false)
      loadCourse()
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save course', { id: 'save-course' })
    } finally {
      setSavingCourse(false)
    }
  }

  if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') return null

  if (loading) return <div className="max-w-7xl mx-auto"><div className="h-40 glass-card animate-pulse" /></div>
  if (!course) return <div className="max-w-7xl mx-auto glass-card p-16 text-center text-gray-400">Course not found</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Link href="/admin/course-catalog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
        <ArrowLeft size={14} /> Back to Courses
      </Link>

      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{course.title}</h1>
              {course.courseCode && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono uppercase">
                  {course.courseCode}
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {course.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
          </div>

          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors shadow-xs flex-shrink-0"
          >
            <Pencil size={13} /> Edit Course
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab course={course} onEdit={handleOpenEdit} />}
      {tab === 'Syllabus' && <SyllabusTab courseId={courseId} />}
      {tab === 'Sessions' && <SessionsTab courseId={courseId} trainers={trainers} loadingTrainers={loadingTrainers} />}
      {tab === 'Materials' && <MaterialsTab courseId={courseId} />}
      {tab === 'Batches' && <BatchesTab courseId={courseId} courseTitle={course.title} trainers={trainers} loadingTrainers={loadingTrainers} />}
      {tab === 'Enrolled Students' && (
        <EnrolledStudentsTab courseId={courseId} courseTitle={course.title} courseStatus={course.status} />
      )}

      {/* Edit Course Slide Panel */}
      <SlidePanel open={editingCourse} onClose={() => setEditingCourse(false)} title="Edit Course">
        <form onSubmit={handleSaveCourse} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Python Full Stack Development"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Course Code <span className="text-xs text-gray-400 font-normal">(e.g. PY-101)</span>
              </label>
              <input
                type="text"
                value={editForm.courseCode}
                onChange={e => setEditForm(f => ({ ...f, courseCode: e.target.value }))}
                placeholder="e.g. PY-101"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Slug <span className="text-xs text-gray-400 font-normal">(URL Key)</span>
              </label>
              <input
                type="text"
                value={editForm.slug}
                onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. python-2"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs lowercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detailed description of the course..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration *</label>
              <input
                type="text"
                required
                value={editForm.duration}
                onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="e.g. 3 months"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Level *</label>
              <select
                value={editForm.level}
                onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status *</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Thumbnail</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editForm.thumbnail || ''}
                onChange={e => setEditForm(f => ({ ...f, thumbnail: e.target.value }))}
                placeholder="Image URL or upload a file below..."
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 cursor-pointer text-xs font-semibold transition-colors">
                <Upload size={14} />
                <span>{uploadingThumb ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingThumb}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploadingThumb(true)
                    try {
                      const res = await courseContentService.uploadMaterial(file, 'OTHER')
                      const url = res?.data?.url || res?.url || res?.data?.fileUrl || res?.fileUrl
                      if (url) {
                        setEditForm(f => ({ ...f, thumbnail: url }))
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
            {editForm.thumbnail && (
              <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <img
                  src={resolveFileUrl(editForm.thumbnail)}
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
              disabled={savingCourse}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-60"
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
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <h2 className="font-display font-bold text-base text-gray-900 dark:text-white">Course Overview</h2>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
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
          <p className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800/60">
            <span className="text-gray-400">Slug:</span>
            <span className="font-mono text-xs text-purple-700 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/30 px-2.5 py-0.5 rounded-lg">
              {course.slug}
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
        className={`w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 ${size} outline-none focus:ring-2 focus:ring-purple-500`} />
      <select value={unit} onChange={e => onUnitChange(e.target.value)}
        className={`rounded-lg border border-gray-200 bg-gray-50 px-2 ${size} outline-none focus:ring-2 focus:ring-purple-500`}>
        {DURATION_UNITS.map(u => <option key={u} value={u}>{u.charAt(0) + u.slice(1).toLowerCase()}</option>)}
      </select>
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

function StatusBadge({ status }) {
  const isDraft = status === 'DRAFT'
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
      isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
    }`}>{isDraft ? 'DRAFT' : 'PUBLISHED'}</span>
  )
}

function StatusSelect({ value, onChange, small }) {
  return (
    <select value={value || 'PUBLISHED'} onChange={e => onChange(e.target.value)}
      className={`rounded-lg border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500 ${small ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}>
      <option value="DRAFT">Draft</option>
      <option value="PUBLISHED">Published</option>
    </select>
  )
}

function SyllabusMaterialBadge({ material }) {
  const href = resolveFileUrl(material.url)
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/20 text-xs">
      <span className="text-sm flex-shrink-0">
        {material.type === 'PDF' ? '📄' : material.type === 'VIDEO' ? '🎬' : material.type === 'PRESENTATION' ? '🖥️' : material.type === 'LINK' ? '🔗' : '📁'}
      </span>
      <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[180px]" title={material.title}>
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
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 ml-0.5">
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

function SyllabusTab({ courseId }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showAddModule, setShowAddModule] = useState(false)
  const [newModule, setNewModule] = useState(EMPTY_MODULE_FORM)

  // Module edit state
  const [editingModule, setEditingModule] = useState(null)

  // Topic add/edit state
  const [showAddTopic, setShowAddTopic] = useState({})
  const [newTopic, setNewTopic] = useState({})
  const [editingTopic, setEditingTopic] = useState(null)

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
    if (!confirm('Delete module and all its topics?')) return
    try {
      await courseContentService.deleteModule(id)
      toast.success('Module deleted')
      load()
    } catch { toast.error('Failed to delete module') }
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
    if (!confirm('Delete topic?')) return
    try {
      await courseContentService.deleteTopic(id)
      toast.success('Topic deleted')
      load()
    } catch { toast.error('Failed to delete topic') }
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
    <div className="glass-card p-5 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Syllabus</h2>
          <p className="text-xs text-gray-500">
            {modules.length} {modules.length === 1 ? 'module' : 'modules'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => setShowAddModule(s => !s)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {showAddModule ? 'Cancel' : <><Plus size={14} /> Add Module</>}
          </button>
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
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 gap-2">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                    className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                  >
                    <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-400 flex-shrink-0">
                      {expanded[m.id] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {m.title}
                    </span>
                    <StatusBadge status={m.status} />
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ({topics.length} {topics.length === 1 ? 'topic' : 'topics'})
                    </span>
                    {formatDuration(m.durationValue, m.durationUnit) && (
                      <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                        <Clock size={11} /> {formatDuration(m.durationValue, m.durationUnit)}
                      </span>
                    )}
                    {hasModuleMaterials && (
                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium flex-shrink-0">
                        📁 {m.materials.length} mat{m.materials.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => moveModule(i, -1)}
                      disabled={i === 0}
                      title="Move Up"
                      className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center transition-colors"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(i, 1)}
                      disabled={i === modules.length - 1}
                      title="Move Down"
                      className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center transition-colors"
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModule(m)}
                      className="px-2.5 py-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Pencil size={12} /> Edit Module
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteModule(m.id)}
                      title="Delete Module"
                      className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Topics ({topics.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddTopic(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Plus size={12} /> {showAddTopic[m.id] ? 'Cancel' : 'Add Topic'}
                    </button>
                  </div>

                  {/* Add Topic Form */}
                  {showAddTopic[m.id] && (
                    <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-white dark:bg-gray-900 space-y-2">
                      <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">New Topic</p>
                      <div className="flex gap-2">
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
                          className="w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
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
                              <div className="flex gap-2">
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
                                  className="w-20 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500"
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
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                                  {t.title}
                                </span>
                                <StatusBadge status={t.status} />
                                {t.durationHours && (
                                  <span className="text-[11px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                                    <Clock size={10} /> {t.durationHours}h
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveTopic(m.id, topics, ti, -1)}
                                  disabled={ti === 0}
                                  title="Move Up"
                                  className="w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center"
                                >
                                  <ChevronUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveTopic(m.id, topics, ti, 1)}
                                  disabled={ti === topics.length - 1}
                                  title="Move Down"
                                  className="w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center"
                                >
                                  <ChevronDown size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditTopic(t)}
                                  className="px-2 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center gap-1"
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteTopic(t.id)}
                                  title="Delete Topic"
                                  className="w-6 h-6 rounded hover:bg-red-100 text-red-500 flex items-center justify-center"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
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
    </div>
  )
}

function SessionsTab({ courseId, trainers = [], loadingTrainers = false }) {
  const [modules, setModules] = useState([])
  const [moduleId, setModuleId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [form, setForm] = useState(EMPTY_SESSION)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const isTimeInvalid = Boolean(form.startTime && form.endTime && form.endTime <= form.startTime)

  useEffect(() => {
    courseContentService.getModules(courseId).then(r => setModules(r.data || [])).catch(() => toast.error('Failed to load syllabus'))
  }, [courseId])

  const topics = modules.find(m => String(m.id) === String(moduleId))?.topics || []

  const loadSessions = useCallback(() => {
    if (!topicId) { setSessions([]); return }
    setLoadingSessions(true)
    courseContentService.getSessions(topicId)
      .then(r => setSessions(r.data || []))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoadingSessions(false))
  }, [topicId])

  useEffect(() => { loadSessions() }, [loadSessions])

  function resetForm() { setForm(EMPTY_SESSION); setEditingId(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!topicId) { toast.error('Select a topic first'); return }
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      toast.error('End time must be greater than start time')
      return
    }
    const computedDuration = form.durationMinutes || calculateDuration(form.startTime, form.endTime)
    const payload = {
      ...form,
      durationMinutes: computedDuration ? Number(computedDuration) : ''
    }
    setSaving(true)
    try {
      if (editingId) await courseContentService.updateSession(editingId, payload)
      else await courseContentService.createSession(topicId, payload)
      toast.success(editingId ? 'Session updated' : 'Session added')
      resetForm()
      loadSessions()
    } catch (err) { toast.error(err.message || 'Failed to save session') } finally { setSaving(false) }
  }

  function openEdit(s) {
    setEditingId(s.id)
    const startTime = formatTimeForInput(s.startTime)
    const endTime = formatTimeForInput(s.endTime)
    const autoDur = calculateDuration(startTime, endTime)
    setForm({
      title: s.title, description: s.description || '', trainerName: s.trainerName || '',
      sessionDate: s.sessionDate || '', startTime, endTime,
      durationMinutes: s.durationMinutes ? String(s.durationMinutes) : (autoDur || ''), type: s.type || 'LIVE',
      meetingUrl: s.meetingUrl || '', recordingUrl: s.recordingUrl || '', status: s.status || 'PUBLISHED',
    })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this session?')) return
    try { await courseContentService.deleteSession(id); loadSessions() } catch (err) { toast.error(err.message || 'Failed to delete') }
  }

  async function moveSession(index, direction) {
    const newOrder = [...sessions]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setSessions(newOrder)
    try { await courseContentService.reorderSessions(topicId, newOrder.map(s => s.id)) } catch { toast.error('Failed to reorder'); loadSessions() }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <select value={moduleId} onChange={e => { setModuleId(e.target.value); setTopicId(''); resetForm() }}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">Select module...</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select value={topicId} onChange={e => { setTopicId(e.target.value); resetForm() }} disabled={!moduleId}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
          <option value="">Select topic...</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {!topicId ? (
        <div className="glass-card p-10 text-center text-gray-400 text-sm">Pick a module and topic to manage its sessions.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{editingId ? 'Edit Session' : 'Add Session'}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Session title *"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Trainer (optional)</label>
                <select
                  value={form.trainerName}
                  onChange={e => setForm(f => ({ ...f, trainerName: e.target.value }))}
                  disabled={loadingTrainers}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 text-gray-800 dark:text-gray-100"
                >
                  <option value="">{loadingTrainers ? 'Loading trainers...' : 'Select trainer (optional)'}</option>
                  {form.trainerName && !trainers.some(t => t.name === form.trainerName) && (
                    <option value={form.trainerName}>{form.trainerName} (current)</option>
                  )}
                  {trainers.map(t => (
                    <option key={t.id} value={t.name}>
                      {t.name}{t.designation ? ` · ${t.designation}` : ''}
                    </option>
                  ))}
                </select>
                {!loadingTrainers && trainers.length === 0 && !form.trainerName && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    No active trainers found.{' '}
                    <Link href="/admin/trainers" className="text-purple-600 hover:underline">
                      Manage trainers
                    </Link>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="LIVE">Live</option>
                  <option value="RECORDED">Recorded</option>
                </select>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Start Time</label>
                    <input type="time" value={form.startTime} max={form.endTime || undefined}
                      onChange={e => {
                        const newStart = e.target.value
                        const autoDur = calculateDuration(newStart, form.endTime)
                        setForm(f => ({
                          ...f,
                          startTime: newStart,
                          durationMinutes: autoDur
                        }))
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
                        isTimeInvalid
                          ? 'border-red-300 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                          : 'border-gray-200 bg-gray-50 focus:ring-2 focus:ring-purple-500'
                      }`} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">End Time</label>
                    <input type="time" value={form.endTime} min={form.startTime || undefined}
                      onChange={e => {
                        const newEnd = e.target.value
                        const autoDur = calculateDuration(form.startTime, newEnd)
                        setForm(f => ({
                          ...f,
                          endTime: newEnd,
                          durationMinutes: autoDur
                        }))
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
                        isTimeInvalid
                          ? 'border-red-300 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                          : 'border-gray-200 bg-gray-50 focus:ring-2 focus:ring-purple-500'
                      }`} />
                  </div>
                </div>
                {isTimeInvalid && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">
                    End time must be greater than start time.
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] text-gray-400">Duration (minutes)</label>
                  {isTimeInvalid ? (
                    <span className="text-[10px] text-red-500 font-medium">End time must be greater</span>
                  ) : form.durationMinutes ? (
                    <span className="text-[10px] text-purple-600 font-medium">Auto-calculated</span>
                  ) : null}
                </div>
                <input
                  type="number"
                  readOnly
                  tabIndex={-1}
                  value={form.durationMinutes}
                  placeholder={isTimeInvalid ? 'Invalid: End time must be greater' : 'Calculated from start and end time'}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none cursor-not-allowed select-none transition-colors ${
                    isTimeInvalid
                      ? 'border-red-200 bg-red-50/30 text-red-400 placeholder-red-400'
                      : 'border-gray-200 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                />
              </div>
              <input value={form.meetingUrl} onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="Meeting URL"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <input value={form.recordingUrl} onChange={e => setForm(f => ({ ...f, recordingUrl: e.target.value }))} placeholder="Recording URL"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Status</label>
                <StatusSelect value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />
              </div>
              <div className="flex gap-2">
                {editingId && <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>}
                <button type="submit" disabled={saving || isTimeInvalid} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Session'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Sessions</p>
            {loadingSessions ? <div className="h-24 animate-pulse bg-gray-100 rounded-xl" /> : sessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate flex items-center gap-1.5">
                        {s.title}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">{s.type || 'LIVE'}</span>
                        <StatusBadge status={s.status} />
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.trainerName || '—'} {s.sessionDate ? `· ${s.sessionDate}` : ''} {s.startTime ? `· ${s.startTime}${s.endTime ? `–${s.endTime}` : ''}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => moveSession(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={12} /></button>
                      <button onClick={() => moveSession(i, 1)} disabled={i === sessions.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={12} /></button>
                      <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg hover:bg-purple-100 text-purple-600 flex items-center justify-center"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(s.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MaterialsTab({ courseId }) {
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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    courseContentService.getModules(courseId).then(r => setModules(r.data || [])).catch(() => {})
  }, [courseId])

  const topics = modules.find(m => String(m.id) === String(moduleId))?.topics || []

  useEffect(() => {
    if (scope === 'SESSION' && topicId) {
      courseContentService.getSessions(topicId).then(r => setSessions(r.data || [])).catch(() => setSessions([]))
    } else {
      setSessions([])
    }
  }, [scope, topicId])

  const ownerId = scope === 'COURSE' ? courseId : scope === 'MODULE' ? moduleId : scope === 'TOPIC' ? topicId : sessionId
  const ownerParamKey = { COURSE: 'courseId', MODULE: 'moduleId', TOPIC: 'topicId', SESSION: 'sessionId' }[scope]

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
  }

  function openEdit(m) {
    setEditingId(m.id)
    setForm({ title: m.title, type: m.type, url: m.url, description: m.description || '', visibility: m.visibility || 'PUBLISHED' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!editingId && !ownerId) { toast.error('Select a target first'); return }
    if (!form.url.trim()) { toast.error('Provide a URL or upload a file'); return }
    setSaving(true)
    try {
      const payload = { title: form.title, type: form.type, url: form.url, description: form.description, visibility: form.visibility }
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
      toast.success('File uploaded')
    } catch (err) { toast.error(err.message || 'Upload failed') } finally { setUploading(false); e.target.value = '' }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this material?')) return
    try { await courseContentService.deleteMaterial(id); load() } catch (err) { toast.error(err.message || 'Failed to delete') }
  }

  async function moveMaterial(index, direction) {
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
          {['COURSE', 'MODULE', 'TOPIC', 'SESSION'].map(s => (
            <button key={s} onClick={() => { setScope(s); setModuleId(''); setTopicId(''); setSessionId('') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${scope === s ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {s === 'COURSE' ? 'Course-level' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {(scope === 'MODULE' || scope === 'TOPIC' || scope === 'SESSION') && (
          <select value={moduleId} onChange={e => { setModuleId(e.target.value); setTopicId(''); setSessionId('') }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none">
            <option value="">Select module...</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        )}
        {(scope === 'TOPIC' || scope === 'SESSION') && (
          <select value={topicId} onChange={e => { setTopicId(e.target.value); setSessionId('') }} disabled={!moduleId}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none disabled:opacity-50">
            <option value="">Select topic...</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
        {scope === 'SESSION' && (
          <select value={sessionId} onChange={e => setSessionId(e.target.value)} disabled={!topicId}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none disabled:opacity-50">
            <option value="">Select session...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
      </div>

      {!ownerId ? (
        <div className="glass-card p-10 text-center text-gray-400 text-sm">Pick a target above to manage its materials.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{editingId ? 'Edit Material' : 'Add Material'}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title *"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <StatusSelect value={form.visibility} onChange={v => setForm(f => ({ ...f, visibility: v }))} />
              </div>
              <input required value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="URL (or upload a file below) *"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <label className="flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
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
                {editingId && <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>}
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Materials</p>
            {loading ? <div className="h-24 animate-pulse bg-gray-100 rounded-xl" /> : materials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No materials yet.</p>
            ) : (
              <div className="space-y-2">
                {materials.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate flex items-center gap-1.5">
                        {m.title}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">{m.type}</span>
                        <StatusBadge status={m.visibility} />
                      </p>
                      {m.description && <p className="text-xs text-gray-400 truncate">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={resolveFileUrl(m.url)} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg hover:bg-purple-100 text-purple-600 flex items-center justify-center"><ExternalLink size={12} /></a>
                      <button onClick={() => moveMaterial(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={12} /></button>
                      <button onClick={() => moveMaterial(i, 1)} disabled={i === materials.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={12} /></button>
                      <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-lg hover:bg-purple-100 text-purple-600 flex items-center justify-center"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(m.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BatchesTab({ courseId, courseTitle, trainers = [], loadingTrainers = false }) {
  const { user } = useAuth()
  const canCreateBatch = ['SUPERADMIN', 'ADMIN'].includes(user?.role)
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30, trainerId: '' })
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
          list = list.filter(b => b.trainerId === user.id || b.trainer?.id === user.id)
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
        trainerId: form.trainerId ? Number(form.trainerId) : null,
        maxStudents: Number(form.maxStudents),
      })
      toast.success('Batch created')
      setShowForm(false)
      setForm({ name: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30, trainerId: '' })
      load()
    } catch (err) { toast.error(err.message || 'Failed to create batch') } finally { setSaving(false) }
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Batches running for <span className="font-semibold text-gray-700 dark:text-gray-200">{courseTitle}</span></p>
        {canCreateBatch && (
          <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold">
            <Plus size={13} /> {showForm ? 'Cancel' : 'New Batch'}
          </button>
        )}
      </div>

      {canCreateBatch && showForm && (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Batch name *"
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <select
            value={form.trainerId}
            onChange={e => setForm(f => ({ ...f, trainerId: e.target.value }))}
            disabled={loadingTrainers}
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 text-gray-800 dark:text-gray-100"
          >
            <option value="">{loadingTrainers ? 'Loading trainers...' : 'Select trainer (optional)'}</option>
            {trainers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.designation ? ` · ${t.designation}` : ''}
              </option>
            ))}
          </select>
          <input
            required
            type="date"
            value={form.startDate}
            onChange={e => {
              const newStart = e.target.value
              setForm(f => ({
                ...f,
                startDate: newStart,
                endDate: f.endDate && newStart && f.endDate < newStart ? '' : f.endDate,
              }))
            }}
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            required
            type="date"
            min={form.startDate || undefined}
            value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />

          {/* Clean Start Time & End Time */}
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

          <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="ONLINE">ONLINE</option><option value="OFFLINE">OFFLINE</option><option value="HYBRID">HYBRID</option>
          </select>
          <input type="number" min="1" max="500" value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))} placeholder="Max students"
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <button type="submit" disabled={saving} className="sm:col-span-2 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Creating...' : 'Create Batch'}
          </button>
        </form>
      )}

      {loading ? <div className="h-24 animate-pulse bg-gray-100 rounded-xl" /> : batches.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No batches for this course yet.</p>
      ) : (
        <div className="space-y-2">
          {batches.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{b.name}</p>
                <p className="text-xs text-gray-400">{b.startDate} — {b.endDate} · {b.mode} · {b.timing}</p>
              </div>
              <Link href="/admin/batches" className="text-xs font-semibold text-purple-600 hover:underline">Manage in Batches</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
