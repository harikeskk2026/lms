'use client'
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'

/**
 * Consistent pagination bar for Placement module lists.
 * Pure client-side paging: pass the full (already search/filtered) array and
 * it derives visible page + "Showing X–Y of Z".
 */
export default function Pagination({
  data = [],
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [8, 12, 20, 50],
  label = 'items',
  className = '',
}) {
  const total = data.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const validPage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (validPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, total)
  const visible = useMemo(() => data.slice(startIndex, endIndex), [data, startIndex, endIndex])

  const pageNumbers = useMemo(() => {
    const pages = []
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - validPage) <= 1) pages.push(p)
    }
    return pages
  }, [totalPages, validPage])

  if (total === 0) return null

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">
          Showing {startIndex + 1}–{endIndex} of {total} {label}
        </span>
        {onPageSizeChange && (
          <span className="flex items-center gap-1.5">
            Per page:
            <CustomSelect
              compact
              value={String(pageSize)}
              onChange={v => onPageSizeChange(Number(v))}
              options={pageSizeOptions.map(s => ({ value: String(s), label: String(s) }))}
              className="!py-1.5"
            />
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, validPage - 1))}
          disabled={validPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center transition-colors"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((p, idx, arr) => (
          <span key={p} className="flex items-center">
            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">…</span>}
            <button
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                validPage === p
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          </span>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, validPage + 1))}
          disabled={validPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center transition-colors"
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}