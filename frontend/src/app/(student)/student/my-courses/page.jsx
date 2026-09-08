'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { BookOpen, Clock } from 'lucide-react'
import courseService from '@/services/courseService'
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

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    courseService.mine()
      .then(r => setEnrollments(r.data || []))
      .catch(() => setEnrollments([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-wrapper">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">My Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {enrollments ? (
              <><span className="font-semibold text-brand-600">{enrollments.length}</span> enrolled course{enrollments.length !== 1 ? 's' : ''}</>
            ) : 'Loading...'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : !enrollments?.length ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-brand-600" />
          </div>
          <h3 className="font-display text-lg font-bold text-gray-800 mb-2">No courses yet</h3>
          <p className="text-gray-500 text-sm mb-4">Enroll in a course to see it here.</p>
          <Link href="/student/course-catalog" className="btn-primary inline-block text-sm px-5 py-2.5">Browse Courses</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {enrollments.map((e, idx) => (
            <div key={e.id} className="glass-card overflow-hidden hover:scale-[1.01] transition-all duration-300 group">
              <div className={`h-28 bg-gradient-to-br ${COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length]} relative overflow-hidden p-5`}>
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="absolute -right-2 bottom-2 w-12 h-12 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                    <BookOpen size={18} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-gray-800 dark:text-white leading-tight">{e.course.title}</h3>
                  <span className={`chip text-[10px] px-2 py-0.5 flex-shrink-0 ${LEVEL_COLORS[e.course.level]}`}>{e.course.level}</span>
                </div>
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={12} />{e.course.duration}</span>
                  <span>Enrolled {format(new Date(e.enrolledAt), 'MMM d, yyyy')}</span>
                </div>

                <Link href={`/student/my-courses/${e.course.id}`} className="btn-primary w-full text-center text-sm py-2.5 block">
                  Continue Learning →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
