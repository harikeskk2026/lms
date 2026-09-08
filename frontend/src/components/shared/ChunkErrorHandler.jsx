'use client'
import { useEffect } from 'react'

/**
 * Handles Webpack chunk loading failures (ChunkLoadError) across Next.js.
 * When client navigates while the dev server has recompiled chunks or when
 * a chunk is temporarily missing, it catches the error and reloads the page
 * once to seamlessly synchronize with the latest build assets.
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    function handleChunkError(event) {
      const msg = event?.message || event?.reason?.message || ''
      if (
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Cannot find module') ||
        msg.includes('_next/undefined')
      ) {
        const key = 'last_chunk_reload'
        const last = sessionStorage.getItem(key)
        const now = Date.now()
        // Prevent infinite reload loops: allow max one reload per 10 seconds
        if (!last || now - parseInt(last, 10) > 10000) {
          sessionStorage.setItem(key, String(now))
          window.location.reload()
        }
      }
    }

    window.addEventListener('error', handleChunkError)
    window.addEventListener('unhandledrejection', handleChunkError)

    return () => {
      window.removeEventListener('error', handleChunkError)
      window.removeEventListener('unhandledrejection', handleChunkError)
    }
  }, [])

  return null
}
