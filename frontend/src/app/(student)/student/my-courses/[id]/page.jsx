'use client'
import { useEffect, useState } from 'react'
import {
  Play, Download, ChevronDown, ExternalLink,
} from 'lucide-react'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import SkeletonCard from '@/components/student/SkeletonCard'

const TABS = ['Overview', 'Syllabus', 'Sessions', 'Materials']
const MATERIAL_ICONS = { PDF: '📄', DOCUMENT: '📃', PRESENTATION: '🖥️', VIDEO: '🎬', LINK: '🔗', OTHER: '📁' }

function ModuleAccordion({ mod }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-purple-100 dark:border-purple-900/30 rounded-xl overflow-hidden mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600">
            {mod.orderIndex + 1}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{mod.title}</p>
            <p className="text-xs text-gray-400">{(mod.topics || []).length} topics</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-purple-50 dark:border-purple-900/20 p-3 bg-purple-50/30 dark:bg-purple-900/10">
          {(mod.topics || []).map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 text-sm text-gray-700 dark:text-gray-300">
              {t.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyCourseDetailPage({ params }) {
  const { id } = params
  const [tab, setTab] = useState('Overview')
  const [course, setCourse] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syllabus, setSyllabus] = useState(null)
  const [sessions, setSessions] = useState(null)
  const [materials, setMaterials] = useState(null)
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => {
    courseService.get(id)
      .then(r => setCourse(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'Syllabus' && !syllabus) {
      courseContentService.getModules(id).then(r => setSyllabus(r.data || [])).catch(() => setSyllabus([]))
    }

    if (tab === 'Sessions' && !sessions) {
      courseContentService.getModules(id).then(async r => {
        const modules = r.data || []
        const topics = modules.flatMap(m => (m.topics || []).map(t => ({ ...t, moduleTitle: m.title })))
        const results = await Promise.all(
          topics.map(t => courseContentService.getSessions(t.id).then(res => (res.data || []).map(s => ({ ...s, topicTitle: t.title }))).catch(() => []))
        )
        setSessions(results.flat())
      }).catch(() => setSessions([]))
    }

    if (tab === 'Materials' && !materials) {
      courseContentService.getModules(id).then(async r => {
        const modules = r.data || []
        const topics = modules.flatMap(m => m.topics || [])
        const [courseMats, moduleMats, topicMats] = await Promise.all([
          courseContentService.getMaterials({ courseId: id }).then(res => res.data || []).catch(() => []),
          Promise.all(modules.map(m => courseContentService.getMaterials({ moduleId: m.id }).then(res => res.data || []).catch(() => []))),
          Promise.all(topics.map(t => courseContentService.getMaterials({ topicId: t.id }).then(res => res.data || []).catch(() => []))),
        ])
        const sessionLists = await Promise.all(
          topics.map(t => courseContentService.getSessions(t.id).then(res => res.data || []).catch(() => []))
        )
        const allSessions = sessionLists.flat()
        const sessionMats = await Promise.all(
          allSessions.map(s => courseContentService.getMaterials({ sessionId: s.id }).then(res => res.data || []).catch(() => []))
        )
        setMaterials([...courseMats, ...moduleMats.flat(), ...topicMats.flat(), ...sessionMats.flat()])
      }).catch(() => setMaterials([]))
    }
  }, [tab, id, syllabus, sessions, materials])

  if (loading) return <div className="page-wrapper"><SkeletonCard lines={6} /></div>
  if (notFound || !course) {
    return (
      <div className="page-wrapper">
        <div className="glass-card p-8 text-center text-yellow-600">
          Course not found, or you haven't enrolled in it yet.
        </div>
      </div>
    )
  }

  const matTypes = materials ? [...new Set(materials.map(m => m.type))] : []
  const filteredMats = materials ? (typeFilter === 'ALL' ? materials : materials.filter(m => m.type === typeFilter)) : []

  return (
    <div className="page-wrapper">
      <div className="glass-card overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-purple-700 via-violet-700 to-indigo-700 p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <span className="chip bg-white/20 text-white text-xs mb-2">{course.level}</span>
            <h1 className="font-display text-2xl font-extrabold text-white leading-tight">{course.title}</h1>
          </div>
        </div>
        <div className="p-5">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{course.description}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">⏱️ {course.duration}</span>
            <span className="flex items-center gap-1.5">🏷️ {course.courseCode}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === t ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="glass-card p-5">
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Modules', value: syllabus?.length ?? '—', icon: '📚' },
                { label: 'Topics', value: syllabus?.reduce((s, m) => s + (m.topics || []).length, 0) ?? '—', icon: '📝' },
                { label: 'Sessions', value: sessions?.length ?? '—', icon: '🎬' },
                { label: 'Materials', value: materials?.length ?? '—', icon: '📄' },
              ].map(s => (
                <div key={s.label} className="bg-purple-50/70 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-display text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Syllabus' && (
          !syllabus ? <SkeletonCard lines={4} /> :
          syllabus.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Syllabus coming soon.</p> :
          <div>
            {syllabus.map(mod => <ModuleAccordion key={mod.id} mod={mod} />)}
          </div>
        )}

        {tab === 'Sessions' && (
          !sessions ? <SkeletonCard lines={4} /> :
          sessions.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No sessions scheduled yet.</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(s => (
              <div key={s.id} className="rounded-xl border border-purple-100 dark:border-purple-900/30 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-gray-400">{s.topicTitle}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.type || 'LIVE'}</span>
                </div>
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">{s.title}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>{s.trainerName || '—'}</span>
                  <span>{s.sessionDate || ''} {s.startTime || ''}{s.endTime ? `–${s.endTime}` : ''}</span>
                </div>
                <div className="flex gap-2">
                  {s.meetingUrl && (
                    <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center text-xs py-2 flex items-center justify-center gap-1">
                      <Play size={12} /> Join
                    </a>
                  )}
                  {s.recordingUrl && (
                    <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
                      <ExternalLink size={12} /> Recording
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Materials' && (
          !materials ? <SkeletonCard lines={4} /> :
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {['ALL', ...matTypes].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`chip text-xs px-3 py-1 cursor-pointer ${typeFilter === t ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
            {filteredMats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No materials yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMats.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                    <span className="text-2xl">{MATERIAL_ICONS[m.type] || '📁'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{m.title}</p>
                      <span className="chip bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px]">{m.type}</span>
                    </div>
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 chip bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors text-xs px-2.5 py-1.5">
                      <Download size={12} /> Get
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
