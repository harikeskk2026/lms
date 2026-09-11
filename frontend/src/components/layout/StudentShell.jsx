'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Compass, Calendar, ClipboardList,
  Brain, Briefcase, Bell, Megaphone, LogOut, LogIn, Menu, X, ChevronRight, Video, UserCircle, Search, Link2
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { studentApi, resolveFileUrl } from '@/lib/api'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import HeaderSearch from '@/components/ui/HeaderSearch'
import clsx from 'clsx'

const navItems = [
  { href: '/student/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/student/my-courses',    icon: BookOpen,        label: 'My Courses' },
  { href: '/student/course-catalog', icon: Compass,        label: 'Courses' },
  { href: '/student/meeting-links', icon: Link2,           label: 'Scheduled Class' },
  { href: '/student/attendance',    icon: Calendar,        label: 'Attendance' },
  { href: '/student/recorded-sessions', icon: Video,       label: 'Recorded Sessions' },
  { href: '/student/assignments',   icon: ClipboardList,   label: 'Assignments', badge: 'assignments' },
  { href: '/student/quizzes',       icon: Brain,           label: 'Quizzes' },
  { href: '/student/placement',     icon: Briefcase,       label: 'Placement' },
  { href: '/student/announcements', icon: Megaphone,       label: 'Announcements' },
  { href: '/student/notifications', icon: Bell,            label: 'Notifications', badge: 'notifications' },
]

function Sidebar({ open, onClose, badges }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-screen w-64 z-30 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:relative lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'linear-gradient(180deg, #3b0764 0%, #1e0538 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <div className="font-display text-xl font-extrabold text-white">
              Career<span style={{ color: '#ffd668' }}>Labs</span>
            </div>
            <div className="text-purple-300 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
              {user?.role ? `${user.role.replace(/_/g, ' ')} Panel` : 'Student Panel'}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {user?.photoUrl ? (
              <img src={resolveFileUrl(user.photoUrl)} alt={user.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'S'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-purple-300 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="chip bg-yellow-400/20 text-yellow-300 text-[10px] px-2 py-0.5">STUDENT</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
          <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider px-3 mb-2">Explore</p>
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const count  = badge ? badges[badge] || 0 : 0
            return (
              <Link
                key={href} href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/10 border-l-2 border-yellow-400 text-white'
                    : 'text-purple-200 hover:bg-white/5 hover:text-white'
                )}
                onClick={handleNavClick}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-[10px] font-bold">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
                {active && !count && <ChevronRight size={13} />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all w-full text-left">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function TopBar({ onMenuClick, user, unreadCount }) {
  const [dark, setDark] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header className="h-14 sm:h-16 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-10">
      <button onClick={onMenuClick} className="text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white lg:hidden">
        <Menu size={22} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {/* Inline Elongating Search */}
        <HeaderSearch role={user?.role || 'STUDENT'} />

        {/* Dark mode */}
        <button
          onClick={toggleDark}
          className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          {dark ? '☀️' : '🌙'}
        </button>

        {/* Notifications Dropdown */}
        <NotificationDropdown
          fetchFn={studentApi.getNotifications}
          markReadFn={studentApi.markRead}
          markAllFn={studentApi.markAllRead}
          viewAllHref="/student/notifications"
          pollInterval={30000}
        />

        {/* Avatar / Profile menu */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(p => !p)}
            className="flex items-center gap-2"
          >
            {user?.photoUrl ? (
              <img src={resolveFileUrl(user.photoUrl)} alt={user.name} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'S'}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{user?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">Student</p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 w-48 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-gray-900 z-50 overflow-hidden">
              <Link
                href="/student/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <UserCircle size={16} className="text-purple-600" />
                My Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function StudentShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [badges, setBadges]           = useState({ assignments: 0, notifications: 0 })
  const { user } = useAuth()

  // Fetch badge counts
  useEffect(() => {
    Promise.allSettled([
      studentApi.getAssignments(),
      studentApi.getNotifications()
    ]).then(([aRes, nRes]) => {
      const assignments = aRes.status === 'fulfilled' ? (aRes.value.data.data ?? []) : []
      // New Spring Boot API returns { notifications: [...], unreadCount: N }
      // Old Node.js API returned a plain array — handle both shapes
      const notifsData  = nRes.status === 'fulfilled' ? nRes.value.data.data : null
      const unreadNotif = notifsData
        ? typeof notifsData.unreadCount === 'number'
          ? notifsData.unreadCount                                    // new shape
          : (Array.isArray(notifsData) ? notifsData.filter(n => !n.isRead).length : 0) // old shape
        : 0
      const pendingAsgn = Array.isArray(assignments)
        ? assignments.filter(a => !a.submission || a.submission.status === 'PENDING').length
        : 0
      setBadges({ assignments: pendingAsgn, notifications: unreadNotif })
    })
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-[#0f0a1e] dark:via-[#1a0f35] dark:to-[#0f0a1e] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badges={badges} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(p => !p)} user={user} unreadCount={badges.notifications} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
