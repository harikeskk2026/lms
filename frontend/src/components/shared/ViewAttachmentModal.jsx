'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X, ZoomIn, ZoomOut, FileText, ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { resolveFileUrl } from '@/lib/api'

/**
 * Returns the file viewer type based on the filename extension.
 */
function getFileType(name) {
  const lower = (name || '').toLowerCase()
  if (/\.pdf$/i.test(lower)) return 'pdf'
  if (/\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(lower)) return 'image'
  if (/\.(docx?|xlsx?|pptx?)$/i.test(lower)) return 'office'
  return 'pdf' // default: attempt PDF/binary render
}

/**
 * Native in-platform PDF canvas viewer powered by PDF.js.
 * Eliminates browser PDF toolbars, removes download/print options,
 * and renders all pages sequentially onto HTML5 canvas elements.
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

  // Load PDF document directly from URL using PDF.js (no binary pre-fetch needed)
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

        // Pass URL directly — pdfjs handles the fetch internally
        const loadingTask = pdfjsLib.getDocument(url)
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

    // High-DPI support: render at device pixel ratio (capped at 2.5x) for sharp text
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
        <AlertCircle size={36} className="text-red-400 mb-1" />
        <p className="text-sm font-semibold text-gray-300">{error}</p>
        <p className="text-xs text-gray-500">The file could not be parsed as a valid PDF.</p>
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
            className="shadow-2xl bg-white rounded-md max-w-full"
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
  const scrollContainerRef = useRef(null)

  // Resolve relative /uploads/ paths to same-origin URLs
  const fileUrl = url
    ? (url.startsWith('blob:') || /^https?:\/\//i.test(url) ? url : resolveFileUrl(url))
    : ''

  const fileType = getFileType(name || fileUrl)

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

  const handleZoomIn = () => setZoomLevel(z => Math.min(2.5, +(z + 0.15).toFixed(2)))
  const handleZoomOut = () => setZoomLevel(z => Math.max(0.3, +(z - 0.15).toFixed(2)))
  const handleResetZoom = () => setZoomLevel(1.0)

  // Google Docs Viewer needs a publicly accessible absolute URL.
  // For localhost, we construct the full URL from window.location.origin.
  const officeAbsoluteUrl = fileUrl
    ? (fileUrl.startsWith('/') ? `${typeof window !== 'undefined' ? window.location.origin : ''}${fileUrl}` : fileUrl)
    : ''
  const officeViewerSrc = fileType === 'office' && officeAbsoluteUrl
    ? `https://docs.google.com/gview?url=${encodeURIComponent(officeAbsoluteUrl)}&embedded=true`
    : null

  if (!mounted || typeof document === 'undefined') return null

  const modal = (
    <div
      className="fixed inset-0 z-[9999] w-screen h-screen bg-gray-950 flex flex-col overflow-hidden select-none animate-fadeIn"
      onContextMenu={e => e.preventDefault()}
    >
      {/* ── Top Header Toolbar ────────────────────────────────────────────── */}
      <header className="h-14 min-h-[56px] w-full px-4 sm:px-6 bg-gray-900 border-b border-gray-800 flex items-center justify-between gap-4 flex-shrink-0 z-20 shadow-md">
        
        {/* Left: Prominent Back Button & File Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700 active:scale-95 flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-gray-800 flex-shrink-0" />

          <div className="flex items-center gap-2 min-w-0 truncate">
            {fileType === 'image' ? (
              <ImageIcon size={18} className="text-purple-400 flex-shrink-0" />
            ) : (
              <FileText size={18} className="text-purple-400 flex-shrink-0" />
            )}
            <span className="font-semibold text-sm text-gray-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={name || 'File Preview'}>
              {name || 'File Preview'}
            </span>

            {numPages > 0 && (
              <span className="text-[11px] font-medium text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-700/60 hidden sm:inline-flex flex-shrink-0">
                {numPages} {numPages === 1 ? 'page' : 'pages'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Zoom Controls & Close Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {fileType === 'pdf' && numPages > 0 && (
            <div className="flex items-center gap-1 bg-gray-800/90 border border-gray-700/70 px-2 py-1 rounded-xl">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.3}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="text-xs font-semibold text-gray-300 w-12 text-center hover:text-purple-400 transition-colors"
                title="Reset zoom to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Close Preview (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── Fullscreen Content Area ────────────────────────────────────────── */}
      <main
        ref={scrollContainerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto bg-gray-950 flex flex-col items-center p-4 sm:p-8 relative scrollbar-thin"
        onContextMenu={e => e.preventDefault()}
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
              className="max-h-[calc(100vh-120px)] max-w-full object-contain rounded-lg shadow-2xl border border-gray-800 select-none pointer-events-none"
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
              draggable={false}
            />
          </div>
        )}

        {/* Office documents preview via Google Docs Viewer */}
        {fileType === 'office' && officeViewerSrc && (
          <iframe
            key={officeViewerSrc}
            src={officeViewerSrc}
            title={name || 'File Preview'}
            className="w-full h-full border-0 rounded-lg shadow-2xl"
            sandbox="allow-scripts allow-same-origin allow-forms"
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
