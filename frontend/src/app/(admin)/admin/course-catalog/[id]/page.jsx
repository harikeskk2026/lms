'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Upload, ExternalLink, Clock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import batchService from '@/services/batchService'
import { resolveFileUrl } from '@/lib/api'

const TABS = ['Overview', 'Syllabus', 'Sessions', 'Materials', 'Batches']
const MATERIAL_TYPES = ['PDF', 'DOCUMENT', 'PRESENTATION', 'VIDEO', 'LINK', 'OTHER']
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

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      router.replace('/admin/dashboard')
    }
  }, [user, router])

  const loadCourse = useCallback(() => {
    courseService.get(courseId)
      .then(r => setCourse(r.data))
      .catch(() => toast.error('Failed to load course'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { loadCourse() }, [loadCourse])

  if (user && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') return null

  if (loading) return <div className="max-w-7xl mx-auto"><div className="h-40 glass-card animate-pulse" /></div>
  if (!course) return <div className="max-w-7xl mx-auto glass-card p-16 text-center text-gray-400">Course not found</div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Link href="/admin/course-catalog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
        <ArrowLeft size={14} /> Back to Courses
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

const EMPTY_MODULE_FORM = { title: '', description: '', status: 'PUBLISHED', durationValue: '', durationUnit: 'WEEKS' }
const EMPTY_TOPIC_FORM = { title: '', description: '', status: 'PUBLISHED', durationHours: '' }
const DURATION_UNITS = ['HOURS', 'DAYS', 'WEEKS']

function DurationInput({ value, unit, onValueChange, onUnitChange, small }) {
  const size = small ? 'py-1.5 text-xs' : 'py-2 text-xs'
  return (
    <div className="flex gap-1">
      <input type="number" min="1" value={value} onChange={e => onValueChange(e.target.value)} placeholder="Duration"
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

function SyllabusTab({ courseId }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [newModule, setNewModule] = useState(EMPTY_MODULE_FORM)
  const [newTopic, setNewTopic] = useState({})
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
    if (!newModule.title.trim()) return
    try {
      await courseContentService.createModule(courseId, {
        title: newModule.title.trim(), description: newModule.description.trim(), status: newModule.status,
        durationValue: newModule.durationValue ? Number(newModule.durationValue) : null,
        durationUnit: newModule.durationValue ? newModule.durationUnit : null,
      })
      setNewModule(EMPTY_MODULE_FORM)
      load()
    } catch (err) { toast.error(err.message || 'Failed to add module') }
  }

  async function saveModuleEdit() {
    try {
      await courseContentService.updateModule(editingModule.id, {
        title: editingModule.title, description: editingModule.description, status: editingModule.status,
        durationValue: editingModule.durationValue ? Number(editingModule.durationValue) : null,
        durationUnit: editingModule.durationValue ? editingModule.durationUnit : null,
      })
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
    const topicForm = newTopic[moduleId] || EMPTY_TOPIC_FORM
    if (!topicForm.title.trim()) return
    try {
      await courseContentService.createTopic(moduleId, {
        title: topicForm.title.trim(), description: (topicForm.description || '').trim(), status: topicForm.status || 'PUBLISHED',
        durationHours: topicForm.durationHours ? Number(topicForm.durationHours) : null,
      })
      setNewTopic(prev => ({ ...prev, [moduleId]: EMPTY_TOPIC_FORM }))
      load()
    } catch (err) { toast.error(err.message || 'Failed to add topic') }
  }

  async function saveTopicEdit() {
    try {
      await courseContentService.updateTopic(editingTopic.id, {
        title: editingTopic.title, description: editingTopic.description, status: editingTopic.status,
        durationHours: editingTopic.durationHours ? Number(editingTopic.durationHours) : null,
      })
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
      <div className="space-y-2 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input value={newModule.title} onChange={e => setNewModule(f => ({ ...f, title: e.target.value }))} placeholder="New module title"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <StatusSelect value={newModule.status} onChange={v => setNewModule(f => ({ ...f, status: v }))} />
          <button onClick={addModule} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1 flex-shrink-0">
            <Plus size={14} /> Add Module
          </button>
        </div>
        <div className="flex gap-2">
          <input value={newModule.description} onChange={e => setNewModule(f => ({ ...f, description: e.target.value }))} placeholder="Module description (optional)"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
          <DurationInput value={newModule.durationValue} unit={newModule.durationUnit}
            onValueChange={v => setNewModule(f => ({ ...f, durationValue: v }))}
            onUnitChange={u => setNewModule(f => ({ ...f, durationUnit: u }))} />
        </div>
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
                {editingModule?.id !== m.id && <StatusBadge status={m.status} />}
                <span className="text-xs text-gray-400 flex-shrink-0">({(m.topics || []).length} topics)</span>
                {editingModule?.id !== m.id && formatDuration(m.durationValue, m.durationUnit) && (
                  <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1"><Clock size={11} /> {formatDuration(m.durationValue, m.durationUnit)}</span>
                )}
              </button>
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {editingModule?.id === m.id && <StatusSelect small value={editingModule.status} onChange={v => setEditingModule({ ...editingModule, status: v })} />}
                <button onClick={() => moveModule(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={13} /></button>
                <button onClick={() => moveModule(i, 1)} disabled={i === modules.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={13} /></button>
                {editingModule?.id === m.id ? (
                  <button onClick={saveModuleEdit} className="text-xs font-semibold text-purple-600 px-2">Save</button>
                ) : (
                  <button onClick={() => setEditingModule({ id: m.id, title: m.title, description: m.description || '', status: m.status || 'PUBLISHED', durationValue: m.durationValue || '', durationUnit: m.durationUnit || 'WEEKS' })} className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center"><Pencil size={12} /></button>
                )}
                <button onClick={() => deleteModule(m.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>
              </div>
            </div>
            {editingModule?.id === m.id && (
              <div className="px-4 py-2 bg-purple-50/50 dark:bg-purple-900/10 flex gap-2">
                <input value={editingModule.description} onChange={e => setEditingModule({ ...editingModule, description: e.target.value })}
                  placeholder="Module description" onKeyDown={e => e.key === 'Enter' && saveModuleEdit()}
                  className="flex-1 rounded-lg border border-purple-200 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                <DurationInput small value={editingModule.durationValue} unit={editingModule.durationUnit}
                  onValueChange={v => setEditingModule({ ...editingModule, durationValue: v })}
                  onUnitChange={u => setEditingModule({ ...editingModule, durationUnit: u })} />
              </div>
            )}
            {m.description && editingModule?.id !== m.id && (
              <p className="px-4 py-1.5 text-xs text-gray-500 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">{m.description}</p>
            )}
            {expanded[m.id] && (
              <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                {(m.topics || []).map((t, ti) => (
                  <div key={t.id} className="pl-4 border-l-2 border-purple-100 dark:border-purple-900/30 py-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      {editingTopic?.id === t.id ? (
                        <input autoFocus value={editingTopic.title} onChange={e => setEditingTopic({ ...editingTopic, title: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && saveTopicEdit()}
                          className="flex-1 rounded-lg border border-purple-300 px-2 py-1 text-xs" />
                      ) : (
                        <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate flex items-center gap-1.5">
                          {t.title} <StatusBadge status={t.status} />
                          {t.durationHours && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-0.5 flex-shrink-0"><Clock size={10} /> {t.durationHours}h</span>
                          )}
                        </span>
                      )}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {editingTopic?.id === t.id && <StatusSelect small value={editingTopic.status} onChange={v => setEditingTopic({ ...editingTopic, status: v })} />}
                        <button onClick={() => moveTopic(m.id, m.topics, ti, -1)} disabled={ti === 0} className="w-6 h-6 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={11} /></button>
                        <button onClick={() => moveTopic(m.id, m.topics, ti, 1)} disabled={ti === m.topics.length - 1} className="w-6 h-6 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={11} /></button>
                        {editingTopic?.id === t.id ? (
                          <button onClick={saveTopicEdit} className="text-xs font-semibold text-purple-600 px-1">Save</button>
                        ) : (
                          <button onClick={() => setEditingTopic({ id: t.id, title: t.title, description: t.description || '', status: t.status || 'PUBLISHED', durationHours: t.durationHours || '' })} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center"><Pencil size={11} /></button>
                        )}
                        <button onClick={() => deleteTopic(t.id)} className="w-6 h-6 rounded hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    {editingTopic?.id === t.id ? (
                      <div className="flex gap-2">
                        <input value={editingTopic.description} onChange={e => setEditingTopic({ ...editingTopic, description: e.target.value })}
                          placeholder="Topic description" onKeyDown={e => e.key === 'Enter' && saveTopicEdit()}
                          className="flex-1 rounded-lg border border-purple-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="number" min="1" value={editingTopic.durationHours} onChange={e => setEditingTopic({ ...editingTopic, durationHours: e.target.value })}
                          placeholder="Hours" onKeyDown={e => e.key === 'Enter' && saveTopicEdit()}
                          className="w-20 rounded-lg border border-purple-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                      </div>
                    ) : t.description ? (
                      <p className="text-xs text-gray-400">{t.description}</p>
                    ) : null}
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input value={(newTopic[m.id] || EMPTY_TOPIC_FORM).title} onChange={e => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), title: e.target.value } }))}
                    placeholder="New topic title" onKeyDown={e => e.key === 'Enter' && addTopic(m.id)}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  <input type="number" min="1" value={(newTopic[m.id] || EMPTY_TOPIC_FORM).durationHours} onChange={e => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), durationHours: e.target.value } }))}
                    placeholder="Hours" onKeyDown={e => e.key === 'Enter' && addTopic(m.id)}
                    className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  <StatusSelect small value={(newTopic[m.id] || EMPTY_TOPIC_FORM).status} onChange={v => setNewTopic(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || EMPTY_TOPIC_FORM), status: v } }))} />
                  <button onClick={() => addTopic(m.id)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex-shrink-0">Add Topic</button>
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
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      toast.error('End time must be after start time')
      return
    }
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
      sessionDate: s.sessionDate || '', startTime: s.startTime || '', endTime: s.endTime || '',
      durationMinutes: s.durationMinutes || '', type: s.type || 'LIVE',
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
              <input value={form.trainerName} onChange={e => setForm(f => ({ ...f, trainerName: e.target.value }))} placeholder="Trainer name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="LIVE">Live</option>
                  <option value="RECORDED">Recorded</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Start Time</label>
                  <input type="time" value={form.startTime} max={form.endTime || undefined}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">End Time</label>
                  <input type="time" value={form.endTime} min={form.startTime || undefined}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <input type="number" min="0" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} placeholder="Duration (minutes)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
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
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
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

function BatchesTab({ courseId, courseTitle }) {
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
      .then(r => setBatches((r.data || []).filter(b => String(b.course?.id) === String(courseId))))
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
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
