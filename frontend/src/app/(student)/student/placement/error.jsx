'use client'
import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function PlacementError({ error, reset }) {
  useEffect(() => {
    console.error('Placement page error:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center max-w-md w-full space-y-3">
        <AlertTriangle size={28} className="mx-auto text-amber-500" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Something went wrong on this page.
        </p>
        <p className="text-xs text-gray-400">
          {error && typeof error.message === 'string'
            ? error.message
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
        >
          <RotateCcw size={12} /> Try Again
        </button>
      </div>
    </div>
  )
}