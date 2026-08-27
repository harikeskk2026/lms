'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Upload, ExternalLink,
} from 'lucide-react'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import batchService from '@/services/batchService'

const TABS = ['Overview', 'Syllabus', 'Sessions', 'Materials', 'Batches']
const MATERIAL_TYPES = ['PDF', 'DOCUMENT', 'PRESENTATION', 'VIDEO', 'LINK', 'OTHER']
const EMPTY_SESSION = { title: '', description: '', trainerName: '', sessionDate: '', sessionTime: '', durationMinutes: '', meetingUrl: '', recordingUrl: '' }

export default function CourseManagePage({ params }) {
  const { id: courseId } = params
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')

  const loadCourse = useCallback(() => {
    courseService.get(courseId)
      .then(r => setCourse(r.data))
      .catch(() => toast.error('Failed to load course'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { loadCourse() }, [loadCourse])

  if (loading) return <div className="max-w-7xl mx-auto"><div className="h-40 glass-card animate-pulse" /></div>
  if (!course) return <div className="max-w-7xl mx-auto glass-card p-16 text-center text-gray-400">Course not found</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Link href="/admin/course-catalog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
        <ArrowLeft size={14} /> Back to Course Catalog
      </Link>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{course.title}</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{course.courseCode}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{course.status}</span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
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

      {tab === 'Overview' && <OverviewTab course={course} />}
      {tab === 'Syllabus' && <SyllabusTab courseId={courseId} />}
      {tab === 'Sessions' && <SessionsTab courseId={courseId} />}
      {tab === 'Materials' && <MaterialsTab courseId={courseId} />}
      {tab === 'Batches' && <BatchesTab courseId={courseId} courseTitle={course.title} />}
    </div>
  )
}

function OverviewTab({ course }) {
  return (
    <div className="glass-card p-5 grid sm:grid-cols-2 gap-4">
      <div className="space-y-2 text-sm">
        <p><span className="text-gray-400">Status:</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{course.status}</span></p>
        <p><span className="text-gray-400">Level:</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{course.level}</span></p>
        <p><span className="text-gray-400">Duration:</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{course.duration}</span></p>
        <p><span className="text-gray-400">Course Code:</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{course.courseCode}</span></p>
        <p><span className="text-gray-400">Slug:</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{course.slug}</span></p>
      </div>
      {course.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.thumbnail} alt={course.title} className="rounded-xl object-cover h-40 w-full" />
      )}
      <div className="sm:col-span-2">
        <p className="text-gray-400 text-sm mb-1">Description</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{course.description}</p>
      </div>
    </div>
  )
}

function SyllabusTab({ courseId }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newTopicTitle, setNewTopicTitle] = useState({})
  const [editingModule, setEditingModule] = useState(null)
  const [editingTopic, setEditingTopic] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    courseContentService.getModules(courseId)
      .then(r => setModules(r.data || []))
      .catch(() => toast.error('Failed to load syllabus'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { load() }, [load])

  async function addModule() {
    if (!newModuleTitle.trim()) return
    try {
      await courseContentService.createModule(courseId, { title: newModuleTitle.trim() })
      setNewModuleTitle('')
      load()
    } catch (err) { toast.error(err.message || 'Failed to add module') }
  }

  async function saveModuleEdit() {
    try {
      await courseContentService.updateModule(editingModule.id, { title: editingModule.title })
      setEditingModule(null)
      load()
    } catch (err) { toast.error(err.message || 'Failed to update module') }
  }

  async function deleteModule(id) {
    if (!confirm('Delete this module and all its topics?')) return
    try { await courseContentService.deleteModule(id); load() } catch (err) { toast.error(err.message || 'Failed to delete module') }
  }

  async function moveModule(index, direction) {
    const newOrder = [...modules]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setModules(newOrder)
    try { await courseContentService.reorderModules(courseId, newOrder.map(m => m.id)) } catch { toast.error('Failed to reorder'); load() }
  }

  async function addTopic(moduleId) {
    const title = (newTopicTitle[moduleId] || '').trim()
    if (!title) return
    try {
      await courseContentService.createTopic(moduleId, { title })
      setNewTopicTitle(prev => ({ ...prev, [moduleId]: '' }))
      load()
    } catch (err) { toast.error(err.message || 'Failed to add topic') }
  }

  async function saveTopicEdit() {
    try {
      await courseContentService.updateTopic(editingTopic.id, { title: editingTopic.title })
      setEditingTopic(null)
      load()
    } catch (err) { toast.error(err.message || 'Failed to update topic') }
  }

  async function deleteTopic(id) {
    if (!confirm('Delete this topic?')) return
    try { await courseContentService.deleteTopic(id); load() } catch (err) { toast.error(err.message || 'Failed to delete topic') }
  }

  async function moveTopic(moduleId, topics, index, direction) {
    const newOrder = [...topics]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, topics: newOrder } : m))
    try { await courseContentService.reorderTopics(moduleId, newOrder.map(t => t.id)) } catch { toast.error('Failed to reorder'); load() }
  }

  if (loading) return <div className="glass-card p-8 animate-pulse h-40" />

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex gap-2">
        <input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="New module title"
          onKeyDown={e => e.key === 'Enter' && addModule()}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        <button onClick={addModule} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1">
          <Plus size={14} /> Add Module
        </button>
      </div>

      {modules.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No modules yet. Add one above.</p>}

      <div className="space-y-2">
        {modules.map((m, i) => (
          <div key={m.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 gap-2">
              <button onClick={() => setExpanded(prev => ({ ...prev, [m.id]: !prev[m.id] }))} className="flex items-center gap-2 flex-1 text-left min-w-0">
                {expanded[m.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {editingModule?.id === m.id ? (
                  <input autoFocus value={editingModule.title} onChange={e => setEditingModule({ ...editingModule, title: e.target.value })}
                    onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Enter' && saveModuleEdit()}
                    className="rounded-lg border border-purple-300 px-2 py-1 text-sm" />
                ) : (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{m.title}</span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0">({(m.topics || []).length} topics)</span>
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => moveModule(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={13} /></button>
                <button onClick={() => moveModule(i, 1)} disabled={i === modules.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={13} /></button>
                {editingModule?.id === m.id ? (
                  <button onClick={saveModuleEdit} className="text-xs font-semibold text-purple-600 px-2">Save</button>
                ) : (
                  <button onClick={() => setEditingModule({ id: m.id, title: m.title })} className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center"><Pencil size={12} /></button>
                )}
                <button onClick={() => deleteModule(m.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
              </div>
            </div>
            {expanded[m.id] && (
              <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                {(m.topics || []).map((t, ti) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 pl-4 border-l-2 border-purple-100 dark:border-purple-900/30 py-1.5">
                    {editingTopic?.id === t.id ? (
                      <input autoFocus value={editingTopic.title} onChange={e => setEditingTopic({ ...editingTopic, title: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && saveTopicEdit()}
                        className="flex-1 rounded-lg border border-purple-300 px-2 py-1 text-xs" />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">{t.title}</span>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => moveTopic(m.id, m.topics, ti, -1)} disabled={ti === 0} className="w-6 h-6 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={11} /></button>
                      <button onClick={() => moveTopic(m.id, m.topics, ti, 1)} disabled={ti === m.topics.length - 1} className="w-6 h-6 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={11} /></button>
                      {editingTopic?.id === t.id ? (
                        <button onClick={saveTopicEdit} className="text-xs font-semibold text-purple-600 px-1">Save</button>
                      ) : (
                        <button onClick={() => setEditingTopic({ id: t.id, title: t.title })} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center"><Pencil size={11} /></button>
                      )}
                      <button onClick={() => deleteTopic(t.id)} className="w-6 h-6 rounded hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input value={newTopicTitle[m.id] || ''} onChange={e => setNewTopicTitle(prev => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="New topic title" onKeyDown={e => e.key === 'Enter' && addTopic(m.id)}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  <button onClick={() => addTopic(m.id)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">Add Topic</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionsTab({ courseId }) {
  const [modules, setModules] = useState([])
  const [moduleId, setModuleId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [form, setForm] = useState(EMPTY_SESSION)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    try {
      if (editingId) await courseContentService.updateSession(editingId, form)
      else await courseContentService.createSession(topicId, form)
      toast.success(editingId ? 'Session updated' : 'Session added')
      resetForm()
      loadSessions()
    } catch (err) { toast.error(err.message || 'Failed to save session') } finally { setSaving(false) }
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({
      title: s.title, description: s.description || '', trainerName: s.trainerName || '',
      sessionDate: s.sessionDate || '', sessionTime: s.sessionTime || '', durationMinutes: s.durationMinutes || '',
      meetingUrl: s.meetingUrl || '', recordingUrl: s.recordingUrl || '',
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
              <input value={form.trainerName} onChange={e => setForm(f => ({ ...f, trainerName: e.target.value }))} placeholder="Trainer name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="time" value={form.sessionTime} onChange={e => setForm(f => ({ ...f, sessionTime: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <input type="number" min="0" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} placeholder="Duration (minutes)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <input value={form.meetingUrl} onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="Meeting URL"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <input value={form.recordingUrl} onChange={e => setForm(f => ({ ...f, recordingUrl: e.target.value }))} placeholder="Recording URL"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="flex gap-2">
                {editingId && <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>}
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
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
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{s.title}</p>
                      <p className="text-xs text-gray-400">{s.trainerName || '—'} {s.sessionDate ? `· ${s.sessionDate}` : ''} {s.sessionTime ? `· ${s.sessionTime}` : ''}</p>
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
  const [form, setForm] = useState({ title: '', type: 'PDF', url: '' })
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!ownerId) { toast.error('Select a target first'); return }
    if (!form.url.trim()) { toast.error('Provide a URL or upload a file'); return }
    setSaving(true)
    try {
      await courseContentService.createMaterial({ title: form.title, type: form.type, url: form.url, [ownerParamKey]: Number(ownerId) })
      toast.success('Material added')
      setForm({ title: '', type: 'PDF', url: '' })
      load()
    } catch (err) { toast.error(err.message || 'Failed to add material') } finally { setSaving(false) }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await courseContentService.uploadMaterial(file)
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
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Add Material</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title *"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input required value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="URL (or upload a file below) *"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <label className="flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload file instead'}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              <button type="submit" disabled={saving} className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                {saving ? 'Adding...' : 'Add Material'}
              </button>
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
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{m.title}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{m.type}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg hover:bg-purple-100 text-purple-600 flex items-center justify-center"><ExternalLink size={12} /></a>
                      <button onClick={() => moveMaterial(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={12} /></button>
                      <button onClick={() => moveMaterial(i, 1)} disabled={i === materials.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={12} /></button>
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

function BatchesTab({ courseId, courseTitle }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', timing: '', mode: 'ONLINE', maxStudents: 30, trainerId: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    batchService.list()
      .then(r => setBatches((r.data || []).filter(b => String(b.course?.id) === String(courseId))))
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await batchService.create({
        ...form,
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
        <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold">
          <Plus size={13} /> {showForm ? 'Cancel' : 'New Batch'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Batch name *"
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <input value={form.trainerId} onChange={e => setForm(f => ({ ...f, trainerId: e.target.value }))} placeholder="Trainer ID (optional)"
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <input required type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <input value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))} placeholder="Timing"
            className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
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
              <Link href="/admin/batch-catalog" className="text-xs font-semibold text-purple-600 hover:underline">Manage in Batch Catalog</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
