'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Play, ChevronDown, Eye,
} from 'lucide-react'
import courseService from '@/services/courseService'
import courseContentService from '@/services/courseContentService'
import SkeletonCard from '@/components/student/SkeletonCard'
import MaterialPreviewModal from '@/components/ui/MaterialPreviewModal'

const TABS = ['Overview', 'Syllabus', 'Materials']
const MATERIAL_ICONS = { PDF: '📄', DOCUMENT: '📃', PRESENTATION: '🖥️', VIDEO: '🎬', LINK: '🔗', OTHER: '📁' }

function getMaterialAction(type) {
  switch (type) {
    case 'VIDEO':
      return { icon: <Play size={12} />, label: 'Watch' }
    default:
      return { icon: <Eye size={12} />, label: 'View' }
  }
}

function MaterialItem({ material, compact = false, onView }) {
  const action = getMaterialAction(material.type)

  return (
    <div
      onClick={() => onView?.(material)}
      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border border-purple-100/70 dark:border-purple-900/40 bg-white/80 dark:bg-purple-950/20 hover:bg-purple-50/70 dark:hover:bg-purple-900/30 transition-colors cursor-pointer ${compact ? 'text-xs' : ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="text-lg flex-shrink-0">{MATERIAL_ICONS[material.type] || '📁'}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800 dark:text-gray-100 text-xs truncate" title={material.title}>
            {material.title}
          </p>
          {material.description && (
            <p className="text-[11px] text-gray-400 truncate">{material.description}</p>
          )}
        </div>
        <span className="chip bg-purple-100/70 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
          {material.type}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onView?.(material)
        }}
        className="chip bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60 transition-colors text-[11px] px-2.5 py-1 flex items-center gap-1 font-semibold flex-shrink-0 cursor-pointer"
      >
        {action.icon}
        <span>{action.label}</span>
      </button>
    </div>
  )
}

function ModuleAccordion({ mod, onViewMaterial }) {
  const [open, setOpen] = useState(false)
  const hasModuleMaterials = mod.materials && mod.materials.length > 0
  const topics = mod.topics || []

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
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{topics.length} topics</span>
              {hasModuleMaterials && (
                <span className="text-brand-600 dark:text-brand-400 font-medium">
                  {mod.materials.length} module material{mod.materials.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-purple-50 dark:border-purple-900/20 p-4 bg-purple-50/30 dark:bg-purple-900/10 space-y-3">
          {hasModuleMaterials && (
            <div className="space-y-1.5 pb-2">
              {mod.materials.map(m => (
                <MaterialItem key={m.id} material={m} compact onView={onViewMaterial} />
              ))}
            </div>
          )}

          {topics.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">No topics in this module yet.</p>
          ) : (
            topics.map(t => {
              const hasTopicMaterials = t.materials && t.materials.length > 0
              return (
                <div key={t.id} className="py-2.5 border-b last:border-b-0 border-purple-100/50 dark:border-purple-900/20">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{t.title}</span>
                    {t.durationHours ? (
                      <span className="text-[11px] text-gray-400">{t.durationHours} hrs</span>
                    ) : null}
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 mb-1.5">{t.description}</p>
                  )}
                  {hasTopicMaterials && (
                    <div className="mt-2 space-y-1.5 pl-2">
                      {t.materials.map(m => (
                        <MaterialItem key={m.id} material={m} compact onView={onViewMaterial} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
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
  const [materials, setMaterials] = useState(null)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [previewMaterial, setPreviewMaterial] = useState(null)

  const loadData = useCallback(() => {
    courseService.get(id)
      .then(r => setCourse(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    // Preload syllabus tree with contextual module and topic materials
    courseContentService.getModules(id)
      .then(r => setSyllabus(r.data || []))
      .catch(() => setSyllabus([]))

    // Preload all course materials via aggregation endpoint
    courseContentService.getAllCourseMaterials(id)
      .then(r => setMaterials(r.data || []))
      .catch(() => setMaterials([]))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Re-fetch fresh data when switching to Syllabus or Materials tabs to prevent stale UI
  useEffect(() => {
    if (tab === 'Syllabus' || tab === 'Materials') {
      courseContentService.getModules(id).then(r => setSyllabus(r.data || [])).catch(() => { })
      courseContentService.getAllCourseMaterials(id).then(r => setMaterials(r.data || [])).catch(() => { })
    }
  }, [tab, id])

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

  const courseMaterials = (materials || []).filter(m => !m.moduleId && !m.topicId)
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
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${tab === t ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'
              }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="glass-card p-5">
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Modules', value: syllabus?.length ?? '—', icon: '📚' },
                { label: 'Topics', value: syllabus?.reduce((s, m) => s + (m.topics || []).length, 0) ?? '—', icon: '📝' },
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
            (syllabus.length === 0 && courseMaterials.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-8">Syllabus coming soon.</p>
            ) : (
              <div className="space-y-4">
                {courseMaterials.length > 0 && (
                  <div className="rounded-xl border border-purple-100 dark:border-purple-900/30 p-4 bg-purple-50/40 dark:bg-purple-900/10 mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-base">🎓</span>
                      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Course Materials</h3>
                      <span className="text-xs text-gray-400 font-normal">({courseMaterials.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {courseMaterials.map(m => (
                        <MaterialItem key={m.id} material={m} compact onView={setPreviewMaterial} />
                      ))}
                    </div>
                  </div>
                )}
                {syllabus.map(mod => <ModuleAccordion key={mod.id} mod={mod} onViewMaterial={setPreviewMaterial} />)}
              </div>
            )
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
                  {filteredMats.map(m => {
                    const levelLabel = m.topicId ? 'Topic' : m.moduleId ? 'Module' : 'Course'
                    const levelColor = m.topicId
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : m.moduleId
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'

                    const action = getMaterialAction(m.type)

                    return (
                      <div
                        key={m.id}
                        onClick={() => setPreviewMaterial(m)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors bg-white/60 dark:bg-purple-950/20 cursor-pointer group"
                      >
                        <span className="text-2xl flex-shrink-0">{MATERIAL_ICONS[m.type] || '📁'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`chip text-[9px] font-bold px-1.5 py-0.5 rounded ${levelColor}`}>
                              {levelLabel}
                            </span>
                            <span className="chip bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] uppercase font-semibold">
                              {m.type}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate" title={m.title}>{m.title}</p>
                          {m.description && <p className="text-xs text-gray-400 truncate mt-0.5">{m.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewMaterial(m)
                          }}
                          className="flex items-center gap-1 chip bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-300 transition-colors text-xs px-2.5 py-1.5 font-semibold flex-shrink-0 cursor-pointer"
                        >
                          {action.icon}
                          <span>{action.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
        )}
      </div>

      {previewMaterial && (
        <MaterialPreviewModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}
    </div>
  )
}
