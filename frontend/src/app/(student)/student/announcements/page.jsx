'use client'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Pin, Megaphone, Search, MessageSquare, Send, CalendarDays, ChevronLeft, ChevronRight, ArrowLeft, X as XIcon } from 'lucide-react'
import { format, formatDistanceToNow, addMonths, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'

const FILTERS = ['All', 'Unread', 'URGENT', 'PLACEMENT', 'EXAM', 'HOLIDAY', 'ATTENDANCE']

const CATEGORY_STYLES = {
  GENERAL: 'bg-gray-100 text-gray-600',
  URGENT: 'bg-red-100 text-red-700',
  PLACEMENT: 'bg-emerald-100 text-emerald-700',
  EXAM: 'bg-amber-100 text-amber-700',
  HOLIDAY: 'bg-sky-100 text-sky-700',
  ATTENDANCE: 'bg-indigo-100 text-indigo-700',
}

const PRIORITY_STYLES = {
  LOW: 'border-gray-200',
  NORMAL: 'border-blue-200',
  HIGH: 'border-orange-300',
  CRITICAL: 'border-red-500',
}

const ACTION_ROUTES = {
  ASSIGNMENT: '/student/assignments',
  QUIZ: '/student/quizzes',
  COURSE: '/student/my-courses',
  COURSE_MATERIAL: '/student/my-courses',
  PLACEMENT_DRIVE: '/student/placement',
  ATTENDANCE: '/student/attendance',
}

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [openComments, setOpenComments] = useState(null)
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)

  useEffect(() => {
    studentApi.getAnnouncements()
      .then(r => {
        const list = r.data.data || []
        setAnnouncements(list)
        list.forEach(a => studentApi.markAnnouncementViewed(a.id).catch(() => {}))
      })
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false))
  }, [])

  const handleOpenDetail = (a) => {
    setViewingAnnouncement(a)
    if (!a.viewed) {
      studentApi.markAnnouncementViewed(a.id).catch(() => {})
      setAnnouncements(list => list.map(item => item.id === a.id ? { ...item, viewed: true } : item))
    }
  }

  const acknowledge = async (id) => {
    try {
      await studentApi.acknowledgeAnnouncement(id)
      setAnnouncements(list => list.map(a => a.id === id ? { ...a, acknowledged: true } : a))
      setViewingAnnouncement(current => current && current.id === id ? { ...current, acknowledged: true } : current)
      toast.success('Acknowledged')
    } catch (err) { toast.error(err?.message || 'Failed') }
  }

  const visible = useMemo(() => {
    let list = [...announcements]
    if (filter === 'Unread') list = list.filter(a => !a.viewed)
    else if (filter !== 'All') list = list.filter(a => a.category === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
    }
    const priorityRank = { CRITICAL: 3, HIGH: 2, NORMAL: 1, LOW: 0 }
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      if (sortBy === 'priority') return (priorityRank[b.priority] ?? 1) - (priorityRank[a.priority] ?? 1)
      const diff = new Date(b.createdAt) - new Date(a.createdAt)
      return sortBy === 'oldest' ? -diff : diff
    })
    return list
  }, [announcements, filter, search, sortBy])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Announcements</h1>
        <button
          onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors shadow-sm"
        >
          <CalendarDays size={15} className="text-purple-600 dark:text-purple-400" />
          <span>{view === 'list' ? 'Calendar View' : 'List View'}</span>
        </button>
      </div>

      {view === 'calendar' ? (
        <StudentCalendarView announcements={announcements} onViewDetail={handleOpenDetail} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}>
                {f === 'Unread'
                  ? `Unread (${announcements.filter(a => !a.viewed).length})`
                  : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-28 glass-card animate-pulse" />)
            ) : visible.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Megaphone size={32} className="text-purple-200 mx-auto mb-3" />
                <p className="text-gray-400">No announcements match this view.</p>
              </div>
            ) : (
              visible.map(a => (
                <AnnouncementCard key={a.id} a={a} onAcknowledge={acknowledge}
                  onViewDetail={handleOpenDetail}
                  commentsOpen={openComments === a.id} onToggleComments={() => setOpenComments(o => o === a.id ? null : a.id)} />
              ))
            )}
          </div>
        </>
      )}

      {viewingAnnouncement && (
        <StudentViewModal
          a={viewingAnnouncement}
          onClose={() => setViewingAnnouncement(null)}
          onAcknowledge={acknowledge}
        />
      )}
    </div>
  )
}

function AnnouncementCard({ a, onAcknowledge, onViewDetail, commentsOpen, onToggleComments }) {
  const route = a.actionType === 'CUSTOM' ? a.actionUrl : ACTION_ROUTES[a.actionType]

  return (
    <div
      onClick={() => onViewDetail(a)}
      className={`glass-card p-5 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.NORMAL} ${!a.viewed ? 'ring-1 ring-purple-200' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          {a.isPinned && <Pin size={12} className="text-purple-500" />}
          {!a.viewed && <span className="w-2 h-2 rounded-full bg-purple-500" title="Unread" />}
          {a.category && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
              {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
            </span>
          )}
          {(a.priority === 'HIGH' || a.priority === 'CRITICAL') && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.priority === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
              {a.priority}
            </span>
          )}
          <h3 className="font-display font-bold text-gray-800 dark:text-white">{a.title}</h3>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{a.body}</p>

      <p className="text-xs text-gray-400 mt-2">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
      {a.expiresAt && <p className="text-[10px] text-amber-500 mt-0.5">Expires {format(new Date(a.expiresAt), 'dd MMM yyyy')}</p>}

      <div className="flex items-center gap-2 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
        {route && a.actionLabel && (
          <Link href={route} className="text-xs font-semibold bg-purple-600 text-white rounded-lg px-3 py-1.5">
            {a.actionLabel}
          </Link>
        )}
        {a.allowComments && (
          <button onClick={e => { e.stopPropagation(); onToggleComments() }} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-purple-600">
            <MessageSquare size={12} /> Comments
          </button>
        )}
        {a.requiresAcknowledgment && (
          a.acknowledged ? (
            <span className="text-xs font-semibold text-emerald-600">✓ Acknowledged</span>
          ) : (
            <button onClick={e => { e.stopPropagation(); onAcknowledge(a.id) }}
              className="text-xs font-semibold bg-emerald-600 text-white rounded-lg px-3 py-1.5">
              I Understand / Acknowledge
            </button>
          )
        )}
      </div>

      {commentsOpen && <div onClick={e => e.stopPropagation()}><CommentsThread announcementId={a.id} /></div>}
    </div>
  )
}

function StudentViewModal({ a, onClose, onAcknowledge }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !a) return null

  const route = a.actionType === 'CUSTOM' ? a.actionUrl : ACTION_ROUTES[a.actionType]

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {a.isPinned && <Pin size={12} className="text-purple-500" />}
              {a.category && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
                  {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
                </span>
              )}
              {(a.priority === 'HIGH' || a.priority === 'CRITICAL') && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.priority === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                  {a.priority}
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-gray-800 dark:text-white text-lg">{a.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onClose} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{a.body}</p>
        </div>

        {/* Action & Acknowledgment */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex-wrap">
          <button onClick={onClose} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          {route && a.actionLabel && (
            <Link href={route} className="text-xs font-semibold bg-purple-600 text-white rounded-lg px-3.5 py-2">
              {a.actionLabel}
            </Link>
          )}
          {a.requiresAcknowledgment && (
            a.acknowledged ? (
              <span className="text-xs font-semibold text-emerald-600">✓ Acknowledged</span>
            ) : (
              <button onClick={() => onAcknowledge(a.id)}
                className="text-xs font-semibold bg-emerald-600 text-white rounded-lg px-3.5 py-2">
                I Understand / Acknowledge
              </button>
            )
          )}
        </div>

        {/* Comments Section */}
        {a.allowComments && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Comments & Discussion</p>
            <CommentsThread announcementId={a.id} />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function CommentsThread({ announcementId }) {
  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    studentApi.getAnnouncementComments(announcementId).then(r => setComments(r.data.data || [])).catch(() => setComments([]))
  }, [announcementId])

  const post = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      const r = await studentApi.addAnnouncementComment(announcementId, { content: text })
      setComments(list => [...(list || []), r.data.data])
      setText('')
    } catch (err) { toast.error(err?.message || 'Failed to post comment') } finally { setPosting(false) }
  }

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
      {comments === null ? (
        <p className="text-xs text-gray-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400">No questions yet — ask one below.</p>
      ) : (
        comments.map(c => (
          <div key={c.id} className="text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{c.userName}</span>
            <span className="text-gray-400"> ({c.userRole})</span>
            <p className="text-gray-600 dark:text-gray-300">{c.content}</p>
          </div>
        ))
      )}
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Ask a question..."
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200" />
        <button onClick={post} disabled={posting} className="text-gray-400 hover:text-purple-600 disabled:opacity-50">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

function StudentCalendarView({ announcements, onViewDetail }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dayItems = {}
  announcements.forEach(a => {
    const mark = (dateStr, type) => {
      if (!dateStr) return
      const d = new Date(dateStr)
      if (d.getFullYear() !== year || d.getMonth() !== month) return
      const key = d.getDate()
      dayItems[key] = dayItems[key] || []
      dayItems[key].push({ a, type })
    }
    if (a.createdAt) mark(a.createdAt, 'published')
    if (a.expiresAt) mark(a.expiresAt, 'expiring')
  })

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const TYPE_DOT = { published: 'bg-emerald-500', expiring: 'bg-amber-500' }
  const TYPE_LABEL = { published: 'Published', expiring: 'Expiring' }
  const selectedItems = selectedDay ? (dayItems[selectedDay] || []) : []

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      <div className="glass-card p-6 flex-1 min-w-0 w-full">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-gray-800 dark:text-white text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-semibold text-gray-600 dark:text-gray-300"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Published</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Expiring</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-gray-400 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            const hasItems = d && dayItems[d] && dayItems[d].length > 0
            const isToday = d && new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year

            return (
              <button
                key={i}
                type="button"
                disabled={!d}
                onClick={() => setSelectedDay(d)}
                className={`h-11 sm:h-12 rounded-xl border p-1.5 text-left transition-all relative ${
                  !d
                    ? 'border-transparent cursor-default'
                    : selectedDay === d
                    ? 'border-purple-500 ring-2 ring-purple-400/20 bg-purple-50/60 dark:bg-purple-950/30'
                    : isToday
                    ? 'border-purple-300 dark:border-purple-700 bg-purple-50/20'
                    : 'border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 bg-white/50 dark:bg-gray-800/50'
                }`}
              >
                {d && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        selectedDay === d
                          ? 'text-purple-600 dark:text-purple-400'
                          : isToday
                          ? 'w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px]'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {d}
                      </span>
                    </div>

                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {(dayItems[d] || []).slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className={`w-2 h-2 rounded-full inline-block ${TYPE_DOT[item.type]}`}
                          title={`${item.type}: ${item.a.title}`}
                        />
                      ))}
                      {(dayItems[d] || []).length > 3 && (
                        <span className="text-[9px] font-bold text-gray-400">+{dayItems[d].length - 3}</span>
                      )}
                    </div>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="glass-card p-5 w-full lg:w-80 flex-shrink-0 flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3 flex-shrink-0">
            <div>
              <p className="font-display font-bold text-gray-800 dark:text-white">
                {format(new Date(year, month, selectedDay), 'dd MMMM yyyy')}
              </p>
              <p className="text-xs text-gray-400">{selectedItems.length} announcement(s)</p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <XIcon size={15} />
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Megaphone size={28} className="mx-auto mb-2 opacity-40 text-purple-400" />
              <p className="text-xs font-medium">No announcements scheduled or published on this date.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {selectedItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onViewDetail(item.a)}
                  className="border border-gray-200 dark:border-gray-700/80 rounded-xl p-3.5 hover:shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer bg-white/40 dark:bg-gray-800/40"
                >
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${TYPE_DOT[item.type]}`} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{TYPE_LABEL[item.type]}</span>
                    {item.a.category && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CATEGORY_STYLES[item.a.category] || CATEGORY_STYLES.GENERAL}`}>
                        {item.a.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white line-clamp-1">{item.a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.a.body}</p>
                  <div className="mt-2 text-right">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline">View details →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

