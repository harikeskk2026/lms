'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, LayoutDashboard, Users, BookOpen, Layers, Calendar,
  Video, ClipboardList, Brain, Briefcase, Megaphone, BarChart2,
  UserCircle, ArrowRight, Loader2, Sparkles, Bell
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

export default function GlobalSearchModal({ open, onClose, role = 'STUDENT' }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ pages: [], students: [], courses: [], batches: [], assignments: [] })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const isDarkRoleAdmin = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'TRAINER'

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults({ pages: [], students: [], courses: [], batches: [], assignments: [] })
      setSelectedIndex(0)
    }
  }, [open])

  // Flattened results for keyboard navigation
  const allFlattenedResults = [
    ...results.pages.map(p => ({ ...p, type: 'Page' })),
    ...results.students.map(s => ({ ...s, type: 'Student', label: s.name, href: `/admin/students/${s.id}`, icon: Users, sub: s.email })),
    ...results.courses.map(c => ({ ...c, type: 'Course', label: c.title, href: isDarkRoleAdmin ? `/admin/course-catalog` : `/student/courses/${c.id}`, icon: BookOpen, sub: c.level })),
    ...results.batches.map(b => ({ ...b, type: 'Batch', label: b.name, href: isDarkRoleAdmin ? `/admin/batches/${b.id}` : `/student/courses`, icon: Layers, sub: b.course?.title })),
    ...results.assignments.map(a => ({ ...a, type: 'Assignment', label: a.title, href: isDarkRoleAdmin ? `/admin/assignments` : `/student/assignments`, icon: ClipboardList, sub: a.batchName })),
  ]

  // Search logic
  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults({ pages: [], students: [], courses: [], batches: [], assignments: [] })
      setLoading(false)
      return
    }

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
        // Admin search
        const [stRes, cRes, bRes] = await Promise.allSettled([
          adminApi.getStudents({ search: lower, limit: 5 }),
          courseService.list(),
          batchService.list()
        ])

        if (stRes.status === 'fulfilled') {
          students = (stRes.value.data?.students || stRes.value.data || []).slice(0, 5)
        }
        if (cRes.status === 'fulfilled') {
          courses = (cRes.value.data || []).filter(c => c.title.toLowerCase().includes(lower)).slice(0, 5)
        }
        if (bRes.status === 'fulfilled') {
          batches = (bRes.value.data || []).filter(b => b.name.toLowerCase().includes(lower) || b.course?.title?.toLowerCase().includes(lower)).slice(0, 5)
        }
      } else {
        // Student search
        const [cRes, aRes] = await Promise.allSettled([
          studentApi.getCourses(),
          studentApi.getAssignments()
        ])

        if (cRes.status === 'fulfilled') {
          courses = (cRes.value.data || []).filter(c => c.title?.toLowerCase().includes(lower)).slice(0, 5)
        }
        if (aRes.status === 'fulfilled') {
          assignments = (aRes.value.data || []).filter(a => a.title?.toLowerCase().includes(lower)).slice(0, 5)
        }
      }
    } catch (err) {
      console.error('Quick search error:', err)
    }

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

  // Debounced query change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, handleSearch])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
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
    onClose()
    if (item.href) {
      router.push(item.href)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-14 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog - Compact & Sleek */}
      <div
        className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[75vh] z-10"
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center px-3 py-1 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <Search size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            placeholder={isDarkRoleAdmin ? "Search pages, students, courses, batches..." : "Search pages, courses, assignments..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-2.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-xs sm:text-sm outline-none font-medium"
          />
          {loading ? (
            <Loader2 size={16} className="animate-spin text-purple-600 dark:text-purple-400 shrink-0 ml-1.5" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={15} />
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="ml-1.5 px-2 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-2 space-y-2 max-h-[55vh]">
          {!query.trim() ? (
            <div className="p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <Sparkles size={16} />
              </div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Quick Command & Navigation Search</p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                Type keywords to navigate to pages, search students, courses, or batches instantly.
              </p>
              <div className="pt-1 flex items-center justify-center gap-1.5 flex-wrap text-[11px] text-gray-500">
                <span className="font-semibold text-gray-400 text-[10px]">Suggestions:</span>
                {(isDarkRoleAdmin ? ADMIN_PAGES : STUDENT_PAGES).slice(0, 4).map(p => (
                  <button
                    key={p.href}
                    onClick={() => { navigateToItem(p) }}
                    className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/40 transition-colors text-[10px] font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : allFlattenedResults.length === 0 && !loading ? (
            <div className="p-6 text-center text-gray-400">
              <p className="text-xs">No results matching &quot;<span className="text-gray-700 dark:text-gray-200 font-semibold">{query}</span>&quot;</p>
            </div>
          ) : (
            <div className="space-y-1">
              {allFlattenedResults.map((item, idx) => {
                const Icon = item.icon || Search
                const isSelected = idx === selectedIndex

                return (
                  <div
                    key={`${item.type}-${item.href}-${idx}`}
                    onClick={() => navigateToItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'hover:bg-purple-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300'
                      }`}>
                        <Icon size={14} />
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.type}
                      </span>
                      <ArrowRight size={12} className={isSelected ? 'text-white' : 'text-gray-400'} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-mono text-gray-700 dark:text-gray-300">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-mono text-gray-700 dark:text-gray-300">↵</kbd> Select</span>
          </div>
          <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px] font-mono text-gray-700 dark:text-gray-300">ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
