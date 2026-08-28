'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  BarChart2, LogOut, LogIn, Menu, X, ChevronRight,
  Layers, Calendar, Brain, Briefcase, Megaphone, Search,
  Moon, Sun, Video
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/lib/api'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import clsx from 'clsx'

const navItems = [
  { href: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/students',      icon: Users,           label: 'Students',     badge: 'students' },
  { href: '/admin/batches',       icon: Layers,          label: 'Batches' },
  { href: '/admin/batch-catalog', icon: Layers,          label: 'Batch Catalog' },
  { href: '/admin/courses',       icon: BookOpen,        label: 'Courses' },
  { href: '/admin/course-catalog',icon: BookOpen,        label: 'Course Catalog' },
  { href: '/admin/attendance',    icon: Calendar,        label: 'Attendance' },
  { href: '/admin/recorded-sessions', icon: Video,       label: 'Recorded Sessions' },
  { href: '/admin/assignments',   icon: ClipboardList,   label: 'Assignments',  badge: 'assignments' },
  { href: '/admin/quizzes',       icon: Brain,           label: 'Quizzes' },
  { href: '/admin/placement',     icon: Briefcase,       label: 'Placement' },
  { href: '/admin/announcements', icon: Megaphone,       label: 'Announcements' },
  { href: '/admin/reports',       icon: BarChart2,       label: 'Reports' },
]

const PAGE_TITLES = {
  '/admin/dashboard':     'Dashboard',
  '/admin/students':      'Students',
  '/admin/batches':       'Batches',
  '/admin/batch-catalog': 'Batch Catalog',
  '/admin/courses':       'Courses',
  '/admin/course-catalog':'Course Catalog',
  '/admin/attendance':    'Attendance',
  '/admin/assignments':   'Assignments',
  '/admin/quizzes':       'Quizzes',
  '/admin/placement':     'Placement',
  '/admin/announcements': 'Announcements',
  '/admin/reports':       'Reports',
}

function Sidebar({ open, onClose, badges }) {
  const pathname = usePathname()
  const { user, logout, logoutAll } = useAuth()

  const roleChip = {
    SUPERADMIN: 'bg-red-500/20 text-red-300',
    ADMIN:      'bg-yellow-400/20 text-yellow-300',
    TRAINER:    'bg-green-400/20 text-green-300',
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-screen w-64 z-30 flex flex-col',
          'transition-transform duration-300',
          'lg:translate-x-0 lg:relative lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'linear-gradient(180deg, #3b0764 0%, #1e0538 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <div className="font-display text-xl font-extrabold text-white">
              Career<span style={{ color: '#ffd668' }}>Labs</span>
            </div>
            <div className="text-purple-300 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Admin Panel</div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-purple-300 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2">
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', roleChip[user?.role] || 'bg-white/10 text-white/60')}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
          <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider px-3 mb-2">Navigation</p>
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const count  = badge ? (badges[badge] || 0) : 0
            return (
              <Link
                key={href} href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/15 border-l-2 border-yellow-400 text-white pl-2.5'
                    : 'text-purple-200 hover:bg-white/5 hover:text-white'
                )}
                onClick={onClose}
              >
                <Icon size={18} className={active ? 'text-yellow-300' : ''} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="bg-yellow-400 text-purple-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {count}
                  </span>
                )}
                {active && <ChevronRight size={14} className="text-yellow-300" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-purple-200 hover:bg-white/5 hover:text-white transition-all">
            <LogOut size={18} />
            Sign Out
          </button>
          <button onClick={logoutAll}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-purple-300/50 hover:bg-white/5 hover:text-purple-200 transition-all">
            <LogIn size={18} className="rotate-180" />
            Sign Out All Devices
          </button>
        </div>
      </aside>
    </>
  )
}

function TopBar({ onMenuClick, user, darkMode, toggleDark }) {
  const pathname = usePathname()
  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1] || 'Admin'

  return (
    <header className="h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-100 dark:border-purple-900/30 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="text-slate-500 hover:text-purple-700 lg:hidden transition-colors">
          <Menu size={22} />
        </button>
        <h1 className="font-display font-bold text-lg text-gray-800 dark:text-white hidden sm:block">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 text-sm text-purple-400">
          <Search size={14} />
          <span className="text-xs">Quick search...</span>
        </div>

        {/* Dark toggle */}
        <button
          onClick={toggleDark}
          className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <NotificationDropdown
          fetchFn={adminApi.getNotifications}
          markReadFn={adminApi.markNotifRead}
          markAllFn={adminApi.markAllNotifsRead}
          pollInterval={30000}
        />

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-purple-100 dark:border-purple-900/30">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{user?.name}</p>
            <p className="text-[11px] text-purple-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [badges, setBadges] = useState({ students: 0, assignments: 0 })
  const { user } = useAuth()

  // Fetch badge counts
  useEffect(() => {
    adminApi.getDashboard().then(res => {
      const d = res.data?.data
      if (d) {
        setBadges({
          assignments: d.assignments?.pendingSubmissions || 0,
        })
      }
    }).catch(() => {})
  }, [])

  const toggleDark = () => {
    setDarkMode(p => {
      const next = !p
      if (next) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-[#0f0a1e] dark:via-[#1a0f35] dark:to-[#0f0a1e]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badges={badges} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          darkMode={darkMode}
          toggleDark={toggleDark}
        />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
