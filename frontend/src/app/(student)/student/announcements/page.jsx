'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Pin, Megaphone, Search, CalendarDays, ChevronLeft, ChevronRight, X as XIcon, Paperclip, RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow, addMonths, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import { studentApi, resolveFileUrl } from '@/lib/api'
import CustomSelect from '@/components/ui/CustomSelect'
import ViewAttachmentModal from '@/components/shared/ViewAttachmentModal'
import Pagination from '@/components/ui/Pagination'
import useDebouncedValue from '@/hooks/useDebouncedValue'

const FILTERS = ['All', 'Unread', 'URGENT', 'PLACEMENT', 'EXAM', 'HOLIDAY', 'ATTENDANCE']

const CATEGORY_STYLES = {
  GENERAL:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  URGENT:     'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
  PLACEMENT:  'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
  EXAM:       'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40',
  HOLIDAY:    'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40',
  ATTENDANCE: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40',
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
  const debouncedSearch = useDebouncedValue(search, 400)
  const [sortBy, setSortBy] = useState('newest')
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [pagination, setPagination] = useState({ totalElements: 0, totalPages: 1 })
  const [counts, setCounts] = useState(() => Object.fromEntries(FILTERS.map(k => [k, 0])))
  const [countTick, setCountTick] = useState(0)
  const [calendarAnnouncements, setCalendarAnnouncements] = useState(null)

  const effectiveLimit = pageSize === 'all' ? 1000 : Number(pageSize)

  const load = useCallback(() => {
    setLoading(true)
    const params = {
      search: debouncedSearch.trim() || undefined,
      category: filter !== 'All' && filter !== 'Unread' ? filter : undefined,
      unread: filter === 'Unread' ? true : undefined,
      sort: sortBy === 'oldest' ? 'oldest' : undefined,
      page,
      limit: effectiveLimit,
    }
    studentApi.getAnnouncements(params)
      .then(r => {
        const d = r.data.data || { items: [], totalElements: 0, totalPages: 1, page: 1 }
        setAnnouncements(d.items || [])
        setPagination({ totalElements: d.totalElements, totalPages: d.totalPages })
        if (d.page && d.page !== page) setPage(d.page)
      })
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false))
  }, [debouncedSearch, filter, sortBy, page, effectiveLimit])

  useEffect(() => { load() }, [load])

  // Tab count badges come from lightweight server queries (limit 1 → totalElements),
  // never by filtering a fully-loaded list in the browser.
  useEffect(() => {
    const queries = [
      { key: 'All', params: { limit: 1 } },
      { key: 'Unread', params: { unread: true, limit: 1 } },
      ...FILTERS.filter(k => k !== 'All' && k !== 'Unread').map(key => ({ key, params: { category: key, limit: 1 } })),
    ]
    Promise.all(queries.map(q =>
      studentApi.getAnnouncements(q.params)
        .then(r => ({ key: q.key, total: r.data.data?.totalElements || 0 }))
        .catch(() => ({ key: q.key, total: 0 }))
    ))
      .then(results => {
        const map = {}
        results.forEach(r => { map[r.key] = r.total })
        setCounts(map)
      })
  }, [countTick])

  const bumpCounts = () => setCountTick(t => t + 1)

  // Calendar dots need the full dataset (server-side, capped at the 1000 limit) —
  // fetched lazily the first time the calendar view is opened.
  useEffect(() => {
    if (view !== 'calendar' || calendarAnnouncements !== null) return
    studentApi.getAnnouncements({ limit: 1000 })
      .then(r => setCalendarAnnouncements(r.data.data?.items || []))
      .catch(() => {})
  }, [view, calendarAnnouncements])

  const tabs = FILTERS.map(key => ({
    key,
    label: key === 'Unread' ? 'Unread' : key.charAt(0) + key.slice(1).toLowerCase(),
    count: counts[key] || 0,
    color: key === 'All' ? 'border-purple-600 text-purple-600 dark:text-purple-400'
      : key === 'Unread' ? 'border-purple-600 text-purple-600 dark:text-purple-400'
        : key === 'URGENT' ? 'border-red-600 text-red-600 dark:text-red-400'
          : key === 'PLACEMENT' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
            : key === 'EXAM' ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : key === 'HOLIDAY' ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-indigo-600 text-indigo-600 dark:text-indigo-400',
  }))

  const serialNoFor = (idx) => (pageSize === 'all' ? 0 : (page - 1) * effectiveLimit) + idx + 1

  const handleOpenDetail = (a) => {
    setViewingAnnouncement(a)
    if (!a.viewed) {
      studentApi.markAnnouncementViewed(a.id)
        .then(bumpCounts)
        .catch(() => {})
      setAnnouncements(list => list.map(item => item.id === a.id ? { ...item, viewed: true } : item))
    }
  }

  const acknowledge = async (id) => {
    try {
      await studentApi.acknowledgeAnnouncement(id)
      setAnnouncements(list => list.map(a => a.id === id ? { ...a, acknowledged: true } : a))
      setViewingAnnouncement(current => current && current.id === id ? { ...current, acknowledged: true } : current)
      toast.success('Acknowledged')
    } catch (err) { toast.error(err.response?.data?.message || err?.message || 'Failed to acknowledge') }
  }

  return (
    <div className="page-wrapper max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Announcements</h1>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh announcements"
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-purple-600' : 'text-purple-600 dark:text-purple-400'} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
          >
            <CalendarDays size={14} className="text-purple-600 dark:text-purple-400" />
            <span>{view === 'list' ? 'Calendar View' : 'List View'}</span>
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <StudentCalendarView announcements={calendarAnnouncements ?? announcements} onViewDetail={handleOpenDetail} />
      ) : (
        <>
          {/* Clean Navigation Tabs matching Admin Style */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setFilter(t.key); setPage(1); }}
                className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5 ${
                  filter === t.key
                    ? `${t.color}`
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    filter === t.key
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search and Sort Row */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center">
            <div className="relative flex-1 w-full min-w-0">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by title or message content..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-gray-200 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap hidden sm:inline">Sort:</span>
              <CustomSelect
                value={sortBy}
                onChange={(val) => { setSortBy(val); setPage(1); }}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                ]}
                compact
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-28 glass-card animate-pulse rounded-2xl" />)
            ) : announcements.length === 0 ? (
              <div className="glass-card p-10 sm:p-14 text-center rounded-2xl">
                <Megaphone size={36} className="text-purple-300 dark:text-purple-600 mx-auto mb-3 opacity-60" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No announcements match this view.</p>
              </div>
            ) : (
              announcements.map((a, idx) => (
                <AnnouncementCard
                  key={a.id}
                  a={a}
                  serialNo={serialNoFor(idx)}
                  onAcknowledge={acknowledge}
                  onViewDetail={handleOpenDetail}
                  onPreviewAttachment={setPreviewAttachment}
                />
              ))
            )}
          </div>

          <Pagination
            total={pagination.totalElements}
            totalPages={pagination.totalPages}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
            pageSizeOptions={[5, 10, 20, 50]}
            showAllOption
            label="announcements"
          />
        </>
      )}

      {viewingAnnouncement && (
        <StudentViewModal
          a={viewingAnnouncement}
          onClose={() => setViewingAnnouncement(null)}
          onAcknowledge={acknowledge}
          onPreviewAttachment={setPreviewAttachment}
        />
      )}

      {previewAttachment && (
        <ViewAttachmentModal
          url={previewAttachment.url}
          name={previewAttachment.name}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  )
}

function AnnouncementCard({ a, serialNo, onAcknowledge, onViewDetail, onPreviewAttachment }) {
  const route = a.actionType === 'CUSTOM' ? a.actionUrl : ACTION_ROUTES[a.actionType]

  return (
    <div
      onClick={() => onViewDetail(a)}
      className={`glass-card p-5 rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-200 group border ${
        a.isPinned
          ? 'border-purple-300 dark:border-purple-700/80 bg-purple-50/15 dark:bg-purple-950/10'
          : !a.viewed
          ? 'border-purple-200 dark:border-purple-800/60 bg-white/80 dark:bg-gray-900/80'
          : 'border-gray-100 dark:border-gray-800/80 hover:border-gray-200 dark:hover:border-gray-700'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Metadata Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
            {serialNo !== undefined && (
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md font-mono flex-shrink-0">
                #{serialNo}
              </span>
            )}
            {a.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                <Pin size={10} className="fill-purple-600 text-purple-600" /> Pinned
              </span>
            )}
            {!a.viewed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> New
              </span>
            )}
            {a.category && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
                {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
              </span>
            )}
            {a.requiresAcknowledgment && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${a.acknowledged ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'}`}>
                {a.acknowledged ? '✓ Acknowledged' : 'Ack Required'}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-gray-900 dark:text-white text-base sm:text-lg mb-1.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {a.title}
          </h3>

          {/* Message Body */}
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
            {a.body}
          </p>

          {/* Attachment Link */}
          {a.attachmentUrl && (
            <div className="mt-2.5" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onPreviewAttachment?.({ url: resolveFileUrl(a.attachmentUrl), name: a.attachmentName || 'Attachment' })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-850 rounded-lg px-2.5 py-1 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
              >
                <Paperclip size={13} />
                <span>{a.attachmentName || 'View Attachment'}</span>
              </button>
            </div>
          )}

          {/* Timestamp and Expiry */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-1 text-xs text-gray-400">
            <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            {a.expiresAt && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Expires {format(new Date(a.expiresAt.includes('T') ? a.expiresAt : a.expiresAt + 'T00:00:00'), 'dd MMM yyyy, HH:mm')}
              </span>
            )}
          </div>
        </div>

        {/* Action cluster on right */}
        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2.5 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {route && a.actionLabel && (
              <Link
                href={route}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-sm shadow-purple-500/20 transition-all active:scale-95"
              >
                {a.actionLabel}
              </Link>
            )}

            {a.requiresAcknowledgment && (
              a.acknowledged ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  ✓ Done
                </span>
              ) : (
                <button
                  onClick={() => onAcknowledge(a.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                >
                  Acknowledge
                </button>
              )
            )}
          </div>

          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 mt-1">
            View details →
          </span>
        </div>
      </div>
    </div>
  )
}

function StudentViewModal({ a, onClose, onAcknowledge, onPreviewAttachment }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !a) return null

  const route = a.actionType === 'CUSTOM' ? a.actionUrl : ACTION_ROUTES[a.actionType]

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
              {a.isPinned && <Pin size={12} className="text-purple-500 flex-shrink-0" />}
              {a.category && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.GENERAL}`}>
                  {a.category.charAt(0) + a.category.slice(1).toLowerCase()}
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-gray-800 dark:text-white text-base sm:text-lg break-words">{a.title}</h3>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer">
            <XIcon size={16} />
          </button>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message</p>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{a.body}</p>
        </div>

        {a.attachmentUrl && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attachment</p>
            <button
              type="button"
              onClick={() => onPreviewAttachment?.({ url: resolveFileUrl(a.attachmentUrl), name: a.attachmentName || 'Attachment' })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
            >
              <Paperclip size={14} />
              <span>{a.attachmentName || 'View Attachment'}</span>
            </button>
          </div>
        )}

        {/* Action & Acknowledgment */}
        {Boolean((route && a.actionLabel) || a.requiresAcknowledgment) && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            {route && a.actionLabel && (
              <Link href={route} className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3.5 py-2 transition-colors">
                {a.actionLabel}
              </Link>
            )}
            {a.requiresAcknowledgment && (
              a.acknowledged ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 py-1">✓ Acknowledged</span>
              ) : (
                <button onClick={() => onAcknowledge(a.id)}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3.5 py-2 transition-colors shadow-sm">
                  I Understand / Acknowledge
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function StudentCalendarView({ announcements, onViewDetail }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())

  const calendarCardRef = useRef(null)
  const listRef = useRef(null)
  const [calendarHeight, setCalendarHeight] = useState(0)

  useEffect(() => {
    const el = calendarCardRef.current
    if (!el) return
    const updateHeight = () => {
      if (el) setCalendarHeight(el.offsetHeight)
    }
    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [selectedDay])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dayItems = {}
  announcements.forEach(a => {
    const mark = (dateStr, type) => {
      if (!dateStr) return
      const d = typeof dateStr === 'string' && dateStr.length === 10 && !dateStr.includes('T')
        ? new Date(dateStr + 'T00:00:00')
        : new Date(dateStr)
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
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
      <div ref={calendarCardRef} className="glass-card p-4 sm:p-6 flex-1 min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-3 gap-x-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="font-display font-bold text-gray-800 dark:text-white text-base sm:text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={15} className="text-gray-600 dark:text-gray-300" />
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
                <ChevronRight size={15} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
          <div className="flex gap-2.5 sm:gap-3 text-xs text-gray-500 font-medium flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Published</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Expiring</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 text-center text-[11px] sm:text-xs font-bold text-gray-400 mb-1.5 sm:mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
          {cells.map((d, i) => {
            const hasItems = d && dayItems[d] && dayItems[d].length > 0
            const isToday = d && new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year

            return (
              <button
                key={i}
                type="button"
                disabled={!d}
                onClick={() => setSelectedDay(d)}
                className={`min-h-[42px] sm:min-h-[48px] rounded-lg sm:rounded-xl border p-0.5 sm:p-1.5 text-left transition-all relative ${
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
                      <span className={`text-[11px] sm:text-xs font-bold ${
                        selectedDay === d
                          ? 'text-purple-600 dark:text-purple-400'
                          : isToday
                          ? 'w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] sm:text-[11px]'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {d}
                      </span>
                    </div>

                    <div className="flex gap-0.5 sm:gap-1 mt-0.5 sm:mt-1.5 flex-wrap">
                      {(dayItems[d] || []).slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full inline-block ${TYPE_DOT[item.type]}`}
                          title={`${item.type}: ${item.a.title}`}
                        />
                      ))}
                      {(dayItems[d] || []).length > 3 && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-gray-400">+{dayItems[d].length - 3}</span>
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
        <div
          style={calendarHeight ? { height: `${calendarHeight}px` } : undefined}
          className="glass-card p-5 w-full lg:w-80 flex-shrink-0 flex flex-col shadow-sm max-lg:max-h-[500px]"
        >
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
            <div ref={listRef} className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0 overscroll-contain">
              {selectedItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onViewDetail(item.a)}
                  className="border border-gray-200 dark:border-gray-700/80 rounded-xl p-3.5 hover:shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer bg-white/40 dark:bg-gray-800/40"
                >
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                      #{idx + 1}
                    </span>
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

