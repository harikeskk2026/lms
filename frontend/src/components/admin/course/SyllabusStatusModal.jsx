'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertCircle, Layers, Folder, Check } from 'lucide-react'

export default function SyllabusStatusModal({
  open,
  initialStatus = 'PUBLISHED',
  moduleCount = 0,
  topicCount = 0,
  loading = false,
  onClose,
  onConfirm,
}) {
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState(initialStatus)
  const [includeTopics, setIncludeTopics] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      setStatus(initialStatus)
      setIncludeTopics(true)
    }
  }, [open, initialStatus])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onClose])

  if (!open || !mounted) return null

  const isPublish = status === 'PUBLISHED'

  const handleConfirm = () => {
    onConfirm?.({ status, includeTopics })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose?.()
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isPublish
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isPublish ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Change Syllabus Status
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Update status for course modules and topics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Target Status Switcher */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Target Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('PUBLISHED')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  isPublish
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>PUBLISHED</span>
                {isPublish && <Check size={14} className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  !isPublish
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>DRAFT</span>
                {!isPublish && <Check size={14} className="ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Scope Selection: Only Modules vs Modules and Topics */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Apply Status To:
            </label>
            <div className="space-y-2.5">
              {/* Option 1: Modules and Topics */}
              <div
                onClick={() => setIncludeTopics(true)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  includeTopics
                    ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 dark:border-purple-600 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    includeTopics
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {includeTopics && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Layers size={15} className={includeTopics ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
                    <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">
                      Modules and Topics
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Update all <strong className="text-gray-700 dark:text-gray-200">{moduleCount}</strong> modules and their{' '}
                    <strong className="text-gray-700 dark:text-gray-200">{topicCount}</strong> topics to{' '}
                    <span className={isPublish ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{status}</span>.
                  </p>
                </div>
              </div>

              {/* Option 2: Only Modules */}
              <div
                onClick={() => setIncludeTopics(false)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  !includeTopics
                    ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 dark:border-purple-600 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    !includeTopics
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {!includeTopics && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Folder size={15} className={!includeTopics ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
                    <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">
                      Only Modules
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Update only all <strong className="text-gray-700 dark:text-gray-200">{moduleCount}</strong> modules to{' '}
                    <span className={isPublish ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{status}</span>.
                    All topics will retain their existing status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info notice */}
          <div
            className={`p-3 rounded-xl text-xs border ${
              isPublish
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            {isPublish
              ? 'Published modules and topics will become visible to enrolled students and trainers.'
              : 'Draft modules and topics will be hidden from student course views until published.'}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-5 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${
              isPublish
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Confirm & {isPublish ? 'Publish' : 'Set to Draft'}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
