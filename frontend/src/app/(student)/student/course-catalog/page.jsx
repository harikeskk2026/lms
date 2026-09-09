'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, CheckCircle2, Lock, Mail, Phone, X } from 'lucide-react'
import courseService from '@/services/courseService'
import { resolveFileUrl } from '@/lib/api'
import SkeletonCard from '@/components/student/SkeletonCard'

const LEVEL_COLORS = {
  BEGINNER:     'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-700',
  ADVANCED:     'bg-brand-100 text-brand-700',
}

const COURSE_GRADIENTS = [
  'from-purple-600 via-violet-600 to-indigo-600',
  'from-indigo-500 via-blue-600 to-blue-700',
  'from-fuchsia-600 via-purple-600 to-violet-700',
  'from-violet-600 via-purple-700 to-indigo-800',
]

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState(null)
  const [modalCourse, setModalCourse] = useState(null)

  const load = () => {
    setLoading(true)
    courseService.list()
      .then(r => setCourses(r.data || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    courseService.getEnrollmentContact()
      .then(r => setContact(r?.data || null))
      .catch(() => setContact(null))
  }, [])

  const hasContact = contact && (contact.name || contact.email || contact.phone)

  return (
    <div className="page-wrapper">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Browse available courses. Enrollment is arranged by your Admin / Training Coordinator.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : !courses?.length ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-brand-600" />
          </div>
          <h3 className="font-display text-lg font-bold text-gray-800 mb-2">No courses available</h3>
          <p className="text-gray-500 text-sm">Check back later for new courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((c, idx) => (
            <div key={c.id} className="glass-card overflow-hidden hover:scale-[1.01] transition-all duration-300 group">
              {c.thumbnail ? (
                <div className="h-32 bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                  <img
                    src={resolveFileUrl(c.thumbnail)}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              ) : (
                <div className={`h-28 bg-gradient-to-br ${COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length]} relative overflow-hidden p-5`}>
                  <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
                  <div className="absolute -right-2 bottom-2 w-12 h-12 rounded-full bg-white/10" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                      <BookOpen size={18} className="text-white" />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white leading-tight">{c.title}</h3>
                  <span className={`chip text-[10px] px-2 py-0.5 flex-shrink-0 ${LEVEL_COLORS[c.level]}`}>{c.level}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={12} />{c.duration}</span>
                </div>

                {c.enrolled ? (
                  <Link href={`/student/my-courses/${c.id}`} className="btn-primary w-full text-center text-sm py-2.5 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={15} /> Go to Course
                  </Link>
                ) : (
                  <button
                    onClick={() => setModalCourse(c)}
                    className="btn-secondary w-full text-center text-sm py-2.5"
                  >
                    Request Enrollment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment Required Modal */}
      {modalCourse && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalCourse(null)}
        >
          <div
            className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Enrollment Required</h3>
                  {modalCourse.title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{modalCourse.title}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModalCourse(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              You cannot enroll yourself in this course. Please contact your
              <span className="font-semibold text-gray-800 dark:text-white"> Admin / Training Coordinator </span>
              to request enrollment.
            </p>

            {hasContact && (
              <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 p-4 mb-5 space-y-2">
                {contact.name && (
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {contact.name}
                    {contact.designation && (
                      <span className="block text-[11px] font-medium text-purple-600 dark:text-purple-300">{contact.designation}</span>
                    )}
                  </div>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
                    <Mail size={13} className="text-purple-500 flex-shrink-0" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
                    <Phone size={13} className="text-purple-500 flex-shrink-0" /> {contact.phone}
                  </a>
                )}
              </div>
            )}

            <button
              onClick={() => setModalCourse(null)}
              className="btn-primary w-full text-center text-sm py-2.5"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}