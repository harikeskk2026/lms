'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Check } from 'lucide-react'

/**
 * Multi-select dropdown (checkbox style) used to pick several students,
 * batches, courses or materials without a clunky native multi <select>.
 *
 * options: [{ value, label }]
 * value: array of selected option values (kept in selection order)
 * onChange(nextValue: array)
 */
export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  searchable = true,
  searchPlaceholder = 'Search...',
  disabled = false,
  emptyLabel = 'No options found',
  compact = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openUpward, setOpenUpward] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const containerRef = useRef(null)
  const menuRef = useRef(null)

  const closeMenu = () => {
    setOpen(false)
    setQuery('')
    setMenuAnchor(null)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target)
      const inMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!inContainer && !inMenu) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = () => closeMenu()
    const onScroll = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return
      close()
    }
    window.addEventListener('resize', close)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', close)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const toggleOpen = () => {
    setOpen(o => {
      const next = !o
      if (next && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const up = spaceBelow < 300 && rect.top > spaceBelow
        setOpenUpward(up)
        setHighlightedIndex(0)
        setMenuAnchor({
          left: rect.left,
          right: window.innerWidth - rect.right,
          top: rect.bottom,
          bottom: window.innerHeight - rect.top,
          width: Math.max(rect.width, 220),
        })
      } else {
        setMenuAnchor(null)
      }
      return next
    })
  }

  const optionMap = useMemo(() => {
    const m = new Map()
    options.forEach(o => m.set(String(o.value), o))
    return m
  }, [options])

  const selectedOptions = useMemo(() => value.map(v => optionMap.get(String(v))).filter(Boolean), [value, optionMap])

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  useEffect(() => { setHighlightedIndex(0) }, [query])

  const toggle = (optionValue) => {
    const str = String(optionValue)
    const next = value.some(v => String(v) === str)
      ? value.filter(v => String(v) !== str)
      : [...value, optionValue]
    onChange(next)
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        toggleOpen()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(i => (i < filtered.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(i => (i > 0 ? i - 1 : Math.max(0, filtered.length - 1)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlightedIndex]) {
        toggle(filtered[highlightedIndex].value)
      }
    }
  }

  const triggerCls = compact
    ? 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs'
    : 'rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-200 text-sm'

  const summary = selectedOptions.length > 2
    ? `${selectedOptions.length} selected`
    : selectedOptions.map(o => o.label).join(', ')

  const menu = open && !disabled && menuAnchor ? createPortal(
    <div
      ref={menuRef}
      role="listbox"
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: menuAnchor.width,
        maxWidth: 'calc(100vw - 16px)',
        left: menuAnchor.left,
        ...(openUpward ? { bottom: menuAnchor.bottom + 6 } : { top: menuAnchor.top + 6 }),
      }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
    >
      {searchable && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
          />
        </div>
      )}
      <div className="max-h-60 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-400 text-center">{emptyLabel}</p>
        ) : (
          filtered.map((option, idx) => {
            const isSelected = value.some(v => String(v) === String(option.value))
            const isHighlighted = idx === highlightedIndex
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => toggle(option.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                title={option.label}
                className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm transition-colors break-words ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold'
                    : isHighlighted
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="min-w-0">{option.label}</span>
                {isSelected && <Check size={15} className="flex-shrink-0" />}
              </button>
            )
          })
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div ref={containerRef} className="relative w-full min-w-0" onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-2 ${triggerCls} px-3.5 py-2 text-left outline-none focus:ring-2 focus:ring-purple-500 transition-colors min-w-0 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-gray-800/50' : 'cursor-pointer hover:border-purple-300'
        }`}
      >
        <span className={`truncate min-w-0 ${value.length ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400'}`}>
          {value.length ? summary : placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {menu}
    </div>
  )
}