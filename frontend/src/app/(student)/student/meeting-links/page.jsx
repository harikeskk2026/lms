'use client'
import { useState, useEffect } from 'react'
import {
  Video, ExternalLink, Copy, Calendar, Shield, PlayCircle, CheckCircle, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'

export default function StudentMeetingLinksPage() {
  const [meetings, setMeetings] = useState([])
  const [liveMeetings, setLiveMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  const extractList = (r) => {
    if (Array.isArray(r)) return r
    if (Array.isArray(r?.data)) return r.data
    if (Array.isArray(r?.data?.data)) return r.data.data
    return []
  }

  const loadMeetings = async () => {
    setLoading(true)
    try {
      const [allRes, liveRes] = await Promise.allSettled([
        studentApi.getMeetings(),
        studentApi.getLiveMeetings(),
      ])
      if (allRes.status === 'fulfilled') {
        setMeetings(extractList(allRes.value?.data) || extractList(allRes.value) || [])
      }
      if (liveRes.status === 'fulfilled') {
        setLiveMeetings(extractList(liveRes.value?.data) || extractList(liveRes.value) || [])
      }
    } catch {
      toast.error('Failed to load meeting links')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMeetings()
    const interval = setInterval(() => {
      Promise.allSettled([
        studentApi.getMeetings(),
        studentApi.getLiveMeetings(),
      ]).then(([allRes, liveRes]) => {
        if (allRes.status === 'fulfilled') {
          setMeetings(extractList(allRes.value?.data) || extractList(allRes.value) || [])
        }
        if (liveRes.status === 'fulfilled') {
          setLiveMeetings(extractList(liveRes.value?.data) || extractList(liveRes.value) || [])
        }
      }).catch(() => {})
    }, 15000)
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

  const upcomingMeetings = meetings.filter(m => m.status === 'SCHEDULED')
  const pastMeetings = meetings.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED')

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
            Join your scheduled batch sessions, live lectures, and Zoom meetings.
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
      {liveMeetings.length > 0 && (
        <div className="glass-card p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-violet-900 text-white rounded-2xl shadow-xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Class in Session · Live Now</span>
                <h2 className="text-xl font-extrabold text-white">{liveMeetings[0].title}</h2>
              </div>
            </div>
            <a
              href={liveMeetings[0].meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordJoin(liveMeetings[0].id)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-extrabold px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <PlayCircle size={18} /> Join Live Meeting Now
            </a>
          </div>

          {liveMeetings[0].description && (
            <p className="text-xs text-purple-200/90 max-w-3xl">{liveMeetings[0].description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-purple-200 pt-2 border-t border-white/10">
            {liveMeetings[0].hostName && <span>Host: {liveMeetings[0].hostName}</span>}
            <span>Platform: {liveMeetings[0].platform || 'ZOOM'}</span>
            {liveMeetings[0].passcode && (
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-yellow-300">
                Passcode: {liveMeetings[0].passcode}
              </span>
            )}
          </div>
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {m.platform || 'ZOOM'}
                    </span>
                  </div>

                  {m.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{m.description}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-purple-500" />
                      <span>{m.scheduledStart ? format(new Date(m.scheduledStart), 'dd MMM yyyy, hh:mm a') : 'TBD'}</span>
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

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <a
                    href={m.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordJoin(m.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past / Completed Meetings */}
      {pastMeetings.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Past Meetings ({pastMeetings.length})
          </h2>
          <div className="glass-card divide-y divide-gray-100 dark:divide-gray-800">
            {pastMeetings.map(m => (
              <div key={m.id} className="p-4 flex items-center justify-between gap-4 flex-wrap opacity-75">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{m.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.scheduledStart ? format(new Date(m.scheduledStart), 'dd MMM yyyy, hh:mm a') : ''}
                  </p>
                </div>
                <a
                  href={m.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Link
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
