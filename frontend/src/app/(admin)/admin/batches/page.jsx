'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Calendar, Clock, Monitor, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'

const MODE_ICONS = { ONLINE: Monitor, OFFLINE: MapPin, HYBRID: Clock }
const MODE_COLORS = { ONLINE: 'bg-blue-100 text-blue-700', OFFLINE: 'bg-green-100 text-green-700', HYBRID: 'bg-purple-100 text-purple-700' }
const BATCH_GRADIENTS = [
  'from-purple-500 to-violet-600', 'from-blue-500 to-indigo-600',
  'from-indigo-500 to-purple-600', 'from-violet-500 to-purple-700',
]

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

export default function BatchesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const canCreateBatch = ['SUPERADMIN', 'ADMIN'].includes(user?.role)
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', courseId: '', trainerId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30 })

  // Clean Time Pickers
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')

  const load = () => {
    setLoading(true)
    batchService.list().then(r => setBatches(r.data || [])).catch(err => toast.error(err.message || 'Failed to load batches')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
    adminApi.getTrainers({ limit: 100 })
      .then(r => setTrainers(r.data?.data?.trainers || []))
      .catch(() => {})
  }, [])

  const handleCreate = async (e) => {
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
        courseId: Number(form.courseId),
        trainerId: form.trainerId ? Number(form.trainerId) : null,
        maxStudents: Number(form.maxStudents),
      })
      toast.success('Batch created')
      setPanelOpen(false)
      setForm({ name: '', courseId: '', trainerId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30 })
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to create batch')
    } finally { setSaving(false) }
  }

  const isTrainer = user?.role === 'TRAINER'
  const displayedBatches = isTrainer && user?.id
    ? batches.filter(b => b.trainerId === user.id || b.trainer?.id === user.id)
    : batches

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Batches</h1>
          {isTrainer && (
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">Showing batches assigned to you</p>
          )}
        </div>
        {canCreateBatch && (
          <button onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all">
            <Plus size={16} /> Create Batch
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 glass-card animate-pulse" />)}
        </div>
      ) : displayedBatches.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-gray-400">
            {isTrainer ? 'No batches assigned to you yet.' : canCreateBatch ? 'No batches yet. Create your first batch.' : 'No batches available.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedBatches.map((b, i) => {
            const grad = BATCH_GRADIENTS[i % BATCH_GRADIENTS.length]
            const enrolled = b.studentCount || 0
            const fillPct = Math.round((enrolled / b.maxStudents) * 100)
            const ModeIcon = MODE_ICONS[b.mode] || Clock
            return (
              <div key={b.id} className="glass-card overflow-hidden hover:scale-[1.02] transition-transform duration-200">
                {/* Header */}
                <div className={`bg-gradient-to-r ${grad} px-5 py-4 text-white`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-bold text-lg">{b.name}</h3>
                      <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{b.course?.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${b.isActive ? 'bg-green-400/30 text-green-100' : 'bg-gray-400/30 text-gray-200'}`}>
                      {b.isActive ? 'Active' : 'Ended'}
                    </span>
                  </div>
                </div>
                {/* Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MODE_COLORS[b.mode]}`}>
                      {b.mode}
                    </span>
                    {b.timing && <span className="text-xs text-gray-500">{b.timing}</span>}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="flex items-center gap-1"><Users size={11} /> Students</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{enrolled}/{b.maxStudents}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={11} />
                    <span>{format(new Date(b.startDate), 'dd MMM yyyy')} → {format(new Date(b.endDate), 'dd MMM yyyy')}</span>
                  </div>
                  {b.trainer && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-[9px]">
                        {b.trainer.name[0]}
                      </div>
                      <span>{b.trainer.name}</span>
                    </div>
                  )}
                  <button onClick={() => router.push(`/admin/batches/${b.id}`)}
                    className="w-full py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-sm font-semibold hover:bg-purple-100 transition-colors">
                    View Details →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Batch Panel */}
      {canCreateBatch && (
        <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Create Batch" subtitle="Set up a new training batch">
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Batch Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Python Batch Jan 2026"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Clean Start & End Time Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course *</label>
              <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select course</option>
                {courses.filter(c => c.status === 'PUBLISHED').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Assign Lead Trainer (Optional)</label>
              <select value={form.trainerId} onChange={e => setForm(f => ({ ...f, trainerId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select trainer (optional)</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.designation ? ` (${t.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option>ONLINE</option><option>OFFLINE</option><option>HYBRID</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Students</label>
                <input type="number" min="1" max="100" value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPanelOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-violet-700 disabled:opacity-60 transition-all">
                {saving ? 'Creating...' : 'Create Batch'}
              </button>
            </div>
          </form>
        </SlidePanel>
      )}
    </div>
  )
}
