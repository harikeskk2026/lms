'use client'
import { useState, useEffect } from 'react'
import { Pin, Trash2, Pencil, Plus, ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', batchId: '', isPinned: false, expiresAt: '' })

  const load = () => {
    setLoading(true)
    adminApi.getAnnouncements().then(r => setAnnouncements(r.data.data || [])).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editId) {
        await adminApi.updateAnnouncement(editId, form)
        toast.success('Updated')
      } else {
        await adminApi.createAnnouncement(form)
        toast.success('Announcement sent!')
      }
      setFormOpen(false)
      setEditId(null)
      setForm({ title: '', body: '', batchId: '', isPinned: false, expiresAt: '' })
      load()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try { await adminApi.deleteAnnouncement(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const handleEdit = (a) => {
    setEditId(a.id)
    setForm({ title: a.title, body: a.body, batchId: a.batchId || '', isPinned: a.isPinned, expiresAt: a.expiresAt ? a.expiresAt.split('T')[0] : '' })
    setFormOpen(true)
  }

  const pinned = announcements.filter(a => a.isPinned)
  const regular = announcements.filter(a => !a.isPinned)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Announcements</h1>
        <button onClick={() => { setFormOpen(f => !f); setEditId(null); setForm({ title: '', body: '', batchId: '', isPinned: false, expiresAt: '' }) }}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
          {formOpen ? <ChevronUp size={16} /> : <Plus size={16} />}
          {formOpen ? 'Close' : 'Create Announcement'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {formOpen && (
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">{editId ? 'Edit Announcement' : 'New Announcement'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Important Update" required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Message *</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-800 dark:text-gray-200" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target</label>
                <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200">
                  <option value="">All Students</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Expires (optional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isPinned ? 'bg-purple-500' : 'bg-gray-200'}`}
                    onClick={() => setForm(f => ({ ...f, isPinned: !f.isPinned }))}>
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow" style={{ transform: form.isPinned ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pin to top</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setFormOpen(false); setEditId(null) }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                {saving ? 'Sending...' : (editId ? 'Update' : 'Send Announcement')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1"><Pin size={12} /> Pinned</p>
          {pinned.map(a => <AnnouncementCard key={a.id} a={a} batches={batches} onEdit={handleEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {/* All */}
      <div className="space-y-3">
        {pinned.length > 0 && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">All Announcements</p>}
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 glass-card animate-pulse" />)
        ) : regular.length === 0 && pinned.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Megaphone size={32} className="text-purple-200 mx-auto mb-3" />
            <p className="text-gray-400">No announcements yet.</p>
          </div>
        ) : (
          regular.map(a => <AnnouncementCard key={a.id} a={a} batches={batches} onEdit={handleEdit} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  )
}

function AnnouncementCard({ a, batches, onEdit, onDelete }) {
  const batch = batches.find(b => b.id === a.batchId)
  return (
    <div className={`glass-card p-5 ${a.isPinned ? 'border-purple-300 dark:border-purple-700' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {a.isPinned && <Pin size={12} className="text-purple-500 flex-shrink-0" />}
            <h3 className="font-display font-bold text-gray-800 dark:text-white">{a.title}</h3>
            {batch ? (
              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{batch.name}</span>
            ) : (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">All Students</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{a.body}</p>
          <p className="text-xs text-gray-400 mt-2">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
          {a.expiresAt && <p className="text-[10px] text-amber-500 mt-0.5">Expires {format(new Date(a.expiresAt), 'dd MMM yyyy')}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(a)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(a.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
