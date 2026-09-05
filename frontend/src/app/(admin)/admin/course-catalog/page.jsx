'use client'
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Clock, BarChart2, FolderOpen, Eye, EyeOff, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import { courseSchema } from '@/validations/courseValidation'
import SlidePanel from '@/components/admin/SlidePanel'

const LEVEL_COLORS = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
}

const STATUS_COLORS = {
  DRAFT: 'bg-amber-100 text-amber-800 border border-amber-300',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-orange-100 text-orange-700',
}

const EMPTY_FORM = { title: '', description: '', duration: '', level: 'BEGINNER', thumbnail: '', status: 'DRAFT' }

export default function CourseCatalogPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      router.replace('/admin/dashboard')
    }
  }, [user, router])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(courseSchema), defaultValues: EMPTY_FORM })

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
    reset(EMPTY_FORM)
    setPanelOpen(true)
  }

  function openEdit(course) {
    setEditingId(course.id)
    reset({
      title: course.title,
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

  async function togglePublish(course) {
    const nextStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    setStatusUpdatingId(course.id)
    try {
      await courseService.updateStatus(course.id, nextStatus)
      toast.success(nextStatus === 'PUBLISHED' ? 'Course published' : 'Course moved to draft')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleDelete(course) {
    if (!confirm(`Delete "${course.title}"?`)) return
    try {
      await courseService.remove(course.id)
      toast.success('Course deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete course')
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
    const matchesSearch = !q ||
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    return matchesStatus && matchesSearch
  })

  if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Core course records, served by the Java API.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700"
        >
          <Plus size={16} /> Add Course
        </button>
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

        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 glass-card animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-400">No courses yet.</div>
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
            <div key={c.id} className="glass-card p-5 flex flex-col gap-3">
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
                <FolderOpen size={12} /> Manage Content
              </Link>
              <button onClick={() => togglePublish(c)} disabled={statusUpdatingId === c.id}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 ${
                  c.status === 'PUBLISHED'
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}>
                {c.status === 'PUBLISHED' ? <><EyeOff size={12} /> Move to Draft</> : <><Eye size={12} /> Publish</>}
              </button>
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input {...register('title')} placeholder="Full Stack Python"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.title && <span className="text-xs text-red-500 mt-1 block">{errors.title.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea {...register('description')} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            {errors.description && <span className="text-xs text-red-500 mt-1 block">{errors.description.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Duration *</label>
            <input {...register('duration')} placeholder="3 months"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.duration && <span className="text-xs text-red-500 mt-1 block">{errors.duration.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Level *</label>
            <select {...register('level')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
            {errors.level && <span className="text-xs text-red-500 mt-1 block">{errors.level.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status *</label>
            <select {...register('status')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            {errors.status && <span className="text-xs text-red-500 mt-1 block">{errors.status.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Thumbnail URL</label>
            <input {...register('thumbnail')} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button type="submit" disabled={saving || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
