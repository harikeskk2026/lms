'use client'
import { List, LayoutGrid } from 'lucide-react'
import clsx from 'clsx'

export default function ViewToggle({ value, onChange, className }) {
  return (
    <div className={clsx('inline-flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 p-1', className)}>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        className={clsx(
          'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          value === 'table'
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        )}
        title="Table view"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        aria-pressed={value === 'card'}
        className={clsx(
          'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          value === 'card'
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        )}
        title="Card view"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  )
}
