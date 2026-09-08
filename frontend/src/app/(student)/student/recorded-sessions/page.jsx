'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { PlayCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import recordedSessionService from '@/services/recordedSessionService'
import { resolveFileUrl } from '@/lib/api'

// hls.js is a heavy dependency pulled in by the player - load it only when a
// video is actually opened, and only on the client (SSR doesn't need it).
const SecureVideoPlayer = dynamic(
  () => import('@/components/student/SecureVideoPlayer'),
  { ssr: false, loading: () => <div className="w-full aspect-video rounded-xl bg-gray-900 animate-pulse" /> }
)

const STATUS_LABELS = {
  SCHEDULED: 'Coming Soon',
  LIVE: 'Available',
  EXPIRED: 'No Longer Available',
}

export default function StudentRecordedSessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingSession, setPlayingSession] = useState(null)

  useEffect(() => {
    recordedSessionService.listMySessions()
      .then(r => setSessions(r.data || []))
      .catch(() => toast.error('Failed to load recorded sessions'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-wrapper space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Recorded Sessions</h1>
        <p className="text-sm text-gray-500">Watch class recordings for the courses you're enrolled in</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-purple-50 dark:bg-purple-900/20 animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-gray-400">No recorded sessions available yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(s => (
            <div key={s.id} className="glass-card overflow-hidden flex flex-col">
              <div className="h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {s.thumbnailUrl ? (
                  <img src={resolveFileUrl(s.thumbnailUrl)} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  <PlayCircle className="text-gray-300" size={40} />
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="font-semibold text-gray-800 dark:text-white text-sm line-clamp-2">{s.title}</p>
                <p className="text-xs text-gray-500">{s.courseName} {s.instructorName ? `· ${s.instructorName}` : ''}</p>
                <p className="text-xs text-gray-400">{s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : ''}</p>

                {s.watchedPercentage > 0 && (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-purple-600" style={{ width: `${s.watchedPercentage}%` }} />
                  </div>
                )}

                <div className="mt-auto pt-2">
                  {s.effectiveStatus === 'LIVE' ? (
                    <button onClick={() => setPlayingSession(s)}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">
                      <PlayCircle size={14} /> {s.watchedPercentage > 0 ? 'Continue Watching' : 'Watch Now'}
                    </button>
                  ) : (
                    <span className="block text-center text-xs font-semibold text-gray-400 py-2">
                      {STATUS_LABELS[s.effectiveStatus] || s.effectiveStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {playingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPlayingSession(null)}>
          <div className="w-full max-w-4xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">{playingSession.title}</h3>
              <button onClick={() => setPlayingSession(null)} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <SecureVideoPlayer recordedSessionId={playingSession.id} />
          </div>
        </div>
      )}
    </div>
  )
}
