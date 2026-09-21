'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

/**
 * Polished, keyboard-accessible custom single-select dropdown.
 * Replaces native <select> everywhere in the Placement module so every
 * dropdown shares the same look, behaviour and mobile handling.
 *
 * options: [{ value, label }]
 * value: selected option's value ('' or undefined for nothing selected)
 * onChange(nextValue) — fires with the new value or '' when cleared.
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
  loading = false,
  emptyLabel = 'No options found',
  compact = false,
  className = '',
  align = 'start',
  error = false,
  clearable = false,
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
        const up = spaceBelow < 280 && rect.top > spaceBelow
        setOpenUpward(up)
        setHighlightedIndex(0)
        setMenuAnchor({
          left: rect.left,
          right: window.innerWidth - rect.right,
          top: rect.bottom,
          bottom: window.innerHeight - rect.top,
          width: Math.max(rect.width, 180),
        })
      } else {
        setMenuAnchor(null)
      }
      return next
    })
  }

  const selected = useMemo(
    () => options.find(o => String(o.value) === String(value)) || null,
    [options, value]
  )

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  useEffect(() => { setHighlightedIndex(0) }, [query])

  const handleSelect = (option) => {
    onChange(option.value)
    closeMenu()
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
      if (filtered[highlightedIndex]) handleSelect(filtered[highlightedIndex])
    }
  }

  const borderCls = error
    ? 'border-red-500 ring-1 ring-red-500'
    : 'border-gray-200 dark:border-gray-700'

  const showClear = clearable && selected && !disabled && !loading

  const triggerCls = compact
    ? `rounded-xl border ${borderCls} bg-white dark:bg-gray-800 text-xs`
    : `rounded-xl border ${borderCls} bg-gray-50 dark:bg-gray-800 dark:text-gray-200 text-sm`

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
        ...(align === 'end' ? { right: menuAnchor.right } : { left: menuAnchor.left }),
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
      <div className={`overflow-y-auto py-1 ${compact ? 'max-h-56' : 'max-h-60'}`}>
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-400 text-center">{emptyLabel}</p>
        ) : (
          filtered.map((option, idx) => {
            const isSelected = String(option.value) === String(value)
            const isHighlighted = idx === highlightedIndex
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                title={option.label}
                className={`w-full text-left px-3 py-2 text-sm transition-colors break-words ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold'
                    : isHighlighted
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {option.label}
              </button>
            )
          })
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div ref={containerRef} className={`relative min-w-0 ${compact ? 'max-w-56' : 'w-full'}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-2 ${triggerCls} ${showClear ? 'pl-3.5 pr-9 py-2' : 'px-3.5 py-2'} text-left outline-none focus:ring-2 focus:ring-purple-500 transition-colors min-w-0 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-gray-800/50' : 'cursor-pointer hover:border-purple-300'
        } ${className}`}
      >
        <span
          title={selected ? selected.label : placeholder}
          className={`truncate min-w-0 ${selected ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400'}`}
        >
          {loading ? 'Loading...' : selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {showClear && (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onChange('')
            closeMenu()
            setQuery('')
          }}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 z-[1]"
        >
          <X size={13} />
        </button>
      )}
      {menu}
    </div>
  )
}