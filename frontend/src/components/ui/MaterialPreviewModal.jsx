'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, ShieldAlert, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import tokenStorage from '@/utilities/tokenStorage'
import { resolveFileUrl } from '@/lib/api'

function SecurityWatermark({ user }) {
  const userName = user?.name || user?.email || 'Authorized User'
  const userEmail = user?.email || ''
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const watermarkText = `${userName} ${userEmail ? `• ${userEmail} ` : ''}• CONFIDENTIAL • ${dateStr} ${timeStr} • DO NOT RECORD`

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none flex flex-wrap items-center justify-around gap-x-20 gap-y-16 p-6"
      aria-hidden="true"
    >
      {Array.from({ length: 48 }).map((_, i) => (
        <span
          key={i}
          className="transform -rotate-25 text-xs font-mono font-bold tracking-wider text-neutral-900/15 dark:text-neutral-100/20 uppercase whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)] dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
        >
          {watermarkText}
        </span>
      ))}
    </div>
  )
}

export function PdfCanvasViewer({ url, zoomMultiplier = 0.5 }) {
  const scrollRef = useRef(null)
  const canvasRefs = useRef([])
  const renderTasksRef = useRef([])
  const pdfRef = useRef(null)
  const nativeWidthRef = useRef(null)

  const [numPages, setNumPages] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNumPages(0)
    pdfRef.current = null
    nativeWidthRef.current = null

    ;(async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return
        const firstPage = await pdf.getPage(1)
        nativeWidthRef.current = firstPage.getViewport({ scale: 1 }).width
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('Failed to load document preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [url])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const baseScale = containerWidth && nativeWidthRef.current
    ? (containerWidth - 32) / nativeWidthRef.current
    : 1
  const effectiveScale = Math.max(0.2, baseScale * (zoomMultiplier / 0.5))

  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || numPages === 0 || !containerWidth) return
    let cancelled = false

    renderTasksRef.current.forEach(t => t?.cancel?.())
    renderTasksRef.current = []

    const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5)

    ;(async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) return
        const canvas = canvasRefs.current[pageNum - 1]
        if (!canvas) continue

        const page = await pdf.getPage(pageNum)
        const cssViewport = page.getViewport({ scale: effectiveScale })
        const renderViewport = page.getViewport({ scale: effectiveScale * outputScale })

        canvas.width = Math.ceil(renderViewport.width)
        canvas.height = Math.ceil(renderViewport.height)
        canvas.style.width = `${Math.ceil(cssViewport.width)}px`
        canvas.style.height = `${Math.ceil(cssViewport.height)}px`

        const ctx = canvas.getContext('2d')
        const task = page.render({ canvasContext: ctx, viewport: renderViewport })
        renderTasksRef.current[pageNum - 1] = task
        try {
          await task.promise
          try {
            canvas.toDataURL = () => 'data:image/png;base64,'
            canvas.toBlob = (cb) => cb?.(new Blob([]))
          } catch {}
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') console.error(e)
        }
      }
    })()

    return () => { cancelled = true }
  }, [numPages, containerWidth, effectiveScale])

  useEffect(() => () => pdfRef.current?.destroy?.(), [])

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-500">{error}</div>
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 w-full overflow-y-auto p-4 flex flex-col items-center gap-4 bg-gray-100 dark:bg-gray-950 select-none"
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20 text-xs text-gray-400">
          Rendering preview…
        </div>
      )}
      {Array.from({ length: numPages }).map((_, i) => (
        <canvas
          key={i}
          ref={el => (canvasRefs.current[i] = el)}
          className="shadow-md bg-white rounded-md max-w-full pointer-events-none select-none"
          onContextMenu={e => e.preventDefault()}
          onDragStart={e => e.preventDefault()}
        />
      ))}
    </div>
  )
}

export default function MaterialPreviewModal({ material, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [zoomMultiplier, setZoomMultiplier] = useState(0.5)
  const [isObscured, setIsObscured] = useState(false)
  const contentContainerRef = useRef(null)

  const user = tokenStorage.getUser()

  useEffect(() => { setMounted(true) }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Synchronous DOM obscuration helpers
  const obscureDom = useCallback(() => {
    setIsObscured(true)
    if (contentContainerRef.current) {
      contentContainerRef.current.style.filter = 'blur(100px)'
      contentContainerRef.current.style.opacity = '0'
      contentContainerRef.current.style.visibility = 'hidden'
      contentContainerRef.current.style.pointerEvents = 'none'
    }
  }, [])

  const restoreDom = useCallback(() => {
    setIsObscured(false)
    if (contentContainerRef.current) {
      contentContainerRef.current.style.filter = 'none'
      contentContainerRef.current.style.opacity = '1'
      contentContainerRef.current.style.visibility = 'visible'
      contentContainerRef.current.style.pointerEvents = 'auto'
    }
  }, [])

  const wipeClipboard = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText('⚠️ Protected Content: Screenshots and recordings of course materials are prohibited.')
      }
    } catch {}
  }, [])

  // Anti-Screenshot: Window blur & focus monitor
  useEffect(() => {
    const handleBlur = () => {
      obscureDom()
      wipeClipboard()
    }
    const handleFocus = () => {
      wipeClipboard()
      restoreDom()
    }
    const handleVisibility = () => {
      if (document.hidden) {
        obscureDom()
        wipeClipboard()
      } else if (document.hasFocus()) {
        wipeClipboard()
        restoreDom()
      }
    }

    const interval = setInterval(() => {
      if (!document.hasFocus() && !document.hidden) obscureDom()
    }, 60)

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [obscureDom, restoreDom, wipeClipboard])

  // Keyboard capture interception & clipboard wiper
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key || ''
      const code = e.keyCode || e.which

      if (key === 'PrintScreen' || key === 'Snapshot' || code === 44) {
        e.preventDefault()
        e.stopPropagation()
        obscureDom()
        wipeClipboard()
        toast.error('Screenshots are prohibited on protected course materials.', { id: 'mat-shot-block' })
        setTimeout(() => { if (document.hasFocus()) restoreDom() }, 2500)
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (key.toLowerCase() === 's' || code === 83)) {
        e.preventDefault()
        e.stopPropagation()
        obscureDom()
        wipeClipboard()
        toast.error('Screen capture is restricted on course materials.', { id: 'mat-snip-block' })
        setTimeout(() => { if (document.hasFocus()) restoreDom() }, 2500)
        return
      }

      if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 'p' || code === 80)) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Printing course materials is prohibited.', { id: 'mat-print-block' })
        return
      }

      if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 's' || code === 83) && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Saving course materials is prohibited.', { id: 'mat-save-block' })
        return
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key || ''
      const code = e.keyCode || e.which
      if (key === 'PrintScreen' || key === 'Snapshot' || code === 44) {
        e.preventDefault()
        e.stopPropagation()
        wipeClipboard()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [obscureDom, restoreDom, wipeClipboard])

  // Screen sharing & recording override
  useEffect(() => {
    let originalGetDisplayMedia = null
    let originalGetUserMedia = null

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      if (navigator.mediaDevices.getDisplayMedia) {
        originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
        navigator.mediaDevices.getDisplayMedia = async () => {
          obscureDom()
          toast.error('Screen sharing and recording are disabled while viewing protected course materials.', { id: 'mat-stream-block' })
          throw new DOMException('Screen recording is prohibited for protected materials.', 'NotAllowedError')
        }
      }
      if (navigator.mediaDevices.getUserMedia) {
        originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          if (constraints?.video?.mediaSource || constraints?.video?.mandatory?.chromeMediaSource) {
            obscureDom()
            toast.error('Screen capture is disabled while viewing protected materials.', { id: 'mat-stream-block' })
            throw new DOMException('Screen capture is prohibited.', 'NotAllowedError')
          }
          return originalGetUserMedia(constraints)
        }
      }
    }
    return () => {
      if (originalGetDisplayMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia
      }
      if (originalGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia
      }
    }
  }, [obscureDom])

  // Print protection rules
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'mat-anti-print-rules'
    style.innerHTML = `
      @media print {
        html, body, #__next, .material-preview-modal, canvas, img, video, iframe, header, main {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById('mat-anti-print-rules')
      if (el) el.remove()
    }
  }, [])

  if (!material || !mounted) return null

  const fileUrl = resolveFileUrl(material.url)
  const isPdf = material.type === 'PDF' || /\.pdf($|\?)/i.test(material.url || '')
  const isVideo = material.type === 'VIDEO' || /\.(mp4|mov|webm|mkv)($|\?)/i.test(material.url || '')
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(material.url || '')

  return createPortal(
    <div
      className="material-preview-modal fixed inset-0 z-[100] bg-gray-950/90 backdrop-blur-sm w-screen h-screen flex flex-col overflow-hidden animate-fadeIn select-none"
      onClick={onClose}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >
      {/* Dynamic Security Watermark */}
      <SecurityWatermark user={user} />

      <div
        className="w-full h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xl flex-shrink-0">
              {isPdf ? '📄' : isVideo ? '🎬' : material.type === 'PRESENTATION' ? '🖥️' : material.type === 'LINK' ? '🔗' : '📁'}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-sm sm:text-base text-gray-900 dark:text-white break-words">
                {material.title}
              </h3>
              {material.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{material.description}</p>
              )}
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase flex-shrink-0">
              {material.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-md flex-shrink-0">
              <Lock size={10} /> Protected View
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isPdf && (
              <div className="flex items-center gap-1 mr-2 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoomMultiplier(z => Math.max(0.2, +(z - 0.1).toFixed(2)))}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMultiplier(0.5)}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-12 text-center hover:text-purple-600"
                  title="Reset to 50%"
                >
                  {Math.round(zoomMultiplier * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMultiplier(z => Math.min(3, +(z + 0.1).toFixed(2)))}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
              title="Close View"
            >
              <X size={16} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Anti-Screenshot Shield Overlay */}
        {isObscured && (
          <div
            onClick={() => {
              window.focus()
              restoreDom()
            }}
            className="absolute inset-0 z-50 bg-gray-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer animate-fadeIn"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl shadow-red-500/10">
              <ShieldAlert size={36} className="animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Screen Capture Restricted</h3>
            <p className="text-sm text-gray-300 max-w-md mb-2 leading-relaxed">
              Content is protected against unauthorized screenshots, snipping tools, and screen recordings.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                window.focus()
                restoreDom()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer mt-4"
            >
              <Lock size={14} />
              <span>Click to Resume Viewing</span>
            </button>
          </div>
        )}

        {/* Content Preview Container */}
        <div
          ref={contentContainerRef}
          style={{
            filter: isObscured ? 'blur(80px)' : 'none',
            opacity: isObscured ? 0 : 1,
            pointerEvents: isObscured ? 'none' : 'auto',
            transition: 'filter 0.12s ease, opacity 0.12s ease',
          }}
          className="flex-1 min-h-0 w-full bg-gray-100 dark:bg-gray-950 flex items-center justify-center relative overflow-hidden select-none"
          onContextMenu={e => e.preventDefault()}
          onDragStart={e => e.preventDefault()}
        >
          {isPdf ? (
            <PdfCanvasViewer url={fileUrl} zoomMultiplier={zoomMultiplier} />
          ) : isVideo ? (
            <video
              controls
              autoPlay
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onContextMenu={e => e.preventDefault()}
              src={fileUrl}
              className="max-w-full max-h-full rounded-lg shadow-lg pointer-events-auto"
            />
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={material.title}
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
              className="max-w-full max-h-full object-contain p-4 select-none pointer-events-none"
            />
          ) : material.type === 'LINK' ? (
            <div className="text-center p-8 max-w-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto text-2xl">
                🔗
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{material.title}</p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 break-all select-all font-mono">
                {material.url}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 max-w-md space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto text-2xl">
                📄
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{material.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Secure in-app preview is rendered directly without external downloads.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
