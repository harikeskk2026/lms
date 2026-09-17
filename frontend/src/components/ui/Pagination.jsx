'use client'
import { useMemo } from 'react'
import CustomSelect from '@/components/ui/CustomSelect'

/**
 * Single pagination bar used by every paginated table in the app, so the
 * look and behavior (page-size selector, "Showing X-Y of Z", numbered pages
 * with ellipsis, Prev/Next) is identical everywhere instead of every page
 * re-implementing its own footer.
 *
 * Two ways to drive it:
 *  - Server-side lists: pass `total` and `totalPages` from the API response.
 *    The parent already fetched only the current page's rows.
 *  - Client-side lists: pass the full (already filtered) `data` array and
 *    total/totalPages are derived from it. The parent still does its own
 *    `data.slice(...)` for rendering - this component only owns the footer.
 */
export default function Pagination({
  data = [],
  total: totalProp,
  totalPages: totalPagesProp,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showAllOption = false,
  label = 'items',
  className = '',
}) {
  const isAll = pageSize === 'all'
  const total = totalProp ?? data.length
  const totalPages = isAll ? 1 : (totalPagesProp ?? Math.max(1, Math.ceil(total / Number(pageSize))))
  const validPage = Math.min(Math.max(1, page), totalPages)
  const startIndex = isAll ? 0 : (validPage - 1) * Number(pageSize)
  const endIndex = isAll ? total : Math.min(startIndex + Number(pageSize), total)

  const pageNumbers = useMemo(() => {
    const pages = []
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - validPage) <= 1) pages.push(p)
    }
    return pages
  }, [totalPages, validPage])

  if (total === 0) return null

  const sizeOptions = [
    ...pageSizeOptions.map(s => ({ value: String(s), label: String(s) })),
    ...(showAllOption ? [{ value: 'all', label: 'All' }] : []),
  ]

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span>Showing {startIndex + 1}–{endIndex} of {total} {label}</span>
        {onPageSizeChange && (
          <span className="flex items-center gap-1.5">
            Per page:
            <CustomSelect
              compact
              value={String(pageSize)}
              onChange={v => onPageSizeChange(v === 'all' ? 'all' : Number(v))}
              options={sizeOptions}
              className="!py-1"
            />
          </span>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, validPage - 1))}
            disabled={validPage === 1}
            className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
          >
            ← Prev
          </button>

          {pageNumbers.map((p, idx, arr) => (
            <span key={p} className="flex items-center">
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">…</span>}
              <button
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-xl text-sm font-semibold transition-colors ${
                  validPage === p
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700'
                }`}
              >
                {p}
              </button>
            </span>
          ))}

          <button
            onClick={() => onPageChange(Math.min(totalPages, validPage + 1))}
            disabled={validPage === totalPages}
            className="px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
