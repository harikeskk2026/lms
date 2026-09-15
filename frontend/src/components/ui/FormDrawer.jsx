'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'


export default function FormDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  isDirty = false,
  width = 'w-full sm:w-[480px] lg:w-[540px]',
  headerActions = null,
}) {
  const [mounted, setMounted] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose?.()
    }
  }, [isDirty, onClose])

  // Escape key handler
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false)
        } else {
          attemptClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, attemptClose, showDiscardConfirm])

  if (!open || !mounted) return null

  return createPortal(
    <>
      {/* Background Dimmed Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] animate-fadeIn"
        onClick={attemptClose}
        aria-hidden="true"
      />

      {/* Right-Side Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Form Drawer'}
        className={`fixed top-0 right-0 h-full ${width} max-w-full min-w-0 z-[100] bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slideInRight border-l border-purple-100 dark:border-purple-900/30`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-purple-100 dark:border-purple-900/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="font-display font-bold text-lg text-gray-800 dark:text-white break-words">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={attemptClose}
              aria-label="Close drawer"
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-8 sm:pb-10">
          {children}
        </div>
      </div>

      {/* Compact Discard Confirmation Modal if form is dirty */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowDiscardConfirm(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Discard Changes?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You have unsaved changes in this form. Are you sure you want to close and discard your edits?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false)
                  onClose?.()
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
