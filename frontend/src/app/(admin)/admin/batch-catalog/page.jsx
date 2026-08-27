'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, Calendar, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import batchService from '@/services/batchService'
import courseService from '@/services/courseService'
import studentService from '@/services/studentService'
import { adminApi } from '@/lib/api'
import { batchSchema } from '@/validations/batchValidation'
import SlidePanel from '@/components/admin/SlidePanel'

const MODE_COLORS = {
  ONLINE: 'bg-blue-100 text-blue-700',
  OFFLINE: 'bg-green-100 text-green-700',
  HYBRID: 'bg-purple-100 text-purple-700',
}

const EMPTY_FORM = { name: '', courseId: '', trainerId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30 }

export default function BatchCatalogPage() {
  const router = useRouter()
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [enrollmentCounts, setEnrollmentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(batchSchema), defaultValues: EMPTY_FORM })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      batchService.list(),
      studentService.list({ limit: 1000 }),
    ])
      .then(([batchRes, studentRes]) => {
        setBatches(batchRes.data || [])
        const counts = {}
        for (const s of studentRes.data?.students || []) {
          if (s.batch?.id) counts[s.batch.id] = (counts[s.batch.id] || 0) + 1
        }
        setEnrollmentCounts(counts)
      })
      .catch(err => toast.error(err.message || 'Failed to load batches'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggleStatus = async (batch) => {
    try {
      await adminApi.toggleBatchStatus(batch.id)
      toast.success('Batch status updated')
      load()
    } catch { toast.error('Failed to update batch status') }
  }

  useEffect(() => {
    load()
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [load])

  function openCreate() {
    setEditingId(null)
    reset(EMPTY_FORM)
    setPanelOpen(true)
  }

  function openEdit(batch) {
    setEditingId(batch.id)
    reset({
      name: batch.name,
      courseId: batch.course?.id ?? '',
      trainerId: batch.trainerId ?? '',
      startDate: batch.startDate,
      endDate: batch.endDate,
      timing: batch.timing || '',
      mode: batch.mode,
      maxStudents: batch.maxStudents,
    })
    setPanelOpen(true)
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      if (editingId) {
        await batchService.update(editingId, data)
        toast.success('Batch updated')
      } else {
        await batchService.create(data)
        toast.success('Batch created')
      }
      setPanelOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save batch')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(batch) {
    if (!confirm(`Delete "${batch.name}"?`)) return
    try {
      await batchService.remove(batch.id)
      toast.success('Batch deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete batch')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Batch Catalog</h1>
          <p className="text-sm text-gray-500 mt-0.5">Core batch records, served by the Java API.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700"
        >
          <Plus size={16} /> Add Batch
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 glass-card animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-400">No batches yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map(b => (
            <div key={b.id} className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-base leading-tight text-gray-900 dark:text-white">{b.name}</h3>
                  <span className="text-xs text-gray-500">{b.course?.title}</span>
                </div>
                <button onClick={() => handleToggleStatus(b)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${b.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {b.isActive ? 'Active' : 'Ended'}
                </button>
              </div>
              <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${MODE_COLORS[b.mode]}`}>{b.mode}</span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Calendar size={11} /> {format(new Date(b.startDate), 'dd MMM yyyy')} → {format(new Date(b.endDate), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {b.timing && <span className="flex items-center gap-1"><Clock size={11} /> {b.timing}</span>}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Users size={11} /> Students</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{enrollmentCounts[b.id] || 0}/{b.maxStudents}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, Math.round(((enrollmentCounts[b.id] || 0) / b.maxStudents) * 100))}%` }} />
                </div>
              </div>
              <button onClick={() => router.push(`/admin/batches/${b.id}`)}
                className="w-full py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 transition-colors">
                View Details →
              </button>
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Batch' : 'Add Batch'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Name *</label>
            <input {...register('name')} placeholder="Python Batch Jan 2026"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.name && <span className="text-xs text-red-500 mt-1 block">{errors.name.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Course *</label>
            <select {...register('courseId')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            {errors.courseId && <span className="text-xs text-red-500 mt-1 block">{errors.courseId.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
              <input type="date" {...register('startDate')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.startDate && <span className="text-xs text-red-500 mt-1 block">{errors.startDate.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
              <input type="date" {...register('endDate')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.endDate && <span className="text-xs text-red-500 mt-1 block">{errors.endDate.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Timing</label>
            <input {...register('timing')} placeholder="9AM – 12PM"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mode *</label>
              <select {...register('mode')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="HYBRID">HYBRID</option>
              </select>
              {errors.mode && <span className="text-xs text-red-500 mt-1 block">{errors.mode.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Students *</label>
              <input type="number" min="1" max="500" {...register('maxStudents')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.maxStudents && <span className="text-xs text-red-500 mt-1 block">{errors.maxStudents.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Trainer ID</label>
            <input {...register('trainerId')} placeholder="Optional"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.trainerId && <span className="text-xs text-red-500 mt-1 block">{errors.trainerId.message}</span>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPanelOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button type="submit" disabled={saving || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
