'use client'

import { useState, useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut, X, Download, FileText, ExternalLink } from 'lucide-react'
import { resolveFileUrl } from '@/lib/api'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.25

function PdfCanvasViewer({ url, zoomMultiplier }) {
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
        console.error('PDF load error:', e)
        if (!cancelled) setError('Failed to load PDF preview')
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
      className="flex-1 min-h-0 w-full overflow-auto bg-gray-100 dark:bg-gray-950 flex flex-col items-center gap-4 p-4"
    >
      {loading && <p className="text-sm text-gray-500 py-8">Loading preview…</p>}
      {Array.from({ length: numPages }).map((_, i) => (
        <canvas key={i} ref={el => (canvasRefs.current[i] = el)} className="shadow-md bg-white rounded-sm" />
      ))}
    </div>
  )
}

export default function ViewAttachmentModal({ url, name, onClose }) {
  const [zoomMultiplier, setZoomMultiplier] = useState(1)

  // Ensure absolute URL if relative path
  const fileUrl = url ? (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') ? url : resolveFileUrl(url)) : ''
  const isPdf = /\.pdf($|\?)/i.test(fileUrl) || /\.pdf$/i.test(name || '')
  const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(fileUrl) || /\.(png|jpe?g|webp|gif)$/i.test(name || '')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900 rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0 mr-3">
            <FileText size={18} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <h3 className="font-display font-bold text-sm sm:text-base text-gray-800 dark:text-white truncate">
              {name || 'File Preview'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isPdf && (
              <>
                <button
                  type="button"
                  onClick={() => setZoomMultiplier(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMultiplier(1)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 w-12 text-center"
                  title="Reset zoom"
                >
                  {Math.round(zoomMultiplier * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMultiplier(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
              </>
            )}

            {fileUrl && (
              <a
                href={fileUrl}
                download={name || 'download'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                title="Download / Open file"
              >
                <Download size={18} />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isPdf ? (
          <PdfCanvasViewer url={fileUrl} zoomMultiplier={zoomMultiplier} />
        ) : isImage ? (
          <div className="flex-1 min-h-0 w-full overflow-auto bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-6">
            <img src={fileUrl} alt={name || 'Preview'} className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center text-sm text-gray-500 p-8 text-center bg-gray-50/50 dark:bg-gray-900/50">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <FileText size={32} />
            </div>
            <p className="font-semibold text-base text-gray-800 dark:text-gray-200 mb-1">{name || 'Document File'}</p>
            <p className="text-xs text-gray-400 max-w-md mb-4">
              In-browser preview is available for PDF documents and images. For Word (.docx) and Excel (.xls, .xlsx) spreadsheets, please download the file to view its full formatting.
            </p>
            {fileUrl && (
              <a
                href={fileUrl}
                download={name || 'attachment'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-all"
              >
                <Download size={14} /> Download {name || 'File'}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
