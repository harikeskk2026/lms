'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X, ZoomIn, ZoomOut, FileText, ImageIcon, Loader2, AlertCircle, ShieldAlert, Lock } from 'lucide-react'
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
  if (/\.(txt|csv|log|json|xml|sql|md)($|\?)/i.test(combined)) return 'text'
  if (/\.(xlsx?|pptx?)($|\?)/i.test(combined)) return 'office'
  return 'pdf' // default: attempt PDF/binary render
}

/**
 * Helper to extract readable structured text from legacy binary documents (.doc fallback).
 * Only extracts plain readable ASCII/Latin text sequences; never decodes raw binary ZIP streams.
 */
function extractTextFromDocumentBuffer(buffer) {
  try {
    const bytes = new Uint8Array(buffer)
    if (!bytes || bytes.length === 0) return []

    // If it's a ZIP / DOCX file (magic bytes: PK\x03\x04), do not do raw binary string decoding
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      return []
    }

    // Legacy binary .doc / plain text fallback: extract readable sentences
    const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const matches = utf8Text.match(/[A-Za-z0-9][A-Za-z0-9\s,.:;!?'"()\-]{15,}/g)
    if (matches && matches.length > 0) {
      return matches
        .map(m => m.trim())
        .filter(m => m.length > 20 && m.split(/\s+/).length >= 3)
        .slice(0, 50)
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
        const isBlobOrData = url.startsWith('blob:') || url.startsWith('data:')
        const token = tokenStorage.getToken()
        const headers = !isBlobOrData && token ? { Authorization: `Bearer ${token}` } : {}
        const fetchOptions = isBlobOrData ? {} : { headers, cache: 'no-store' }

        const res = await fetch(url, fetchOptions)
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file`)
        const buffer = await res.arrayBuffer()
        if (cancelled) return

        if (!buffer || buffer.byteLength === 0) {
          throw new Error('Document file is empty')
        }

        let rendered = false
        try {
          const docxLib = await import('docx-preview')
          const renderAsync = docxLib.renderAsync || docxLib.default?.renderAsync || docxLib.default

          if (containerRef.current && typeof renderAsync === 'function') {
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
            setError('This document format could not be parsed for in-browser preview.')
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

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-2 sm:p-6 overflow-x-auto select-none my-2"
      style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top center',
        transition: 'transform 0.15s ease-out',
      }}
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
          <Loader2 size={32} className="animate-spin text-purple-400" />
          <p className="text-sm font-medium">Rendering Word document preview…</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4 my-auto max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
            <FileText size={32} />
          </div>
          <p className="text-sm font-semibold text-gray-200">{error}</p>
          <p className="text-xs text-gray-400">Document preview is not available for this file.</p>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ display: loading || error ? 'none' : 'block' }}
        className="docx-viewer-content w-full max-w-4xl bg-white text-gray-900 rounded-lg shadow-2xl p-4 sm:p-8 overflow-x-auto select-none"
      />

      {!loading && !error && fallbackParagraphs.length > 0 && (
        <div className="w-full max-w-4xl bg-white text-gray-900 rounded-xl shadow-2xl p-8 sm:p-12 my-2 space-y-4 font-sans leading-relaxed border border-gray-100 select-none">
          <div className="border-b border-gray-200 pb-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">{name || 'Document Content'}</h2>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
              Word Document Preview
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
 * Text file (.txt, .csv, .json, .log, .md) viewer.
 */
function TextViewer({ url, name, zoomLevel = 1.0 }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const isBlobOrData = url.startsWith('blob:') || url.startsWith('data:')
        const token = tokenStorage.getToken()
        const headers = !isBlobOrData && token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(url, isBlobOrData ? {} : { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (cancelled) return
        setContent(text)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load file content')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [url])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Loader2 size={32} className="animate-spin text-purple-400" />
        <p className="text-sm font-medium">Loading text preview…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
        <AlertCircle size={36} className="text-red-400 mb-1" />
        <p className="text-sm font-semibold text-gray-300">{error}</p>
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-4xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-xl shadow-2xl p-6 sm:p-8 font-mono text-xs sm:text-sm whitespace-pre-wrap break-words border border-gray-200 dark:border-gray-800 select-none overflow-x-auto my-2"
      style={{
        transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      {content}
    </div>
  )
}

/**
 * Native in-platform PDF canvas viewer powered by PDF.js.
 * Eliminates browser PDF toolbars, renders all pages sequentially onto HTML5 canvas elements.
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
    const el = containerRef?.current
    if (!el) return
    const updateWidth = () => {
      const w = el.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800)
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

  // Load PDF document directly from URL or ArrayBuffer using PDF.js
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

        const isBlobOrData = url.startsWith('blob:') || url.startsWith('data:')
        const token = tokenStorage.getToken()
        const headers = !isBlobOrData && token ? { Authorization: `Bearer ${token}` } : {}

        let loadingTask
        try {
          const res = await fetch(url, isBlobOrData ? {} : { headers })
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
        if (!cancelled) setError('Failed to load PDF document preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      pdfRef.current?.destroy?.()
    }
  }, [url, onNumPagesChange])

  // Render pages when ready or when zoom/container changes
  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || numPages === 0 || loading) return
    let cancelled = false

    // Cancel prior pending render tasks
    renderTasksRef.current.forEach(t => t?.cancel?.())
    renderTasksRef.current = []

    const outputScale = Math.min(Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5), 2.5)
    const effectiveWidth = containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 800)
    const baseScale = nativeWidthRef.current
      ? Math.min((effectiveWidth - 64) / nativeWidthRef.current, 1.6)
      : 1.2
    const effectiveScale = Math.max(0.2, baseScale * zoomLevel)

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
  }, [numPages, containerWidth, zoomLevel, loading])

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

  const obscureDom = useCallback((reason) => {
    setIsObscured(true)
    if (reason) setObscureReason(reason)
  }, [])

  const restoreDom = useCallback(() => {
    setIsObscured(false)
  }, [])

  // Screenshot hotkey guard
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key || ''
      const code = e.keyCode || e.which

      // PrintScreen key
      if (key === 'PrintScreen' || key === 'Snapshot' || code === 44) {
        e.preventDefault()
        e.stopPropagation()
        obscureDom('Screenshot key detected — screen capture is restricted on assignment files.')
        toast.error('Screenshots are restricted on assignment files.', { id: 'screenshot-blocked' })
        setTimeout(() => { restoreDom() }, 2500)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [obscureDom, restoreDom])

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
            ) : fileType === 'text' ? (
              <FileText size={18} className="text-emerald-400 flex-shrink-0" />
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
            {fileType === 'text' && (
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md hidden sm:inline-flex flex-shrink-0">
                TEXT
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
          {((fileType === 'pdf' && numPages > 0) || fileType === 'docx' || fileType === 'image' || fileType === 'text') && (
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

      {/* ── Anti-Screenshot Protection Overlay (only on PrintScreen key) ─── */}
      {isObscured && (
        <div
          onClick={restoreDom}
          className="absolute inset-0 z-50 bg-gray-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer animate-fadeIn"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl shadow-red-500/10">
            <ShieldAlert size={36} className="animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Screen Capture Restricted</h3>
          <p className="text-sm text-gray-300 max-w-md mb-2 leading-relaxed">
            {obscureReason || 'Content is protected against unauthorized screenshots and screen recordings.'}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              restoreDom()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer mt-4"
          >
            <Lock size={14} />
            <span>Click to Resume Viewing</span>
          </button>
        </div>
      )}

      {/* ── Fullscreen Content Area ────────────────────────────────────────── */}
      <main
        ref={scrollContainerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto bg-gray-950 flex flex-col items-center p-4 sm:p-8 relative scrollbar-thin select-none"
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      >
        {/* PDF Canvas Viewer */}
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

        {/* Word Document (.docx / .doc / office) preview */}
        {(fileType === 'docx' || fileType === 'doc' || fileType === 'office') && fileUrl && (
          <DocxViewer
            url={fileUrl}
            name={name}
            zoomLevel={zoomLevel}
          />
        )}

        {/* Text Document (.txt, .csv, etc.) preview */}
        {fileType === 'text' && fileUrl && (
          <TextViewer
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
