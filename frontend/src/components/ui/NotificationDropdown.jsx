'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICON = { INFO: '🔔', SUCCESS: '✅', WARNING: '⚠️', URGENT: '🚨' }
const TYPE_COLOR = {
  INFO:    'bg-violet-100 dark:bg-violet-900/30',
  SUCCESS: 'bg-green-100  dark:bg-green-900/30',
  WARNING: 'bg-yellow-100 dark:bg-yellow-900/30',
  URGENT:  'bg-orange-100 dark:bg-orange-900/30',
}

/**
 * NotificationDropdown — reusable bell with live dropdown panel.
 *
 * Props:
 *   fetchFn        — () => Promise  — fetches notifications
 *   markReadFn     — (id) => Promise
 *   markAllFn      — () => Promise
 *   viewAllHref    — optional string — "View all" link target
 *   pollInterval   — number (ms), default 30000
 */
export default function NotificationDropdown({
  fetchFn,
  markReadFn,
  markAllFn,
  viewAllHref,
  pollInterval = 30_000,
}) {
  const [open, setOpen]                = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]  = useState(0)
  const [loading, setLoading]          = useState(false)
  const ref                            = useRef(null)

  // ─── Parse API response (handles both old flat-array and new { notifications, unreadCount }) ──
  const parse = useCallback((raw) => {
    if (Array.isArray(raw)) {
      return { list: raw, count: raw.filter(n => !n.isRead).length }
    }
    return {
      list:  raw?.notifications ?? [],
      count: raw?.unreadCount   ?? 0,
    }
  }, [])

  // ─── Fetch (used both on open and for polling) ─────────────────────────────
  const load = useCallback((showLoader = false) => {
    if (showLoader) setLoading(true)
    return fetchFn()
      .then(r => {
        const { list, count } = parse(r.data.data)
        setNotifications(list)
        setUnreadCount(count)
      })
      .catch(() => {})
      .finally(() => showLoader && setLoading(false))
  }, [fetchFn, parse])

  // Initial load + polling for badge count
  useEffect(() => {
    load()
    const id = setInterval(load, pollInterval)
    return () => clearInterval(id)
  }, [load, pollInterval])

  // Reload full list when dropdown opens
  useEffect(() => {
    if (open) load(true)
  }, [open, load])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await markReadFn(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const handleMarkAll = async () => {
    try {
      await markAllFn()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div ref={ref} className="relative">

      {/* ── Bell button ─────────────────────────────────────────────────────── */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(p => !p)}
        className="relative w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-all duration-150"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-yellow-400 rounded-full text-[9px] font-bold text-purple-900 flex items-center justify-center px-1 leading-none animate-bounce-short shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────────────────── */}
      {open && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/30 z-50 overflow-hidden"
          style={{ background: 'var(--panel-bg, white)' }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 dark:border-purple-900/20 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-bold text-gray-800 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                  >
                    <Check size={11} /> All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[340px] overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 p-2">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-0.5">No notifications yet</p>
                </div>
              ) : (
                <div className="p-1.5">
                  {notifications.slice(0, 12).map(n => (
                    <button
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-150 group ${
                        n.isRead
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          : 'bg-purple-50/60 dark:bg-purple-900/15 hover:bg-purple-100/80 dark:hover:bg-purple-900/25 border border-purple-100/60 dark:border-purple-800/20'
                      }`}
                    >
                      {/* Icon */}
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${TYPE_COLOR[n.type] || TYPE_COLOR.INFO}`}>
                        {TYPE_ICON[n.type] || '🔔'}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug break-words ${
                          n.isRead ? 'text-gray-500 dark:text-gray-400 font-normal' : 'text-gray-800 dark:text-gray-100 font-semibold'
                        }`}>
                          {n.title?.replace(/^[\p{Emoji}\p{Extended_Pictographic}\u200d\ufe0f\s]+/u, '').trim() || n.title}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5 leading-tight">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {viewAllHref && (
              <div className="border-t border-purple-100 dark:border-purple-900/20">
                <Link
                  href={viewAllHref}
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-3 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
