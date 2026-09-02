'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  loading = false,
  emptyLabel = 'No options found',
  // When true, typing a name that doesn't match any existing option shows a
  // "+ Create ..." row. Selecting it calls onCreate(typedText) so the caller
  // can persist a brand-new record (e.g. a college that isn't in the system
  // yet) and then select it once it exists.
  creatable = false,
  onCreate,
  creating = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // If there isn't enough room below the field (e.g. it's the last field in a
  // scrollable panel), open the options list upward instead of downward so it
  // never gets clipped or hides the fields/buttons that follow.
  const toggleOpen = () => {
    setOpen(o => {
      const next = !o
      if (next && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        setOpenUpward(spaceBelow < 260 && rect.top > 260)
      }
      return next
    })
  }

  const selected = useMemo(
    () => options.find(o => String(o.value) === String(value)) || null,
    [options, value]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  const handleSelect = (option) => {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
  }

  const trimmedQuery = query.trim()
  const hasExactMatch = filtered.some(o => o.label.toLowerCase() === trimmedQuery.toLowerCase())
  const showCreateRow = creatable && trimmedQuery.length > 0 && !hasExactMatch && !loading

  const handleCreate = async () => {
    if (!onCreate || !trimmedQuery) return
    await onCreate(trimmedQuery)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-left outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-purple-300'
        }`}
      >
        <span className={selected ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}>
          {loading ? 'Loading...' : selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && !disabled && (
            <X size={14} className="text-gray-400 hover:text-gray-600" onClick={handleClear} />
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && !disabled && (
        <div className={`absolute z-20 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden ${openUpward ? 'bottom-full mb-1' : 'mt-1'}`}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={creatable ? `${searchPlaceholder} or add new` : searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreateRow ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">{emptyLabel}</p>
            ) : (
              filtered.map(option => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    String(option.value) === String(value)
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
            {showCreateRow && (
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-sm text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-60 border-t border-gray-100 dark:border-gray-800"
              >
                <Plus size={14} />
                {creating ? 'Adding...' : `Add "${trimmedQuery}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
