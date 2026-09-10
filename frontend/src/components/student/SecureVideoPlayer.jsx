'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { AlertTriangle, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import recordedSessionService from '@/services/recordedSessionService'
import tokenStorage from '@/utilities/tokenStorage'
import { resolveFileUrl } from '@/lib/api'

const DEVICE_ID_KEY = 'clms_device_id'
const HEARTBEAT_INTERVAL_MS = 15000
const WATERMARK_REPOSITION_MS = 10000
const WATERMARK_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']

function getDeviceId() {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/**
 * Real protections: private storage + AES-128 HLS segment encryption + a
 * short-lived signed playback token re-validated on every request, backend
 * enrollment/schedule/concurrency checks, and a watermark that makes a leaked
 * recording attributable to the account that watched it.
 *
 * NOT claimed: this cannot block OS-level screen recording or a second device
 * pointed at the screen — no web player can. The tab-blur pause below is a
 * weak, honestly-labeled deterrent, not real security.
 */
export default function SecureVideoPlayer({ recordedSessionId }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const playbackSessionIdRef = useRef(null)
  const heartbeatTimerRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [paused, setPaused] = useState(false)
  const [watermarkPos, setWatermarkPos] = useState('top-left')

  const user = tokenStorage.getUser()
  const deviceId = getDeviceId()

  const teardownHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }

  const startHeartbeat = useCallback(() => {
    clearInterval(heartbeatTimerRef.current)
    heartbeatTimerRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video || !playbackSessionIdRef.current || video.paused) return
      recordedSessionService.heartbeat(playbackSessionIdRef.current, Math.floor(video.currentTime)).catch(() => {})
    }, HEARTBEAT_INTERVAL_MS)
  }, [])

  const load = useCallback((forceTakeover = false) => {
    setLoading(true)
    setError(null)
    setConflict(false)

    recordedSessionService.startPlayback(recordedSessionId, deviceId, forceTakeover)
      .then(res => {
        const { playbackToken, manifestUrl, resumePositionSeconds, playbackSessionId } = res.data
        playbackSessionIdRef.current = playbackSessionId
        const absoluteManifestUrl = resolveFileUrl(manifestUrl)
        const video = videoRef.current
        if (!video) return

        teardownHls()
        if (Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 30 })
          hlsRef.current = hls
          hls.loadSource(absoluteManifestUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.currentTime = resumePositionSeconds || 0
            setLoading(false)
          })
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            console.error('HLS Event Error details JSON:', JSON.stringify({
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              networkDetails: data.networkDetails ? {
                status: data.networkDetails.status,
                statusText: data.networkDetails.statusText,
                url: data.networkDetails.url
              } : null,
              response: data.response ? {
                code: data.response.code,
                text: data.response.text
              } : null
            }))
            if (data.fatal) {
              setError('Playback error — please reload the page.')
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = absoluteManifestUrl
          video.addEventListener('loadedmetadata', () => {
            video.currentTime = resumePositionSeconds || 0
            setLoading(false)
          }, { once: true })
        } else {
          setError('Your browser does not support secure video playback.')
        }

        startHeartbeat()
        void playbackToken // token is embedded in manifestUrl/segment URLs by the backend
      })
      .catch(err => {
        setLoading(false)
        if (err.status === 409) {
          setConflict(true)
        } else {
          setError(err.message || 'Unable to start playback')
        }
      })
  }, [recordedSessionId, deviceId, startHeartbeat])

  useEffect(() => {
    load(false)
    return () => {
      clearInterval(heartbeatTimerRef.current)
      teardownHls()
      if (playbackSessionIdRef.current) {
        recordedSessionService.endPlayback(playbackSessionIdRef.current).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedSessionId])

  // Weak deterrent only — no browser can block OS-level screen recording.
  // `visibilitychange` alone misses tools like Windows' Win+Shift+S snip
  // overlay: the tab stays visible on screen (document.hidden never flips),
  // it only steals input focus — so `window blur/focus` is also needed to
  // react to that case. Even with both, this is a best-effort race: it blacks
  // out the video while the overlay/selection is up, it does not prevent the
  // capture itself.
  useEffect(() => {
    const reportEvent = (eventType) => {
      if (!playbackSessionIdRef.current) return
      const position = videoRef.current ? Math.floor(videoRef.current.currentTime) : null
      recordedSessionService.reportClientEvent(playbackSessionIdRef.current, eventType, position).catch(() => {})
    }
    const pauseAndHide = (eventType) => {
      setTabHidden(true)
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause()
      }
      reportEvent(eventType)
    }
    const onVisibility = () => {
      if (document.hidden) pauseAndHide('TAB_HIDDEN')
      else setTabHidden(false)
    }
    const onBlur = () => pauseAndHide('WINDOW_BLURRED')
    const onFocus = () => setTabHidden(false)
    const onFullscreenChange = () => {
      reportEvent(document.fullscreenElement ? 'FULLSCREEN_ENTERED' : 'FULLSCREEN_EXITED')
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setWatermarkPos(prev => {
        const options = WATERMARK_POSITIONS.filter(p => p !== prev)
        return options[Math.floor(Math.random() * options.length)]
      })
    }, WATERMARK_REPOSITION_MS)
    return () => clearInterval(timer)
  }, [])

  // Best-effort, Windows-only, after-the-fact reaction to the PrintScreen key.
  // The OS has already captured the frame by the time this fires — there is no
  // browser API that can block a screenshot. Snipping Tool, macOS, mobile, and
  // any external camera never reach this handler at all. This exists purely as
  // a deterrent (black out + pause) and an audit trail, not a real block.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'PrintScreen') return
      const video = videoRef.current
      const position = video ? Math.floor(video.currentTime) : null
      if (video && !video.paused) video.pause()
      setCaptureFlash(true)
      toast.error('Screenshot detected — this session has been logged.')
      if (playbackSessionIdRef.current) {
        recordedSessionService.reportCaptureAttempt(playbackSessionIdRef.current, position).catch(() => {})
      }
      setTimeout(() => setCaptureFlash(false), 4000)
    }
    window.addEventListener('keyup', onKeyDown)
    return () => window.removeEventListener('keyup', onKeyDown)
  }, [])

  const watermarkPositionClasses = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-14 left-3',
    'bottom-right': 'bottom-14 right-3',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }

  if (conflict) {
    return (
      <div className="glass-card p-5 sm:p-8 text-center space-y-4">
        <AlertTriangle className="mx-auto text-yellow-500" size={32} />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          This account is already playing a recorded session on another device.
        </p>
        <button onClick={() => load(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold">
          Play Here Instead
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-5 sm:p-8 text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none" onContextMenu={e => e.preventDefault()}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        className={`w-full h-full transition-[filter] duration-300 ${paused ? 'blur-md' : ''}`}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        draggable={false}
        onDragStart={e => e.preventDefault()}
        onPause={() => { clearInterval(heartbeatTimerRef.current); setPaused(true) }}
        onPlay={() => { startHeartbeat(); setPaused(false) }}
      />

      {/* Dynamic watermark — makes a leaked recording attributable, does not block capture */}
      <div className={`absolute pointer-events-none text-[10px] sm:text-xs text-white/70 bg-black/30 rounded px-2 py-1 transition-all duration-700 ${watermarkPositionClasses[watermarkPos]}`}>
        <div>{user?.name || 'Student'}</div>
        <div>{user?.email || ''}</div>
      </div>

      {tabHidden && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center text-white/80 text-xs flex flex-col items-center gap-2">
            <EyeOff size={20} />
            Playback paused — this tab is not in focus
          </div>
        </div>
      )}

      {captureFlash && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
          <div className="text-center text-white/90 text-xs flex flex-col items-center gap-2 px-6">
            <AlertTriangle size={20} className="text-yellow-400" />
            Screenshot attempt detected and logged to this account.
          </div>
        </div>
      )}
    </div>
  )
}
