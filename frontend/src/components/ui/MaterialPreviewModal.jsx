'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, Eye } from 'lucide-react'
import { resolveFileUrl } from '@/lib/api'

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
  const effectiveScale = Math.max(0.1, baseScale * zoomMultiplier)

  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || numPages === 0 || !containerWidth) return
    let cancelled = false

    renderTasksRef.current.forEach(t => t?.cancel?.())
    renderTasksRef.current = []

    const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)

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
      onContextMenu={e => e.preventDefault()}
      className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-auto bg-gray-950 flex flex-col items-center gap-6 p-6 select-none"
    >
      {loading && <p className="text-sm text-gray-400 py-8">Loading document preview…</p>}
      {Array.from({ length: numPages }).map((_, i) => (
        <canvas key={i} ref={el => (canvasRefs.current[i] = el)} className="shadow-2xl bg-white rounded-xs mb-2" />
      ))}
    </div>
  )
}

export default function MaterialPreviewModal({ material, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [zoomMultiplier, setZoomMultiplier] = useState(0.5)

  useEffect(() => { setMounted(true) }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!material || !mounted) return null

  const fileUrl = resolveFileUrl(material.url)
  const isPdf = material.type === 'PDF' || /\.pdf($|\?)/i.test(material.url || '')
  const isVideo = material.type === 'VIDEO' || /\.(mp4|mov|webm|mkv)($|\?)/i.test(material.url || '')
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(material.url || '')

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-gray-950/90 backdrop-blur-sm w-screen h-screen flex flex-col overflow-hidden animate-fadeIn select-none"
      onClick={onClose}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        className="w-full h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xl flex-shrink-0">
              {isPdf ? '📄' : isVideo ? '🎬' : material.type === 'PRESENTATION' ? '🖥️' : material.type === 'LINK' ? '🔗' : '📁'}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                {material.title}
              </h3>
              {material.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{material.description}</p>
              )}
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase flex-shrink-0">
              {material.type}
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

        {/* Content Preview Container */}
        <div
          className="flex-1 min-h-0 w-full bg-gray-100 dark:bg-gray-950 flex items-center justify-center relative overflow-hidden"
          onContextMenu={e => e.preventDefault()}
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
              className="max-w-full max-h-full rounded-lg shadow-lg"
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
