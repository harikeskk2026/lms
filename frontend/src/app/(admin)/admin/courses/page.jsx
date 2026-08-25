'use client'
import { useState, useEffect } from 'react'
import { Plus, BookOpen, Video, FileText, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import SlidePanel from '@/components/admin/SlidePanel'

const LEVEL_COLORS = { BEGINNER: 'bg-green-100 text-green-700', INTERMEDIATE: 'bg-yellow-100 text-yellow-700', ADVANCED: 'bg-red-100 text-red-700' }
const TYPE_COLORS = { PDF: 'bg-red-50 text-red-600', SLIDE: 'bg-blue-50 text-blue-600', CHEATSHEET: 'bg-green-50 text-green-600', EBOOK: 'bg-purple-50 text-purple-600', OTHER: 'bg-gray-50 text-gray-600' }

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [addPanel, setAddPanel] = useState(false)
  const [materialPanel, setMaterialPanel] = useState(null)
  const [syllabusPanel, setSyllabusPanel] = useState(null)
  const [sessionPanel, setSessionPanel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [courseForm, setCourseForm] = useState({ title: '', description: '', duration: '', level: 'BEGINNER', thumbnail: '' })
  const [matForm, setMatForm] = useState({ title: '', type: 'PDF', fileUrl: '', fileSize: '' })
  const [sessionForm, setSessionForm] = useState({ title: '', videoUrl: '', duration: '', classDate: '' })
  const [newModule, setNewModule] = useState('')
  const [modules, setModules] = useState([])
  const [newTopics, setNewTopics] = useState({})
  const [expandedMods, setExpandedMods] = useState({})
  const [batches, setBatches] = useState([])

  const load = () => {
    setLoading(true)
    courseService.list().then(r => setCourses(r.data || [])).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  const handleCreateCourse = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await courseService.create(courseForm)
      toast.success('Course created')
      setAddPanel(false)
      setCourseForm({ title: '', description: '', duration: '', level: 'BEGINNER', thumbnail: '' })
      load()
    } catch (err) { toast.error(err.message || 'Failed') } finally { setSaving(false) }
  }

  const handleAddMaterial = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.addMaterial(materialPanel, matForm)
      toast.success('Material added')
      setMatForm({ title: '', type: 'PDF', fileUrl: '', fileSize: '' })
      load()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const handleDeleteMaterial = async (courseId, materialId) => {
    if (!confirm('Delete this material?')) return
    try {
      await adminApi.deleteMaterial(courseId, materialId)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const handleAddSession = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.addSession(sessionPanel, sessionForm)
      toast.success('Session added')
      setSessionForm({ title: '', videoUrl: '', duration: '', classDate: '' })
      load()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const handleAddModule = async () => {
    if (!newModule.trim()) return
    const count = modules.length
    const r = await adminApi.addSyllabusModule(syllabusPanel, { title: newModule, order: count })
    setModules(prev => [...prev, { ...r.data.data, topics: [] }])
    setNewModule('')
  }

  const handleAddTopic = async (moduleId) => {
    const topicTitle = newTopics[moduleId]?.trim()
    if (!topicTitle) return
    await adminApi.addSyllabusTopic(syllabusPanel, moduleId, { title: topicTitle, order: 0 })
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, topics: [...(m.topics || []), { id: Date.now(), title: topicTitle }] } : m))
    setNewTopics(prev => ({ ...prev, [moduleId]: '' }))
  }

  const COURSE_GRADS = ['from-purple-500 to-violet-600', 'from-blue-500 to-indigo-600', 'from-indigo-500 to-purple-600', 'from-violet-500 to-fuchsia-600']

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Courses</h1>
        <button onClick={() => setAddPanel(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-purple-700">
          <Plus size={16} /> Add Course
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 glass-card animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-400">No courses yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c, i) => (
            <div key={c.id} className="glass-card overflow-hidden">
              <div className={`bg-gradient-to-r ${COURSE_GRADS[i % COURSE_GRADS.length]} px-5 py-5 text-white`}>
                <div className="flex items-start justify-between">
                  <h3 className="font-display font-bold text-lg leading-tight">{c.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[c.level]}`}>{c.level}</span>
                </div>
                <p className="text-purple-100 text-xs mt-1 line-clamp-2">{c.description}</p>
              </div>
              <div className="p-5">
                <div className="flex gap-3 mb-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen size={11} /> {c._count?.batches || 0} batches</span>
                  <span className="flex items-center gap-1"><FileText size={11} /> {c._count?.materials || 0} materials</span>
                  <span>{c.duration}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setMaterialPanel(c.id)}
                    className="flex-1 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors">
                    Materials
                  </button>
                  <button onClick={() => { setSyllabusPanel(c.id); setModules([]) }}
                    className="flex-1 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
                    Syllabus
                  </button>
                  <button onClick={() => setSessionPanel(c.id)}
                    className="flex-1 py-1.5 rounded-xl bg-green-50 text-green-600 text-xs font-semibold hover:bg-green-100 transition-colors">
                    Sessions
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Course Panel */}
      <SlidePanel open={addPanel} onClose={() => setAddPanel(false)} title="Add Course">
        <form onSubmit={handleCreateCourse} className="space-y-4">
          {[
            { label: 'Title *', key: 'title', placeholder: 'Full Stack Python' },
            { label: 'Duration', key: 'duration', placeholder: '3 months' },
            { label: 'Thumbnail URL', key: 'thumbnail', placeholder: 'https://...' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input value={courseForm[key]} onChange={e => setCourseForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                required={key === 'title'} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
            <select value={courseForm.level} onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Materials Panel */}
      <SlidePanel open={!!materialPanel} onClose={() => setMaterialPanel(null)} title="Manage Materials">
        <form onSubmit={handleAddMaterial} className="space-y-4 mb-6">
          <p className="text-sm font-semibold text-gray-700">Add New Material</p>
          {[
            { label: 'Title *', key: 'title', placeholder: 'Python Cheatsheet' },
            { label: 'File URL *', key: 'fileUrl', placeholder: 'https://...' },
            { label: 'File Size', key: 'fileSize', placeholder: '2.5 MB' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input value={matForm[key]} onChange={e => setMatForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                required={['title', 'fileUrl'].includes(key)} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <select value={matForm.type} onChange={e => setMatForm(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option>PDF</option><option>SLIDE</option><option>CHEATSHEET</option><option>EBOOK</option><option>OTHER</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Adding...' : 'Add Material'}
          </button>
        </form>
        <div className="space-y-2">
          {(courses.find(c => c.id === materialPanel)?.materials || []).map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">{m.title}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[m.type] || 'bg-gray-50 text-gray-500'}`}>{m.type}</span>
              </div>
              <button onClick={() => handleDeleteMaterial(materialPanel, m.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </SlidePanel>

      {/* Syllabus Panel */}
      <SlidePanel open={!!syllabusPanel} onClose={() => setSyllabusPanel(null)} title="Manage Syllabus">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newModule} onChange={e => setNewModule(e.target.value)} placeholder="Module title"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={handleAddModule} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold">Add</button>
          </div>
          <div className="space-y-2">
            {modules.map(m => (
              <div key={m.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedMods(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700">
                  {m.title}
                  {expandedMods[m.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expandedMods[m.id] && (
                  <div className="p-3 space-y-2">
                    {(m.topics || []).map(t => (
                      <p key={t.id} className="text-sm text-gray-600 pl-2 border-l-2 border-purple-200">{t.title}</p>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input value={newTopics[m.id] || ''} onChange={e => setNewTopics(prev => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="Topic title"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                      <button onClick={() => handleAddTopic(m.id)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">Add Topic</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {modules.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Add modules above to build the syllabus</p>}
          </div>
        </div>
      </SlidePanel>

      {/* Sessions Panel */}
      <SlidePanel open={!!sessionPanel} onClose={() => setSessionPanel(null)} title="Recorded Sessions">
        <form onSubmit={handleAddSession} className="space-y-4">
          {[
            { label: 'Title *', key: 'title', placeholder: 'Python Basics - Lecture 1' },
            { label: 'Video URL *', key: 'videoUrl', placeholder: 'https://youtube.com/...' },
            { label: 'Duration', key: 'duration', placeholder: '1:30:00' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input value={sessionForm[key]} onChange={e => setSessionForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                required={['title', 'videoUrl'].includes(key)} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Class Date</label>
            <input type="date" value={sessionForm.classDate} onChange={e => setSessionForm(f => ({ ...f, classDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Adding...' : 'Add Session'}
          </button>
        </form>
      </SlidePanel>
    </div>
  )
}
