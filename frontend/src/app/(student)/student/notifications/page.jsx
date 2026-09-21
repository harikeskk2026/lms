'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import { Check } from 'lucide-react'
import api, { studentApi } from '@/lib/api'
import toast from 'react-hot-toast'
import SkeletonCard from '@/components/student/SkeletonCard'

const FILTERS = ['All', 'Unread', 'Assignments', 'Quizzes', 'Placement', 'Announcements']

const FILTER_CATEGORY = {
  Assignments: 'ASSIGNMENTS',
  Quizzes: 'QUIZZES',
  Placement: 'PLACEMENT',
  Announcements: 'ANNOUNCEMENTS',
}

const TYPE_STYLE = {
  INFO:    { bg: 'bg-brand-100', text: 'text-brand-700', dot: 'bg-brand-600' },
  SUCCESS: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-600' },
  WARNING: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  URGENT:  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
}

const TYPE_ICON = {
  INFO: '🔔', SUCCESS: '✅', WARNING: '⚠️', URGENT: '🚨'
}

function groupByDate(notifs) {
  const groups = { TODAY: [], YESTERDAY: [], 'THIS WEEK': [], EARLIER: [] }
  for (const n of notifs) {
    const d = new Date(n.createdAt)
    if (isToday(d))          groups.TODAY.push(n)
    else if (isYesterday(d)) groups.YESTERDAY.push(n)
    else if (isThisWeek(d))  groups['THIS WEEK'].push(n)
    else                     groups.EARLIER.push(n)
  }
  return groups
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('All')
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = useCallback(() => {
    api.get('/student/notifications/unread-count')
      .then(res => setUnreadCount(res.data?.data ?? 0))
      .catch(() => {})
  }, [])

  const loadNotifications = useCallback((f) => {
    setLoading(true)
    const params = {}
    if (f === 'Unread') params.unreadOnly = true
    if (FILTER_CATEGORY[f]) params.category = FILTER_CATEGORY[f]
    studentApi.getNotifications(params)
      .then(res => setNotifs(res.data?.data || []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadNotifications(filter)
    loadUnreadCount()
  }, [loadNotifications, loadUnreadCount])

  const markRead = async (id) => {
    try {
      await studentApi.markRead(id)
      loadNotifications(filter)
      loadUnreadCount()
    } catch {}
  }

  const markAll = async () => {
    try {
      await studentApi.markAllRead()
      toast.success('All notifications marked as read')
      loadNotifications(filter)
      loadUnreadCount()
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const grouped = groupByDate(notifs)

  return (
    <div className="page-wrapper">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="chip bg-brand-600 text-white text-sm px-2.5 py-1">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Check size={15} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); loadNotifications(f) }}
            className={`chip cursor-pointer text-xs px-3 py-1.5 transition-all ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-purple-100 dark:border-purple-800 hover:bg-brand-50 dark:hover:bg-brand-900/20'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} lines={2} />)}</div>
      ) : notifs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 mb-1">You're all caught up!</h3>
          <p className="text-gray-400 text-sm">No notifications in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, notifs]) => {
            if (!notifs.length) return null
            return (
              <div key={group}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{group}</p>
                <div className="space-y-1">
                  {notifs.map(n => {
                    const style = TYPE_STYLE[n.type] || TYPE_STYLE.INFO
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markRead(n.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl transition-all cursor-pointer ${
                          n.isRead ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-white dark:bg-gray-800/60 shadow-sm hover:shadow-md border border-purple-100 dark:border-purple-900/30'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${style.bg}`}>
                          {TYPE_ICON[n.type] || '🔔'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={`text-sm flex-1 ${n.isRead ? 'text-gray-500 font-normal' : 'text-gray-800 dark:text-gray-100 font-semibold'}`}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-brand-600 mt-1.5 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
