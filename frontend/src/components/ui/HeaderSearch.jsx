'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, LayoutDashboard, Users, BookOpen, Layers, Calendar,
  Video, ClipboardList, Brain, Briefcase, Megaphone, BarChart2,
  UserCircle, ArrowRight, Loader2, Bell
} from 'lucide-react'
import { adminApi, studentApi } from '@/lib/api'
import courseService from '@/services/courseService'
import batchService from '@/services/batchService'

const ADMIN_PAGES = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, category: 'Page' },
  { label: 'Students List', href: '/admin/students', icon: Users, category: 'Page' },
  { label: 'Batches List', href: '/admin/batches', icon: Layers, category: 'Page' },
  { label: 'Courses', href: '/admin/course-catalog', icon: BookOpen, category: 'Page' },
  { label: 'Scheduled Class', href: '/admin/meeting-links', icon: Video, category: 'Page' },
  { label: 'Attendance', href: '/admin/attendance', icon: Calendar, category: 'Page' },
  { label: 'Recorded Sessions', href: '/admin/recorded-sessions', icon: Video, category: 'Page' },
  { label: 'Assignments', href: '/admin/assignments', icon: ClipboardList, category: 'Page' },
  { label: 'Quizzes', href: '/admin/quizzes', icon: Brain, category: 'Page' },
  { label: 'Placement', href: '/admin/placement', icon: Briefcase, category: 'Page' },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone, category: 'Page' },
  { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart2, category: 'Page' },
  { label: 'My Profile', href: '/admin/profile', icon: UserCircle, category: 'Page' },
]

const STUDENT_PAGES = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard, category: 'Page' },
  { label: 'My Courses', href: '/student/courses', icon: BookOpen, category: 'Page' },
  { label: 'Assignments', href: '/student/assignments', icon: ClipboardList, category: 'Page' },
  { label: 'Quizzes', href: '/student/quizzes', icon: Brain, category: 'Page' },
  { label: 'Recorded Sessions', href: '/student/recorded-sessions', icon: Video, category: 'Page' },
  { label: 'Attendance', href: '/student/attendance', icon: Calendar, category: 'Page' },
  { label: 'Notifications', href: '/student/notifications', icon: Bell, category: 'Page' },
  { label: 'My Profile', href: '/student/profile', icon: UserCircle, category: 'Page' },
]

export default function HeaderSearch({ role = 'STUDENT' }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ pages: [], students: [], courses: [], batches: [], assignments: [] })
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const searchAbortRef = useRef(null)

  const isDarkRoleAdmin = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'TRAINER'

  // Cmd+K / Ctrl+K keyboard shortcut to focus input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Flattened results for keyboard navigation
  const allFlattenedResults = [
    ...results.pages.map(p => ({ ...p, type: 'Page' })),
    ...results.students.map(s => ({ ...s, type: 'Student', label: s.name, href: `/admin/students/${s.id}`, icon: Users, sub: s.email })),
    ...results.courses.map(c => ({ ...c, type: 'Course', label: c.title, href: isDarkRoleAdmin ? `/admin/course-catalog` : `/student/my-courses/${c.id}`, icon: BookOpen, sub: c.level })),
    ...results.batches.map(b => ({ ...b, type: 'Batch', label: b.name, href: isDarkRoleAdmin ? `/admin/batches/${b.id}` : `/student/courses`, icon: Layers, sub: b.course?.title })),
    ...results.assignments.map(a => ({ ...a, type: 'Assignment', label: a.title, href: isDarkRoleAdmin ? `/admin/assignments` : `/student/assignments`, icon: ClipboardList, sub: a.batchName })),
  ]

  // Search execution
  const handleSearch = useCallback(async (q) => {
    searchAbortRef.current?.abort()
    if (!q.trim()) {
      setResults({ pages: [], students: [], courses: [], batches: [], assignments: [] })
      setLoading(false)
      return
    }

    const controller = new AbortController()
    searchAbortRef.current = controller
    const signal = controller.signal
    setLoading(true)
    const lower = q.toLowerCase().trim()

    // 1. Pages search
    const pagesSource = isDarkRoleAdmin ? ADMIN_PAGES : STUDENT_PAGES
    const matchedPages = pagesSource.filter(p => p.label.toLowerCase().includes(lower))

    // 2. Fetch API data
    let students = []
    let courses = []
    let batches = []
    let assignments = []

    try {
      if (isDarkRoleAdmin) {
        const [stRes, cRes, bRes] = await Promise.allSettled([
          adminApi.getStudents({ search: lower, limit: 5 }, { signal }),
          courseService.list({ search: lower }, { signal }),
          batchService.list({ search: lower }, { signal })
        ])

        if (stRes.status === 'fulfilled') {
          const stData = stRes.value?.data?.data || stRes.value?.data
          const stList = Array.isArray(stData) ? stData : (stData?.students || [])
          students = stList.slice(0, 5)
        }
        if (cRes.status === 'fulfilled') {
          const cData = cRes.value?.data || cRes.value
          const cList = Array.isArray(cData) ? cData : (cData?.courses || [])
          courses = cList.slice(0, 5)
        }
        if (bRes.status === 'fulfilled') {
          const bData = bRes.value?.data || bRes.value
          const bList = Array.isArray(bData) ? bData : (bData?.batches || [])
          batches = bList.slice(0, 5)
        }
      } else {
        const [cRes, aRes] = await Promise.allSettled([
          studentApi.getCourses({ signal }),
          studentApi.getAssignments({ signal })
        ])

        if (cRes.status === 'fulfilled') {
          const cData = cRes.value?.data?.data || cRes.value?.data || cRes.value
          const cList = Array.isArray(cData) ? cData : (cData?.courses || [])
          courses = cList.filter(c => c.title?.toLowerCase().includes(lower)).slice(0, 5)
        }
        if (aRes.status === 'fulfilled') {
          const aData = aRes.value?.data?.data || aRes.value?.data || aRes.value
          const aList = Array.isArray(aData) ? aData : (aData?.assignments || [])
          assignments = aList.filter(a => a.title?.toLowerCase().includes(lower)).slice(0, 5)
        }
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return
      console.error('Header search error:', err)
    }

    if (searchAbortRef.current !== controller) return
    setResults({
      pages: matchedPages,
      students,
      courses,
      batches,
      assignments
    })
    setLoading(false)
    setSelectedIndex(0)
  }, [isDarkRoleAdmin])

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, handleSearch])

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsFocused(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (allFlattenedResults.length > 0) {
        setSelectedIndex(prev => (prev + 1) % allFlattenedResults.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (allFlattenedResults.length > 0) {
        setSelectedIndex(prev => (prev - 1 + allFlattenedResults.length) % allFlattenedResults.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allFlattenedResults[selectedIndex]) {
        navigateToItem(allFlattenedResults[selectedIndex])
      }
    }
  }

  const navigateToItem = (item) => {
    setIsFocused(false)
    setQuery('')
    inputRef.current?.blur()
    if (item.href) {
      router.push(item.href)
    }
  }

  const showDropdown = isFocused && (query.trim() || allFlattenedResults.length > 0)

  return (
    <div ref={containerRef} className="relative hidden md:block">
      {/* Elongating Input Bar */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ease-in-out ${
          isFocused
            ? 'w-72 sm:w-96 bg-white dark:bg-gray-800 border-purple-500 shadow-md ring-2 ring-purple-500/20'
            : 'w-44 sm:w-56 bg-purple-50/80 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-800/40'
        }`}
      >
        <Search size={14} className={`shrink-0 transition-colors ${isFocused ? 'text-purple-600 dark:text-purple-400' : 'text-purple-400'}`} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Quick search..."
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={e => {
            setQuery(e.target.value)
            setIsFocused(true)
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-xs text-gray-800 dark:text-gray-100 placeholder-purple-400 dark:placeholder-purple-400/70 outline-none font-medium"
        />

        {loading ? (
          <Loader2 size={13} className="animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-fadeIn">
          <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
            {!query.trim() ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">
                <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Quick Pages:</p>
                <div className="flex flex-wrap gap-1">
                  {(isDarkRoleAdmin ? ADMIN_PAGES : STUDENT_PAGES).slice(0, 5).map(p => (
                    <button
                      key={p.href}
                      onClick={() => navigateToItem(p)}
                      className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/40 text-gray-700 dark:text-gray-300 font-medium transition-colors text-[10px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : allFlattenedResults.length === 0 && !loading ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No results for &quot;<span className="font-semibold text-gray-600 dark:text-gray-300">{query}</span>&quot;
              </div>
            ) : (
              allFlattenedResults.map((item, idx) => {
                const Icon = item.icon || Search
                const isSelected = idx === selectedIndex

                return (
                  <div
                    key={`${item.type}-${item.href}-${idx}`}
                    onClick={() => navigateToItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'hover:bg-purple-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1 rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300'
                      }`}>
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate leading-snug">{item.label}</p>
                        {item.sub && (
                          <p className={`text-[10px] truncate ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>
                            {item.sub}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.type}
                      </span>
                      <ArrowRight size={12} className={isSelected ? 'text-white' : 'text-gray-400'} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-mono text-gray-600 dark:text-gray-300">↑↓</kbd> Select &nbsp;<kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-mono text-gray-600 dark:text-gray-300">↵</kbd> Open</span>
            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-mono text-gray-600 dark:text-gray-300">ESC</kbd> Close</span>
          </div>
        </div>
      )}
    </div>
  )
}
