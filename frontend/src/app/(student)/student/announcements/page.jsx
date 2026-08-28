'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Pin, Megaphone, Search, MessageSquare, Send } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
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
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [openComments, setOpenComments] = useState(null)

  useEffect(() => {
    studentApi.getAnnouncements()
      .then(r => {
        const list = r.data.data || []
        setAnnouncements(list)
        // Best-effort view tracking - idempotent on the backend.
        list.forEach(a => studentApi.markAnnouncementViewed(a.id).catch(() => {}))
      })
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false))
  }, [])

  const acknowledge = async (id) => {
    try {
      await studentApi.acknowledgeAnnouncement(id)
      setAnnouncements(list => list.map(a => a.id === id ? { ...a, acknowledged: true } : a))
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
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Announcements</h1>

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
            {f === 'Unread' ? `Unread (${announcements.filter(a => !a.viewed).length})` : f.charAt(0) + f.slice(1).toLowerCase()}
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
              commentsOpen={openComments === a.id} onToggleComments={() => setOpenComments(o => o === a.id ? null : a.id)} />
          ))
        )}
      </div>
    </div>
  )
}

function AnnouncementCard({ a, onAcknowledge, commentsOpen, onToggleComments }) {
  const route = a.actionType === 'CUSTOM' ? a.actionUrl : ACTION_ROUTES[a.actionType]

  return (
    <div className={`glass-card p-5 border-l-4 ${PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.NORMAL} ${!a.viewed ? 'ring-1 ring-purple-200' : ''}`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
      <p className="text-sm text-gray-600 dark:text-gray-300">{a.body}</p>
      <p className="text-xs text-gray-400 mt-2">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
      {a.expiresAt && <p className="text-[10px] text-amber-500 mt-0.5">Expires {format(new Date(a.expiresAt), 'dd MMM yyyy')}</p>}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {route && a.actionLabel && (
          <Link href={route} className="text-xs font-semibold bg-purple-600 text-white rounded-lg px-3 py-1.5">
            {a.actionLabel}
          </Link>
        )}
        {a.allowComments && (
          <button onClick={onToggleComments} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-purple-600">
            <MessageSquare size={12} /> Comments
          </button>
        )}
        {a.requiresAcknowledgment && (
          a.acknowledged ? (
            <span className="text-xs font-semibold text-emerald-600">✓ Acknowledged</span>
          ) : (
            <button onClick={() => onAcknowledge(a.id)}
              className="text-xs font-semibold bg-emerald-600 text-white rounded-lg px-3 py-1.5">
              I Understand / Acknowledge
            </button>
          )
        )}
      </div>

      {commentsOpen && <CommentsThread announcementId={a.id} />}
    </div>
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
