'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Calendar, Clock, Monitor, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'
import SlidePanel from '@/components/admin/SlidePanel'

const MODE_ICONS = { ONLINE: Monitor, OFFLINE: MapPin, HYBRID: Clock }
const MODE_COLORS = { ONLINE: 'bg-blue-100 text-blue-700', OFFLINE: 'bg-green-100 text-green-700', HYBRID: 'bg-purple-100 text-purple-700' }
const BATCH_GRADIENTS = [
  'from-purple-500 to-violet-600', 'from-blue-500 to-indigo-600',
  'from-indigo-500 to-purple-600', 'from-violet-500 to-purple-700',
]

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', courseId: '', trainerId: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30 })

  const load = () => {
    setLoading(true)
    batchService.list().then(r => setBatches(r.data || [])).catch(err => toast.error(err.message || 'Failed to load batches')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    courseService.list().then(r => setCourses(r.data || [])).catch(() => {})
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await batchService.create({
        ...form,
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

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Batches</h1>
        <button onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700 transition-all">
          <Plus size={16} /> Create Batch
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 glass-card animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-gray-400">No batches yet. Create your first batch.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b, i) => {
            const grad = BATCH_GRADIENTS[i % BATCH_GRADIENTS.length]
            const enrolled = b._count?.enrollments || 0
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
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Create Batch" subtitle="Set up a new training batch">
        <form onSubmit={handleCreate} className="space-y-4">
          {[
            { label: 'Batch Name *', key: 'name', type: 'text', placeholder: 'Python Batch Jan 2026' },
            { label: 'Timing', key: 'timing', type: 'text', placeholder: '9AM – 12PM' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                required={key === 'name'} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Course *</label>
            <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} required
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 disabled:opacity-60 transition-all">
              {saving ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
