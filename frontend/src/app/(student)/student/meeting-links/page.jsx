'use client'
import { useState, useEffect } from 'react'
import {
  Video, ExternalLink, Copy, Calendar, Shield, PlayCircle, CheckCircle, RefreshCw, BookOpen, Users, Clock, Lock
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'

// Platform badge helper: returns null to omit showing platform badges completely
const getPlatformBadge = () => null

// Get the current local date-time as an ISO string "YYYY-MM-DDTHH:MM:SS"
const getLocalISONow = () => {
  const now = new Date()
  const yr = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const dy = String(now.getDate()).padStart(2, '0')
  const hr = String(now.getHours()).padStart(2, '0')
  const mn = String(now.getMinutes()).padStart(2, '0')
  const sc = String(now.getSeconds()).padStart(2, '0')
  return `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}`
}

const toISOStr = (val) => {
  if (!val) return null
  if (Array.isArray(val)) {
    const [yr, mo, dy, hr = 0, mn = 0, sc = 0] = val
    const pad = (n) => String(n).padStart(2, '0')
    return `${yr}-${pad(mo)}-${pad(dy)}T${pad(hr)}:${pad(mn)}:${pad(sc)}`
  }
  const s = String(val).replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '').replace(' ', 'T')
  return s.slice(0, 19)
}

const getDisplayStatus = (m) => {
  if (m.status === 'CANCELLED') return 'CANCELLED'

  const startISO = toISOStr(m.scheduledStart)
  if (!startISO) {
    return m.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING'
  }

  const endISO = toISOStr(m.scheduledEnd)
  const nowISO = getLocalISONow()

  const todayDate = nowISO.slice(0, 10)
  const currentTime = nowISO.slice(11, 19)

  const startDate = startISO.slice(0, 10)
  const startTime = (startISO.slice(11, 19) || '00:00:00').padEnd(8, ':00')

  const endDate = endISO ? endISO.slice(0, 10) : startDate
  let endTime = endISO ? (endISO.slice(11, 19) || '23:59:59').padEnd(8, ':00') : null

  if (!endTime) {
    const [sh = '10', sm = '00', ss = '00'] = startTime.split(':')
    const endH = String((parseInt(sh, 10) + 1) % 24).padStart(2, '0')
    endTime = `${endH}:${sm}:${ss}`
  }

  if (todayDate < startDate) {
    return 'UPCOMING'
  }
  if (todayDate > endDate) {
    return 'COMPLETED'
  }

  // Today is within [startDate, endDate]
  if (currentTime < startTime) {
    return 'UPCOMING'
  }
  if (currentTime >= startTime && currentTime <= endTime) {
    return 'ONGOING'
  }
  return 'COMPLETED'
}

export default function StudentMeetingLinksPage() {
  const [activeLiveMeetings, setActiveLiveMeetings] = useState([])
  const [upcomingMeetings, setUpcomingMeetings] = useState([])
  const [pastMeetings, setPastMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 3000)
    return () => clearInterval(clock)
  }, [])

  const extractList = (r) => {
    if (Array.isArray(r)) return r
    if (Array.isArray(r?.data)) return r.data
    if (Array.isArray(r?.data?.data)) return r.data.data
    return []
  }

  const extract = (r) => extractList(r?.data) || extractList(r) || []

  const loadMeetings = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [ongoingRes, upcomingRes, pastRes] = await Promise.all([
        studentApi.getMeetings({ status: 'ONGOING' }),
        studentApi.getMeetings({ status: 'UPCOMING' }),
        studentApi.getMeetings({ status: 'PAST' }),
      ])
      setActiveLiveMeetings(extract(ongoingRes))
      setUpcomingMeetings(extract(upcomingRes))
      setPastMeetings(extract(pastRes))
    } catch {
      toast.error('Failed to load meeting links')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadMeetings()
    const interval = setInterval(() => loadMeetings({ silent: true }), 15000)
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
    toast.success('Meeting link copied to clipboard!')
  }

  // Fire-and-forget: lets the admin see who joined, without blocking the Zoom redirect.
  const recordJoin = (id) => {
    studentApi.joinMeeting(id).catch(() => {})
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Video className="text-purple-600 dark:text-purple-400" size={26} />
            Live Meetings & Classes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Join your scheduled batch sessions, live lectures, and interactive classes.
          </p>
        </div>
        <button
          onClick={loadMeetings}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Live Now Top Banner */}
      {activeLiveMeetings.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border border-purple-500/30 shadow-2xl p-6 sm:p-8 text-white space-y-6">
          {/* Ambient Glows */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {activeLiveMeetings.map((lm, idx) => (
            <div key={lm.id} className={`${idx > 0 ? 'pt-6 border-t border-white/10' : ''} relative z-10 space-y-4`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-3 max-w-2xl">
                  {/* Live Status Pill & Metadata Badges */}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      Class in Session · Live Now
                    </span>

                    {(() => {
                      const badge = getPlatformBadge(lm.meetUrl, lm.platform)
                      if (!badge) return null
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-400/15 border border-purple-400/30 text-purple-200 text-xs font-bold">
                          <Video size={13} /> {badge.name}
                        </span>
                      )
                    })()}

                    {lm.courseTitle && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
                        <BookOpen size={13} /> {lm.courseTitle}
                      </span>
                    )}

                    {lm.batchName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-400/15 border border-blue-400/30 text-blue-200 text-xs font-semibold">
                        <Users size={13} /> {lm.batchName}
                      </span>
                    )}
                  </div>

                  {/* Class Title */}
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                      {lm.title}
                    </h2>
                    {lm.description && (
                      <p className="text-sm text-purple-200/80 mt-1 line-clamp-2 leading-relaxed">
                        {lm.description}
                      </p>
                    )}
                  </div>

                  {/* Detailed Meta: Host, Time, Passcode */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-purple-200/90 pt-1">
                    {lm.hostName && (
                      <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                        <Shield size={13} className="text-indigo-400" /> Host: <strong className="text-white font-semibold">{lm.hostName}</strong>
                      </span>
                    )}
                    {lm.scheduledStart && (
                      <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                        <Calendar size={13} className="text-purple-400" /> Started: <strong className="text-white font-semibold">{format(new Date(lm.scheduledStart), 'hh:mm a')}</strong>
                        {lm.scheduledEnd ? (
                          <> · Ends: <strong className="text-white font-semibold">{format(new Date(lm.scheduledEnd), 'hh:mm a')}</strong></>
                        ) : ''}
                      </span>
                    )}
                    {lm.passcode && (
                      <span className="inline-flex items-center gap-1.5 bg-amber-400/15 px-2.5 py-1 rounded-lg border border-amber-400/30 text-amber-200 font-mono">
                        Passcode: <strong className="text-amber-300 font-bold">{lm.passcode}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Action Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={lm.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordJoin(lm.id)}
                    className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-extrabold px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-950/50 hover:shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <PlayCircle size={20} className="animate-pulse" /> Join Live Meeting Now
                  </a>
                  <button
                    onClick={() => copyToClipboard(lm.meetUrl)}
                    title="Copy Meeting Link"
                    className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 transition-colors active:scale-95"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Meetings Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar size={18} className="text-purple-600" />
          Upcoming & Scheduled Meetings ({upcomingMeetings.length})
        </h2>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 glass-card animate-pulse" />
            ))}
          </div>
        ) : upcomingMeetings.length === 0 ? (
          <div className="glass-card p-10 text-center text-gray-400">
            <Video size={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="font-semibold text-gray-600 dark:text-gray-300">No upcoming meetings scheduled</p>
            <p className="text-xs text-gray-400 mt-1">Check back later or check your attendance schedule.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingMeetings.map(m => (
              <div key={m.id} className="glass-card p-5 flex flex-col justify-between gap-4 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-base text-gray-900 dark:text-white leading-tight">
                      {m.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(() => {
                        const badge = getPlatformBadge(m.meetUrl, m.platform)
                        if (!badge) return null
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
                            {badge.name}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Course & Batch Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {m.courseTitle && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                        <BookOpen size={11} /> {m.courseTitle}
                      </span>
                    )}
                    {m.batchName && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                        <Users size={11} /> {m.batchName}
                      </span>
                    )}
                    {m.scheduledStart && new Date(m.scheduledStart).getTime() > now.getTime() && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        <Clock size={10} /> Upcoming
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{m.description}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-purple-500" />
                      <span>
                        {(() => {
                          const startISO = toISOStr(m.scheduledStart)
                          const endISO = toISOStr(m.scheduledEnd)
                          if (!startISO) return 'TBD'
                          const sp = startISO.split(/[T:-]/).map(Number)
                          const startDateObj = new Date(sp[0], sp[1]-1, sp[2], sp[3]||0, sp[4]||0, sp[5]||0)
                          const startFormatted = format(startDateObj, 'dd MMM yyyy, hh:mm a')
                          if (!endISO) return startFormatted

                          const ep = endISO.split(/[T:-]/).map(Number)
                          const endDateObj = new Date(ep[0], ep[1]-1, ep[2], ep[3]||0, ep[4]||0, ep[5]||0)

                          const startDateStr = startISO.slice(0, 10)
                          const endDateStr = endISO.slice(0, 10)
                          if (startDateStr !== endDateStr) {
                            return `${format(startDateObj, 'dd MMM yyyy')} – ${format(endDateObj, 'dd MMM yyyy')} · ${format(startDateObj, 'hh:mm a')} – ${format(endDateObj, 'hh:mm a')}`
                          }
                          return `${startFormatted} – ${format(endDateObj, 'hh:mm a')}`
                        })()}
                      </span>
                    </div>
                    {m.hostName && (
                      <div className="flex items-center gap-1.5">
                        <Shield size={13} className="text-indigo-500" />
                        <span>Host: {m.hostName}</span>
                      </div>
                    )}
                    {m.passcode && (
                      <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                        Passcode: {m.passcode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: only allow join once scheduled start time arrives or if meeting is ONGOING */}
                {(() => {
                  const isJoinable = getDisplayStatus(m) === 'ONGOING'
                  return (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      {isJoinable ? (
                        <>
                          <a
                            href={m.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordJoin(m.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                          >
                            <ExternalLink size={14} /> Join Meeting
                          </a>
                          <button
                            onClick={() => copyToClipboard(m.meetUrl)}
                            title="Copy Link"
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 text-xs font-semibold border border-gray-200 dark:border-gray-700 cursor-not-allowed select-none"
                          >
                            <Clock size={13} /> Starts at {format(new Date(m.scheduledStart), 'hh:mm a')}
                          </button>
                          <button
                            onClick={() => toast(`Class link will be available at ${format(new Date(m.scheduledStart), 'hh:mm a')}`, { icon: '⏰' })}
                            title="Link available at scheduled time"
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
                          >
                            <Lock size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past / Completed Meetings */}
      {pastMeetings.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle size={18} className="text-gray-400" />
              Past Meetings ({pastMeetings.length})
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pastMeetings.map(m => (
              <div
                key={m.id}
                className="glass-card p-5 flex flex-col justify-between gap-4 border border-gray-100 dark:border-gray-800/80 bg-white/60 dark:bg-gray-900/40 hover:shadow-md transition-all opacity-90 hover:opacity-100"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-base text-gray-800 dark:text-gray-200 leading-tight">
                      {m.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'CANCELLED'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {m.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED'}
                    </span>
                  </div>

                  {/* Course, Batch & Platform Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {(() => {
                      const badge = getPlatformBadge(m.meetUrl, m.platform)
                      if (!badge) return null
                      if (badge.name === 'Zoom') return null
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.className}`}>
                          {badge.name}
                        </span>
                      )
                    })()}
                    {m.courseTitle && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        <BookOpen size={11} /> {m.courseTitle}
                      </span>
                    )}
                    {m.batchName && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                        <Users size={11} /> {m.batchName}
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{m.description}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      <span>
                        {(() => {
                          const startISO = toISOStr(m.scheduledStart)
                          const endISO = toISOStr(m.scheduledEnd)
                          if (!startISO) return 'Date not specified'
                          const sp = startISO.split(/[T:-]/).map(Number)
                          const startDateObj = new Date(sp[0], sp[1]-1, sp[2], sp[3]||0, sp[4]||0, sp[5]||0)
                          const startFormatted = format(startDateObj, 'dd MMM yyyy, hh:mm a')
                          if (!endISO) return startFormatted

                          const ep = endISO.split(/[T:-]/).map(Number)
                          const endDateObj = new Date(ep[0], ep[1]-1, ep[2], ep[3]||0, ep[4]||0, ep[5]||0)

                          const startDateStr = startISO.slice(0, 10)
                          const endDateStr = endISO.slice(0, 10)
                          if (startDateStr !== endDateStr) {
                            return `${format(startDateObj, 'dd MMM yyyy')} – ${format(endDateObj, 'dd MMM yyyy')} · ${format(startDateObj, 'hh:mm a')} – ${format(endDateObj, 'hh:mm a')}`
                          }
                          return `${startFormatted} – ${format(endDateObj, 'hh:mm a')}`
                        })()}
                      </span>
                    </div>
                    {m.hostName && (
                      <div className="flex items-center gap-1.5">
                        <Shield size={13} className="text-gray-400" />
                        <span>Host: {m.hostName}</span>
                      </div>
                    )}
                    {m.passcode && (
                      <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                        Passcode: {m.passcode}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                  {m.meetUrl && (
                    <>
                      <a
                        href={m.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
                      >
                        <ExternalLink size={13} /> Meeting Link
                      </a>
                      <button
                        onClick={() => copyToClipboard(m.meetUrl)}
                        title="Copy Link"
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                      >
                        <Copy size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
