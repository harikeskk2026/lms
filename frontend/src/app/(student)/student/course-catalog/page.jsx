'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BookOpen, Clock, CheckCircle2 } from 'lucide-react'
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
  const [enrollingId, setEnrollingId] = useState(null)

  const load = () => {
    setLoading(true)
    courseService.list()
      .then(r => setCourses(r.data || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleEnroll(course) {
    setEnrollingId(course.id)
    try {
      await courseService.enroll(course.id)
      toast.success(`Enrolled in ${course.title}`)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to enroll')
    } finally {
      setEnrollingId(null)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse available courses and enroll to start learning.</p>
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
                    onClick={() => handleEnroll(c)}
                    disabled={enrollingId === c.id}
                    className="btn-primary w-full text-center text-sm py-2.5 disabled:opacity-60"
                  >
                    {enrollingId === c.id ? 'Enrolling...' : 'Enroll'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
