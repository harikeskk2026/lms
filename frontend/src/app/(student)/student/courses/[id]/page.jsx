'use client'
import { use, useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  BookOpen, FileText, Play, Calendar, Download,
  CheckCircle, Circle, ChevronDown
} from 'lucide-react'
import { studentApi, resolveFileUrl } from '@/lib/api'
import SkeletonCard from '@/components/student/SkeletonCard'

const TABS = ['Overview','Syllabus','Materials','Sessions','Classes']

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
        active ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'
      }`}
    >
      {label}
    </button>
  )
}

function ModuleAccordion({ mod }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-purple-100 dark:border-purple-900/30 rounded-xl overflow-hidden mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600">
            {mod.order}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{mod.title}</p>
            <p className="text-xs text-gray-400">{mod.topics.length} topics · {mod.pct || 0}% complete</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full hidden sm:block">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${mod.pct || 0}%` }} />
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="border-t border-purple-50 dark:border-purple-900/20 p-3 bg-purple-50/30 dark:bg-purple-900/10">
          {mod.topics.map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 text-sm">
              {t.isCompleted
                ? <CheckCircle size={14} className="text-green-500" />
                : <Circle size={14} className="text-gray-300 dark:text-gray-600" />
              }
              <span className={t.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CourseDetailPage({ params }) {
  const { id } = params
  const [tab, setTab]         = useState('Overview')
  const [course, setCourse]   = useState(null)
  const [syllabus, setSyllabus] = useState(null)
  const [materials, setMats]  = useState(null)
  const [sessions, setSess]   = useState(null)
  const [classes, setClasses] = useState(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => {
    studentApi.getCourse(id)
      .then(r => { setCourse(r.data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'Syllabus' && !syllabus) {
      studentApi.getSyllabus(id).then(r => setSyllabus(r.data.data)).catch(() => setSyllabus([]))
    }
    if (tab === 'Materials' && !materials) {
      studentApi.getMaterials(id).then(r => setMats(r.data.data)).catch(() => setMats([]))
    }
    if (tab === 'Sessions' && !sessions) {
      studentApi.getSessions(id).then(r => setSess(r.data.data)).catch(() => setSess([]))
    }
    if (tab === 'Classes' && !classes) {
      studentApi.getClasses().then(r => setClasses(r.data.data)).catch(() => setClasses([]))
    }
  }, [tab, id])

  if (loading) return <div className="page-wrapper"><SkeletonCard lines={6} /></div>
  if (!course) return <div className="page-wrapper"><div className="glass-card p-8 text-center text-yellow-600">Course not found</div></div>

  const MATERIAL_ICONS = { PDF: '📄', CHEATSHEET: '📋', SLIDE: '🖥️', EBOOK: '📚', OTHER: '📁' }
  const GRADIENTS = ['from-purple-600 to-violet-700','from-indigo-600 to-blue-700','from-violet-600 to-purple-700','from-fuchsia-600 to-violet-700','from-blue-500 to-indigo-700','from-violet-500 to-purple-600','from-indigo-500 to-violet-600','from-purple-700 to-indigo-700']

  const matTypes = materials ? [...new Set(materials.map(m => m.type))] : []
  const filteredMats = materials ? (typeFilter === 'ALL' ? materials : materials.filter(m => m.type === typeFilter)) : []

  return (
    <div className="page-wrapper">
      {/* Header */}
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
            {course.batches?.[0] && <>
              <span className="flex items-center gap-1.5">📅 {course.batches[0].timing}</span>
              <span className="flex items-center gap-1.5">🖥️ {course.batches[0].mode}</span>
            </>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => <TabBtn key={t} label={t} active={tab === t} onClick={() => setTab(t)} />)}
      </div>

      {/* Tab Content */}
      <div className="glass-card p-5">
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Modules', value: course.syllabus?.length || 0, icon: '📚' },
                { label: 'Topics', value: course.syllabus?.reduce((s, m) => s + m.topics.length, 0) || 0, icon: '📝' },
                { label: 'Materials', value: course.materials?.length || 0, icon: '📄' },
                { label: 'Recordings', value: course.sessions?.length || 0, icon: '🎬' },
              ].map(s => (
                <div key={s.label} className="bg-purple-50/70 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-display text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">What you'll learn</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {course.syllabus?.map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {m.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Syllabus' && (
          !syllabus ? <SkeletonCard lines={4} /> :
          <div>
            {syllabus.map(mod => <ModuleAccordion key={mod.id} mod={mod} />)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMats.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                  <span className="text-2xl">{MATERIAL_ICONS[m.type] || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{m.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="chip bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px]">{m.type}</span>
                      {m.fileSize && <span className="text-xs text-gray-400">{m.fileSize}</span>}
                    </div>
                  </div>
                  <a href={resolveFileUrl(m.fileUrl)} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 chip bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors text-xs px-2.5 py-1.5">
                    <Download size={12} /> Get
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Sessions' && (
          !sessions ? <SkeletonCard lines={4} /> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s, i) => (
              <div key={s.id} className="rounded-xl overflow-hidden border border-purple-100 dark:border-purple-900/30 hover:scale-[1.02] transition-all duration-300">
                <div className={`h-24 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center relative`}>
                  <Play size={28} className="text-white" fill="white" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">{s.title}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>⏱️ {s.duration}</span>
                    <span>👁️ {s.views} views</span>
                  </div>
                  <a href={s.videoUrl} target="_blank" rel="noopener noreferrer"
                     className="btn-primary w-full text-center text-xs py-2 block">
                    Watch Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Classes' && (
          !classes ? <SkeletonCard lines={4} /> :
          <div className="space-y-2">
            {classes.map((c, i) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-purple-50 dark:border-purple-900/20 hover:bg-purple-50/40 dark:hover:bg-purple-900/10 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  c.status === 'COMPLETED' ? 'bg-green-500' :
                  c.status === 'SCHEDULED' ? 'bg-brand-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{c.title}</p>
                    <span className={`chip text-[10px] flex-shrink-0 ${
                      c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      c.status === 'SCHEDULED' ? 'bg-brand-100 text-brand-700' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(c.date), 'EEE, MMM d yyyy')}</p>
                  {c.topics?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {c.topics.slice(0, 3).map(t => (
                        <span key={t.id} className="chip bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] border border-purple-100 dark:border-purple-800">{t.title}</span>
                      ))}
                    </div>
                  )}
                </div>
                {c.recordingUrl && (
                  <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer"
                     className="chip bg-brand-100 text-brand-700 text-[10px] px-2 py-1 flex-shrink-0 hover:bg-brand-200">
                    <Play size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
