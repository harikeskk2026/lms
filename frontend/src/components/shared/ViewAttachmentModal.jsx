'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X, ZoomIn, ZoomOut, FileText, ImageIcon, Loader2, AlertCircle, ShieldAlert, Lock, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import tokenStorage from '@/utilities/tokenStorage'
import { resolveFileUrl } from '@/lib/api'

/**
 * Returns the file viewer type based on filename and url extensions.
 */
function getFileType(name, url) {
  const combined = `${name || ''} ${url || ''}`.toLowerCase()
  if (/\.pdf($|\?)/i.test(combined)) return 'pdf'
  if (/\.docx?($|\?)/i.test(combined)) return 'docx'
  if (/\.(png|jpe?g|webp|gif|svg|bmp|ico)($|\?)/i.test(combined)) return 'image'
  if (/\.(xlsx?|pptx?)($|\?)/i.test(combined)) return 'office'
  return 'pdf' // default: attempt PDF/binary render
}

/**
 * Watermark overlay disabled per user preference to keep document content unobstructed and easy to read.
 */
function SecurityWatermark() {
  return null
}

/**
 * Helper to extract readable structured text from document buffer (.doc binary / XML fallback).
 */
function extractTextFromDocumentBuffer(buffer) {
  try {
    const bytes = new Uint8Array(buffer)
    const paragraphs = []

    // 1. Check for XML / zipped tags (e.g., inside docx XML)
    const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const xmlMatches = utf8Text.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)
    if (xmlMatches && xmlMatches.length > 0) {
      let currentP = ''
      for (const m of xmlMatches) {
        const clean = m.replace(/<[^>]+>/g, '').trim()
        if (clean) {
          currentP += (currentP ? ' ' : '') + clean
          if (currentP.length > 120 || /[.!?]$/.test(clean)) {
            paragraphs.push(currentP)
            currentP = ''
          }
        }
      }
      if (currentP) paragraphs.push(currentP)
      if (paragraphs.length > 0) return paragraphs
    }

    // 2. Try UTF-16LE strings (standard in Microsoft Word .doc binary files)
    const utf16Text = new TextDecoder('utf-16le', { fatal: false }).decode(bytes)
    const u16Clean = utf16Text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    const u16Lines = u16Clean.split(/[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 3 && /[a-zA-Z0-9]/.test(s) && !/^[\W_]+$/.test(s))

    if (u16Lines.length > 0) {
      return u16Lines.slice(0, 100)
    }

    // 3. Fallback: UTF-8 lines
    const u8Clean = utf8Text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    const u8Lines = u8Clean.split(/[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 3 && /[a-zA-Z0-9]/.test(s) && !/^[\W_]+$/.test(s))

    if (u8Lines.length > 0) {
      return u8Lines.slice(0, 100)
    }

    return []
  } catch {
    return []
  }
}

/**
 * Native in-browser Word Document (.docx / .doc) viewer.
 * Renders modern DOCX files directly on client DOM without external cloud dependencies.
 * If docx-preview fails or for legacy binary .doc files, extracts structured text into a styled reader.
 * Download options are completely removed for content security.
 */
function DocxViewer({ url, name, zoomLevel = 1.0 }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fallbackParagraphs, setFallbackParagraphs] = useState([])

  useEffect(() => {
    if (!url) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setFallbackParagraphs([])

    ;(async () => {
      try {
        const token = tokenStorage.getToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(url, { headers, cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file`)
        const buffer = await res.arrayBuffer()
        if (cancelled) return

        if (!buffer || buffer.byteLength === 0) {
          throw new Error('Document file is empty')
        }

        let rendered = false
        try {
          const { renderAsync } = await import('docx-preview')
          if (containerRef.current) {
            containerRef.current.innerHTML = ''
            await renderAsync(buffer, containerRef.current, null, {
              className: 'docx-preview-wrapper',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              ignoreFonts: false,
              breakPages: true,
              useBase64URL: true,
            })
            rendered = true
          }
        } catch (renderErr) {
          console.warn('docx-preview could not render directly, falling back to text extractor:', renderErr)
        }

        if (cancelled) return

        if (!rendered) {
          const extracted = extractTextFromDocumentBuffer(buffer)
          if (extracted && extracted.length > 0) {
            setFallbackParagraphs(extracted)
          } else {
            setError('This document format cannot be previewed in the browser.')
          }
        }
      } catch (err) {
        console.error('DocxViewer rendering error:', err)
        if (!cancelled) setError(err.message || 'Failed to render document preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Loader2 size={32} className="animate-spin text-purple-400" />
        <p className="text-sm font-medium">Rendering Word document preview…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center px-4 my-auto max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
          <FileText size={32} />
        </div>
        <p className="text-sm font-semibold text-gray-200">{error}</p>
        <p className="text-xs text-gray-400">Document preview is not available for this file.</p>
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-2 sm:p-6 overflow-x-auto select-none my-2"
      style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top center',
        transition: 'transform 0.15s ease-out',
      }}
    >
      <div
        ref={containerRef}
        className="docx-viewer-content w-full max-w-4xl bg-white text-gray-900 rounded-lg shadow-2xl p-6 sm:p-12 overflow-x-auto select-none empty:hidden"
      />

      {fallbackParagraphs.length > 0 && (
        <div className="w-full max-w-4xl bg-white text-gray-900 rounded-xl shadow-2xl p-8 sm:p-12 my-2 space-y-4 font-sans leading-relaxed border border-gray-100 select-none">
          <div className="border-b border-gray-200 pb-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">{name || 'Document Content'}</h2>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
              Microsoft Word Document Preview
            </span>
          </div>
          <div className="space-y-3">
            {fallbackParagraphs.map((para, idx) => (
              <p key={idx} className="text-sm text-gray-800 leading-relaxed break-words">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Native in-platform PDF canvas viewer powered by PDF.js.
 * Eliminates browser PDF toolbars, removes download/print options,
 * renders all pages sequentially onto HTML5 canvas elements,
 * and restricts canvas pixel extraction.
 */
function PdfCanvasViewer({ url, zoomLevel, onNumPagesChange, containerRef }) {
  const canvasRefs = useRef([])
  const renderTasksRef = useRef([])
  const pdfRef = useRef(null)
  const nativeWidthRef = useRef(null)

  const [numPages, setNumPages] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Measure scroll container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateWidth = () => {
      const w = el.clientWidth
      if (w) setContainerWidth(w)
    }
    updateWidth()
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w) setContainerWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  // Load PDF document directly from URL using PDF.js
  useEffect(() => {
    if (!url) return
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

        const token = tokenStorage.getToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        let loadingTask
        try {
          const res = await fetch(url, { headers })
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer()
            loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
          } else {
            loadingTask = pdfjsLib.getDocument(url)
          }
        } catch {
          loadingTask = pdfjsLib.getDocument(url)
        }

        const pdf = await loadingTask.promise
        if (cancelled) return

        pdfRef.current = pdf
        const firstPage = await pdf.getPage(1)
        nativeWidthRef.current = firstPage.getViewport({ scale: 1 }).width

        setNumPages(pdf.numPages)
        onNumPagesChange?.(pdf.numPages)
      } catch (err) {
        console.error('PDF.js loading error:', err)
        if (!cancelled) setError('Failed to load PDF document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      pdfRef.current?.destroy?.()
    }
  }, [url, onNumPagesChange])

  // Calculate rendering scale
  const baseScale = containerWidth && nativeWidthRef.current
    ? Math.min((containerWidth - 64) / nativeWidthRef.current, 1.6)
    : 1.2
  const effectiveScale = Math.max(0.2, baseScale * zoomLevel)

  // Render pages when ready or when zoom/container changes
  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || numPages === 0 || !containerWidth) return
    let cancelled = false

    // Cancel prior pending render tasks
    renderTasksRef.current.forEach(t => t?.cancel?.())
    renderTasksRef.current = []

    // High-DPI support: render at device pixel ratio (capped at 2.5x)
    const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5)

    ;(async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) return
        const canvas = canvasRefs.current[pageNum - 1]
        if (!canvas) continue

        try {
          const page = await pdf.getPage(pageNum)
          const cssViewport = page.getViewport({ scale: effectiveScale })
          const renderViewport = page.getViewport({ scale: effectiveScale * outputScale })

          canvas.width = Math.ceil(renderViewport.width)
          canvas.height = Math.ceil(renderViewport.height)
          canvas.style.width = `${Math.ceil(cssViewport.width)}px`
          canvas.style.height = `${Math.ceil(cssViewport.height)}px`

          const ctx = canvas.getContext('2d')
          const renderTask = page.render({ canvasContext: ctx, viewport: renderViewport })
          renderTasksRef.current[pageNum - 1] = renderTask

          await renderTask.promise

          // Canvas pixel scraping deterrence
          try {
            canvas.toDataURL = () => 'data:image/png;base64,'
            canvas.toBlob = (cb) => cb?.(new Blob([]))
          } catch {}
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') {
            console.error(`Error rendering page ${pageNum}:`, e)
          }
        }
      }
    })()

    return () => {
      cancelled = true
      renderTasksRef.current.forEach(t => t?.cancel?.())
    }
  }, [numPages, containerWidth, effectiveScale])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Loader2 size={32} className="animate-spin text-purple-400" />
        <p className="text-sm font-medium">Rendering document preview…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center px-4 my-auto">
        <AlertCircle size={36} className="text-red-400 mb-1" />
        <p className="text-sm font-semibold text-gray-300">{error}</p>
        <p className="text-xs text-gray-500 mb-3">The file could not be parsed as a valid PDF.</p>
        <a
          href={url}
          download="document.pdf"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow transition-colors"
        >
          Download Document
        </a>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center gap-8 w-full select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {Array.from({ length: numPages }).map((_, i) => (
        <div key={i} className="flex flex-col items-center max-w-full">
          <canvas
            ref={el => (canvasRefs.current[i] = el)}
            className="shadow-2xl bg-white rounded-md max-w-full pointer-events-none select-none"
            onContextMenu={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
          />
          <span className="text-[11px] font-medium text-gray-400 mt-2 bg-gray-900/90 px-3 py-0.5 rounded-full border border-gray-800">
            Page {i + 1} of {numPages}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ViewAttachmentModal({ url, name, onClose }) {
  const [numPages, setNumPages] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [mounted, setMounted] = useState(false)
  const [isObscured, setIsObscured] = useState(false)
  const [obscureReason, setObscureReason] = useState('')
  const scrollContainerRef = useRef(null)

  const user = tokenStorage.getUser()

  // Resolve relative /uploads/ paths to same-origin URLs
  const fileUrl = url
    ? (url.startsWith('blob:') || /^https?:\/\//i.test(url) ? url : resolveFileUrl(url))
    : ''

  const fileType = getFileType(name, fileUrl)

  // Mount guard for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Escape key closes preview
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Body scroll lock while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // ── 0. Synchronous DOM Obscuration & Restoration Helpers ────────────────
  const obscureDom = useCallback((reason) => {
    setIsObscured(true)
    if (reason) setObscureReason(reason)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.filter = 'blur(100px)'
      scrollContainerRef.current.style.opacity = '0'
      scrollContainerRef.current.style.visibility = 'hidden'
      scrollContainerRef.current.style.pointerEvents = 'none'
    }
  }, [])

  const restoreDom = useCallback(() => {
    setIsObscured(false)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.filter = 'none'
      scrollContainerRef.current.style.opacity = '1'
      scrollContainerRef.current.style.visibility = 'visible'
      scrollContainerRef.current.style.pointerEvents = 'auto'
    }
  }, [])

  // Clipboard sanitization helper: overwrites system clipboard with a warning
  const wipeClipboard = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText('⚠️ Protected Content: Screenshots and screen recordings of assignment files are prohibited.')
      }
    } catch {
      // Ignore clipboard permission rejections silently
    }
  }, [])

  // ── 1. Focus / Window Blur / Visibility Anti-Screenshot Shield ───────────
  // Windows Snipping Tool (Win+Shift+S) and screen capture overlays immediately
  // take window focus away. By immediately obscuring the screen on blur or
  // inactive state, any capture attempts only capture the opaque security shield.
  useEffect(() => {
    const handleBlur = () => {
      obscureDom('Window inactive — content protected against background snips and screen capture.')
      wipeClipboard()
    }

    const handleFocus = () => {
      wipeClipboard()
      restoreDom()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        obscureDom('Tab is hidden — content protected.')
        wipeClipboard()
      } else if (document.hasFocus()) {
        wipeClipboard()
        restoreDom()
      }
    }

    // High-frequency 60ms continuous focus guard
    const focusInterval = setInterval(() => {
      if (!document.hasFocus() && !document.hidden) {
        obscureDom('Window lost focus — content protected.')
      }
    }, 60)

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(focusInterval)
    }
  }, [obscureDom, restoreDom, wipeClipboard])

  // ── 2. Keyboard Interception & Clipboard Wiping ──────────────────────────
  // Intercepts PrintScreen, Windows Snipping Tool (Win+Shift+S), Ctrl+P, Ctrl+S,
  // and DevTools combinations. Wipes system clipboard immediately on capture key.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key || ''
      const code = e.keyCode || e.which

      // PrintScreen key (any combination with Alt, Shift, Ctrl, Win)
      if (key === 'PrintScreen' || key === 'Snapshot' || code === 44) {
        e.preventDefault()
        e.stopPropagation()
        obscureDom('Screenshot key detected — screen capture is strictly restricted.')
        wipeClipboard()
        toast.error('Screenshots and screen recordings are restricted on assignment files.', { id: 'screenshot-blocked' })
        setTimeout(() => {
          if (document.hasFocus()) restoreDom()
        }, 2500)
        return
      }

      // Windows/Command + Shift + S (Snipping Tool shortcut) or Ctrl + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (key.toLowerCase() === 's' || code === 83)) {
        e.preventDefault()
        e.stopPropagation()
        obscureDom('Screen capture shortcut detected — content protected.')
        wipeClipboard()
        toast.error('Screen capture is restricted on assignment files.', { id: 'snip-blocked' })
        setTimeout(() => {
          if (document.hasFocus()) restoreDom()
        }, 2500)
        return
      }

      // Ctrl + P or Meta + P (Print / Save to PDF)
      if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 'p' || code === 80)) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Printing or exporting assignment files is prohibited.', { id: 'print-blocked' })
        return
      }

      // Ctrl + S or Meta + S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 's' || code === 83) && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Saving assignment files is prohibited.', { id: 'save-blocked' })
        return
      }

      // Ctrl + Shift + I/C/J or F12 or Ctrl + U (Inspect / View Source)
      if (
        code === 123 ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'c', 'j'].includes(key.toLowerCase())) ||
        ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'u')
      ) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Developer tools are disabled on secure document preview.', { id: 'devtools-blocked' })
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

  // ── 3. Screen Sharing & Screen Recording Override ────────────────────────
  // Overrides navigator.mediaDevices.getDisplayMedia and getUserMedia to disable
  // browser-initiated screen recording, tab capture, or window sharing.
  useEffect(() => {
    let originalGetDisplayMedia = null
    let originalGetUserMedia = null

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      if (navigator.mediaDevices.getDisplayMedia) {
        originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
        navigator.mediaDevices.getDisplayMedia = async () => {
          obscureDom('Screen sharing / recording blocked.')
          toast.error('Screen recording and screen sharing are disabled while viewing protected assignment files.', { id: 'stream-blocked' })
          throw new DOMException('Screen recording and screen sharing are prohibited for protected documents.', 'NotAllowedError')
        }
      }
      if (navigator.mediaDevices.getUserMedia) {
        originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          if (constraints?.video?.mediaSource || constraints?.video?.mandatory?.chromeMediaSource) {
            obscureDom('Screen capture blocked.')
            toast.error('Screen capture is disabled while viewing protected files.', { id: 'stream-blocked' })
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

  // ── 4. Print Protection CSS Injection ────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'anti-screenshot-print-rules'
    style.innerHTML = `
      @media print {
        html, body, #__next, .view-attachment-modal, canvas, img, iframe, header, main {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById('anti-screenshot-print-rules')
      if (el) el.remove()
    }
  }, [])

  const handleZoomIn = () => setZoomLevel(z => Math.min(2.5, +(z + 0.15).toFixed(2)))
  const handleZoomOut = () => setZoomLevel(z => Math.max(0.3, +(z - 0.15).toFixed(2)))
  const handleResetZoom = () => setZoomLevel(1.0)

  if (!mounted || typeof document === 'undefined') return null

  const modal = (
    <div
      className="view-attachment-modal fixed inset-0 z-[9999] w-screen h-screen bg-gray-950 flex flex-col overflow-hidden select-none animate-fadeIn"
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >
      {/* ── Top Header Toolbar ────────────────────────────────────────────── */}
      <header className="h-14 min-h-[56px] w-full px-4 sm:px-6 bg-gray-900 border-b border-gray-800 flex items-center justify-between gap-4 flex-shrink-0 z-20 shadow-md">
        
        {/* Left: Prominent Back Button & File Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700 active:scale-95 flex-shrink-0 cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-gray-800 flex-shrink-0" />

          <div className="flex items-center gap-2 min-w-0 truncate">
            {fileType === 'image' ? (
              <ImageIcon size={18} className="text-purple-400 flex-shrink-0" />
            ) : fileType === 'docx' || fileType === 'doc' ? (
              <FileText size={18} className="text-blue-400 flex-shrink-0" />
            ) : (
              <FileText size={18} className="text-purple-400 flex-shrink-0" />
            )}
            <span className="font-semibold text-sm text-gray-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={name || 'File Preview'}>
              {name || 'File Preview'}
            </span>

            {/* Document Format Badges */}
            {fileType === 'pdf' && (
              <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded-md hidden sm:inline-flex flex-shrink-0">
                PDF
              </span>
            )}
            {fileType === 'docx' && (
              <span className="text-[10px] font-semibold text-blue-300 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded-md hidden sm:inline-flex flex-shrink-0">
                DOCX
              </span>
            )}
            {fileType === 'doc' && (
              <span className="text-[10px] font-semibold text-sky-300 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded-md hidden sm:inline-flex flex-shrink-0">
                DOC
              </span>
            )}

            {numPages > 0 && fileType === 'pdf' && (
              <span className="text-[11px] font-medium text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-700/60 hidden sm:inline-flex flex-shrink-0">
                {numPages} {numPages === 1 ? 'page' : 'pages'}
              </span>
            )}

            {/* Protected Badge */}
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md hidden md:inline-flex flex-shrink-0">
              <Lock size={10} /> Protected View
            </span>
          </div>
        </div>

        {/* Right: Zoom Controls & Close Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {((fileType === 'pdf' && numPages > 0) || fileType === 'docx' || fileType === 'image') && (
            <div className="flex items-center gap-1 bg-gray-800/90 border border-gray-700/70 px-2 py-1 rounded-xl">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.3}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 transition-colors cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="text-xs font-semibold text-gray-300 w-12 text-center hover:text-purple-400 transition-colors cursor-pointer"
                title="Reset zoom to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 transition-colors cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Close Preview (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── Anti-Screenshot & Screen Recording Protection Shield ───────────── */}
      {isObscured && (
        <div
          onClick={() => {
            window.focus()
            setIsObscured(false)
          }}
          className="absolute inset-0 z-50 bg-gray-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer animate-fadeIn"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl shadow-red-500/10">
            <ShieldAlert size={36} className="animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Screen Capture Restricted</h3>
          <p className="text-sm text-gray-300 max-w-md mb-2 leading-relaxed">
            {obscureReason || 'Content is protected against unauthorized screenshots, snipping tools, and screen recordings.'}
          </p>
          <p className="text-xs text-gray-500 max-w-sm mb-6">
            Assignment materials are protected by CareerLabs Content Security Policy.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              window.focus()
              setIsObscured(false)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Lock size={14} />
            <span>Click to Resume Viewing</span>
          </button>
        </div>
      )}

      {/* ── Fullscreen Content Area ────────────────────────────────────────── */}
      <main
        ref={scrollContainerRef}
        style={{
          filter: isObscured ? 'blur(80px)' : 'none',
          opacity: isObscured ? 0 : 1,
          pointerEvents: isObscured ? 'none' : 'auto',
          transition: 'filter 0.12s ease, opacity 0.12s ease',
        }}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto bg-gray-950 flex flex-col items-center p-4 sm:p-8 relative scrollbar-thin select-none"
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      >
        {/* In-Platform PDF Canvas Viewer (No native toolbar, no download option) */}
        {fileType === 'pdf' && fileUrl && (
          <PdfCanvasViewer
            url={fileUrl}
            zoomLevel={zoomLevel}
            onNumPagesChange={setNumPages}
            containerRef={scrollContainerRef}
          />
        )}

        {/* Fullscreen Image Preview */}
        {fileType === 'image' && fileUrl && (
          <div className="flex-1 flex items-center justify-center w-full h-full p-4 my-auto">
            <img
              src={fileUrl}
              alt={name || 'Preview'}
              style={{
                transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="max-h-[calc(100vh-120px)] max-w-full object-contain rounded-lg shadow-2xl border border-gray-800 select-none pointer-events-none"
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
              draggable={false}
            />
          </div>
        )}

        {/* Word Document (.docx / .doc / office) preview via native client-side DocxViewer */}
        {(fileType === 'docx' || fileType === 'doc' || fileType === 'office') && fileUrl && (
          <DocxViewer
            url={fileUrl}
            name={name}
            zoomLevel={zoomLevel}
          />
        )}

        {/* No URL fallback */}
        {!fileUrl && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 my-auto">
            <AlertCircle size={44} className="text-red-400 mb-1" />
            <p className="font-semibold text-gray-200">No file URL provided</p>
          </div>
        )}
      </main>
    </div>
  )

  return createPortal(modal, document.body)
}
