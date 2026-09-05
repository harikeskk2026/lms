'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This route predates the Java backend migration and called Node/Prisma-shaped
// endpoints (studentApi.getMaterials/.getSyllabus/.getSessions/.getClasses) that
// don't exist on the Java API - every tab here was permanently broken. The
// student-facing course detail page is /student/my-courses/[id] now, which is
// fully Java-wired (including materials aggregated across course/module/topic/
// session levels) - redirect there instead of maintaining two parallel pages.
export default function CourseDetailRedirect({ params }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/student/my-courses/${params.id}`)
  }, [params.id, router])

  return null
}
