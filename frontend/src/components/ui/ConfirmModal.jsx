'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'

const TONES = {
  danger: {
    icon: Trash2,
    iconWrap: 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400',
    btn: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
  },
  primary: {
    icon: Info,
    iconWrap: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    btn: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20',
  },
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  const [mounted, setMounted] = useState(false)
  const config = TONES[tone] || TONES.danger
  const Icon = config.icon

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose?.()
        }
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scaleUp text-center border border-slate-100 dark:border-gray-800 relative mx-4">
        {!loading && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <X size={18} />
          </button>
        )}

        <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-inner ${config.iconWrap}`}>
          <Icon size={24} />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {title}
          </h3>
          {message && (
            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`w-1/2 py-2.5 rounded-xl text-white font-semibold text-xs shadow-md disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-1.5 transition-all active:scale-95 ${config.btn}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Please wait...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function useConfirmModal() {
  const [state, setState] = useState(null)

  const ask = (opts) =>
    new Promise((resolve) => {
      setState({ ...opts, resolve })
    })

  const close = (result) => {
    const s = state
    setState(null)
    s?.resolve?.(result)
  }

  const modal = (
    <ConfirmModal
      isOpen={!!state}
      title={state?.title}
      message={state?.message}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      tone={state?.tone}
      loading={state?.loading}
      onClose={() => close(false)}
      onConfirm={() => close(true)}
    />
  )

  return [ask, modal]
}