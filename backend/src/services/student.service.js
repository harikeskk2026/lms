const { PrismaClient } = require('@prisma/client')
const ApiError = require('../utils/ApiError')

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getStudentProfile(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      enrollments: {
        include: {
          batch: {
            include: { course: true }
          }
        }
      }
    }
  })
  if (!profile) throw new ApiError(404, 'Student profile not found')
  return profile
}

// ─── getDashboardService ───────────────────────────────────────────────────────
async function getDashboardService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const enrollment = profile.enrollments[0]
  const batchId    = enrollment?.batch?.id || null
  const courseId   = enrollment?.batch?.courseId || null

  const [
    attendanceSummary,
    assignments,
    quizAttempts,
    upcomingClasses,
    recentNotifs,
    syllabusProgress,
    nextMock,
    placements,
    recentActivity
  ] = await Promise.all([
    // Attendance
    prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId },
      _count: { status: true }
    }),
    // Assignments
    batchId ? prisma.assignment.findMany({
      where: { batchId },
      include: { submissions: { where: { studentId } } }
    }) : [],
    // Quiz attempts
    prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: { quiz: { select: { title: true, totalMarks: true } } }
    }),
    // Upcoming classes
    batchId ? prisma.dailyClass.findMany({
      where: { batchId, status: 'SCHEDULED', date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 3,
      include: { topics: { select: { id: true, title: true } } }
    }) : [],
    // Notifications
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    // Syllabus progress
    courseId ? prisma.syllabusModule.findMany({
      where: { courseId },
      include: {
        topics: {
          include: { completions: { where: { studentId } } }
        }
      },
      orderBy: { order: 'asc' }
    }) : [],
    // Next mock interview
    prisma.mockInterview.findFirst({
      where: { studentId, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' }
    }),
    // Placement updates
    prisma.placementUpdate.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 3
    }),
    // Recent activity - quiz attempts
    prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: { quiz: { select: { title: true } } }
    })
  ])

  // Process attendance
  const attMap = {}
  for (const r of attendanceSummary) attMap[r.status] = r._count.status
  const present = attMap['PRESENT'] || 0
  const absent  = attMap['ABSENT'] || 0
  const total   = present + absent
  const attPct  = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0

  // Process assignments
  let pendingAssignments = 0, overdueAssignments = 0
  for (const a of assignments) {
    const sub = a.submissions[0]
    if (!sub || sub.status === 'PENDING') {
      if (new Date(a.dueDate) < new Date()) overdueAssignments++
      else pendingAssignments++
    }
  }

  // Quiz scores
  const quizScores = quizAttempts.map(q => ({
    title: q.quiz.title,
    score: q.score,
    totalMarks: q.totalMarks,
    pct: Math.round(q.score / q.totalMarks * 100),
    passed: q.passed,
    date: q.submittedAt
  }))
  const avgScore = quizScores.length > 0
    ? Math.round(quizScores.reduce((s, q) => s + q.pct, 0) / quizScores.length)
    : 0

  // Syllabus progress
  let completedTopics = 0, totalTopics = 0
  const moduleProgress = syllabusProgress.map(mod => {
    const modCompleted = mod.topics.filter(t => t.completions.length > 0).length
    completedTopics += modCompleted
    totalTopics += mod.topics.length
    return {
      id: mod.id,
      title: mod.title,
      order: mod.order,
      total: mod.topics.length,
      completed: modCompleted,
      pct: mod.topics.length > 0 ? Math.round(modCompleted / mod.topics.length * 100) : 0,
      topics: mod.topics.map(t => ({
        id: t.id,
        title: t.title,
        order: t.order,
        isCompleted: t.completions.length > 0
      }))
    }
  })
  const overallProgress = totalTopics > 0
    ? Math.round(completedTopics / totalTopics * 100)
    : 0

  // Build activity feed
  const activityItems = []
  for (const q of recentActivity) {
    activityItems.push({
      type: 'QUIZ', icon: 'Brain', color: 'yellow',
      title: `Scored ${q.score}/${q.totalMarks} on ${q.quiz.title}`,
      subtitle: q.passed ? 'Passed' : 'Needs improvement',
      time: q.submittedAt
    })
  }
  activityItems.sort((a, b) => new Date(b.time) - new Date(a.time))

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true }
  })

  return {
    student: {
      name: user.name,
      enrollmentNo: profile.enrollmentNo,
      placementStatus: profile.placementStatus
    },
    batch: enrollment ? {
      id: enrollment.batch.id,
      name: enrollment.batch.name,
      courseName: enrollment.batch.course?.title,
      timing: enrollment.batch.timing,
      startDate: enrollment.batch.startDate,
      endDate: enrollment.batch.endDate
    } : null,
    attendance: { present, absent, late, total, percentage: attPct },
    assignments: { pending: pendingAssignments, overdue: overdueAssignments, total: assignments.length },
    quizzes: { avgScore, scores: quizScores, taken: quizScores.length },
    upcomingClasses,
    notifications: recentNotifs,
    syllabusProgress: { modules: moduleProgress, completed: completedTopics, total: totalTopics, percentage: overallProgress },
    nextMock,
    placements,
    activityFeed: activityItems.slice(0, 10)
  }
}

// ─── getCoursesService ────────────────────────────────────────────────────────
async function getCoursesService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const enrollments = await prisma.batchEnrollment.findMany({
    where: { studentId },
    include: {
      batch: {
        include: {
          course: {
            include: {
              syllabus: {
                include: { topics: { include: { completions: { where: { studentId } } } } }
              }
            }
          }
        }
      }
    }
  })

  return enrollments.map(e => {
    const course = e.batch.course
    const allTopics = course.syllabus.flatMap(m => m.topics)
    const completed = allTopics.filter(t => t.completions.length > 0).length
    const total     = allTopics.length
    const pct       = total > 0 ? Math.round(completed / total * 100) : 0
    return {
      courseId: course.id,
      batchId:  e.batch.id,
      enrolledAt: e.joinedAt,
      course: {
        id: course.id, title: course.title, slug: course.slug,
        description: course.description, duration: course.duration,
        level: course.level
      },
      batch: {
        id: e.batch.id, name: e.batch.name, mode: e.batch.mode,
        timing: e.batch.timing, startDate: e.batch.startDate, endDate: e.batch.endDate
      },
      progress: { completed, total, pct }
    }
  })
}

// ─── getCourseDetailService ───────────────────────────────────────────────────
async function getCourseDetailService(userId, courseId) {
  const profile = await getStudentProfile(userId)
  const enrollment = profile.enrollments.find(e => e.batch.course?.id === parseInt(courseId))
  if (!enrollment) throw new ApiError(403, 'Not enrolled in this course')

  const course = await prisma.course.findUnique({
    where: { id: parseInt(courseId) },
    include: {
      syllabus: { orderBy: { order: 'asc' }, include: { topics: { orderBy: { order: 'asc' } } } },
      materials: true,
      sessions: { orderBy: { order: 'asc' } },
      batches: { where: { id: enrollment.batch.id } }
    }
  })
  if (!course) throw new ApiError(404, 'Course not found')
  return course
}

// ─── getSyllabusService ───────────────────────────────────────────────────────
async function getSyllabusService(userId, courseId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const modules = await prisma.syllabusModule.findMany({
    where: { courseId: parseInt(courseId) },
    orderBy: { order: 'asc' },
    include: {
      topics: {
        orderBy: { order: 'asc' },
        include: { completions: { where: { studentId } } }
      }
    }
  })

  return modules.map(mod => {
    const completed = mod.topics.filter(t => t.completions.length > 0).length
    return {
      ...mod,
      progress: { completed, total: mod.topics.length, pct: mod.topics.length > 0 ? Math.round(completed / mod.topics.length * 100) : 0 },
      topics: mod.topics.map(t => ({ ...t, isCompleted: t.completions.length > 0 }))
    }
  })
}

// ─── getMaterialsService ──────────────────────────────────────────────────────
async function getMaterialsService(userId, courseId) {
  const profile = await getStudentProfile(userId)
  const enrollment = profile.enrollments.find(e => e.batch.course?.id === parseInt(courseId))
  if (!enrollment) throw new ApiError(403, 'Not enrolled in this course')
  const batchId = enrollment.batch.id

  return prisma.courseMaterial.findMany({
    where: {
      courseId: parseInt(courseId),
      OR: [{ batchId: null }, { batchId }]
    },
    orderBy: { uploadedAt: 'desc' }
  })
}

// ─── getSessionsService ───────────────────────────────────────────────────────
async function getSessionsService(userId, courseId) {
  const profile = await getStudentProfile(userId)
  const enrollment = profile.enrollments.find(e => e.batch.course?.id === parseInt(courseId))
  if (!enrollment) throw new ApiError(403, 'Not enrolled in this course')
  const batchId = enrollment.batch.id

  return prisma.recordedSession.findMany({
    where: {
      courseId: parseInt(courseId),
      OR: [{ batchId: null }, { batchId }]
    },
    orderBy: { order: 'asc' }
  })
}

// ─── getClassesService ────────────────────────────────────────────────────────
async function getClassesService(userId, status) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id
  const enrollment = profile.enrollments[0]
  if (!enrollment) return []
  const batchId = enrollment.batch.id

  const now = new Date()
  let where = { batchId }
  if (status === 'upcoming') {
    where.status = 'SCHEDULED'
    where.date = { gte: now }
  } else if (status === 'past') {
    where.OR = [{ date: { lt: now } }, { status: 'COMPLETED' }]
  }

  const classes = await prisma.dailyClass.findMany({
    where,
    orderBy: { date: status === 'upcoming' ? 'asc' : 'desc' },
    include: {
      topics: { select: { id: true, title: true } },
      attendances: { where: { studentId } }
    }
  })

  return classes.map(c => ({
    ...c,
    myAttendance: c.attendances[0]?.status || null
  }))
}

// ─── getClassDetailService ────────────────────────────────────────────────────
async function getClassDetailService(userId, classId) {
  const profile = await getStudentProfile(userId)
  const cls = await prisma.dailyClass.findUnique({
    where: { id: parseInt(classId) },
    include: {
      topics: true,
      attendances: { where: { studentId: profile.id } }
    }
  })
  if (!cls) throw new ApiError(404, 'Class not found')
  return { ...cls, myAttendance: cls.attendances[0]?.status || null }
}

// ─── getAttendanceService ─────────────────────────────────────────────────────
async function getAttendanceService(userId, month) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id
  const enrollment = profile.enrollments[0]
  if (!enrollment) return []
  const batchId = enrollment.batch.id

  let startDate, endDate
  if (month) {
    const [y, m] = month.split('-').map(Number)
    startDate = new Date(y, m - 1, 1)
    endDate   = new Date(y, m, 0, 23, 59, 59)
  } else {
    const now = new Date()
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }

  const classes = await prisma.dailyClass.findMany({
    where: { batchId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
    include: { attendances: { where: { studentId } } }
  })

  return classes.map(c => ({
    date: c.date,
    classId: c.id,
    classTitle: c.title,
    status: c.attendances[0]?.status || null,
    classStatus: c.status
  }))
}

// ─── getAttendanceSummaryService ──────────────────────────────────────────────
async function getAttendanceSummaryService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const grouped = await prisma.attendance.groupBy({
    by: ['status'],
    where: { studentId },
    _count: { status: true }
  })

  const map = {}
  for (const r of grouped) map[r.status] = r._count.status
  const present = map['PRESENT'] || 0
  const absent  = map['ABSENT'] || 0
  const total   = present + absent
  const pct     = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0

  // Streak calculation (consecutive present days)
  const recent = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { markedAt: 'desc' },
    take: 30,
    include: { class: { select: { date: true } } }
  })
  let streak = 0
  const now = new Date()
  for (const r of recent) {
    if (r.class?.date && new Date(r.class.date) > now) continue
    if (r.status === 'PRESENT') streak++
    else if (r.status === 'ABSENT') break
  }

  return { present, absent, late: 0, excused: 0, total, percentage: pct, streak }
}

// ─── getStudentAttendanceTrend ────────────────────────────────────────────────
async function getStudentAttendanceTrend(userId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) throw new ApiError(404, 'Profile not found')

  const attendances = await prisma.attendance.findMany({
    where: { studentId: profile.id },
    include: { class: { select: { date: true, batchId: true } } },
    orderBy: { class: { date: 'asc' } }
  })

  const weeklyMap = {}
  for (const a of attendances) {
    const date = new Date(a.class.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const key = weekStart.toISOString().split('T')[0]
    const label = 'W' + Math.ceil(date.getDate() / 7) + ' ' + date.toLocaleDateString('en-IN', { month: 'short' })
    if (!weeklyMap[key]) weeklyMap[key] = { week: label, present: 0, absent: 0, late: 0, total: 0 }
    weeklyMap[key][a.status.toLowerCase()]++
    weeklyMap[key].total++
  }

  const weeks = Object.entries(weeklyMap).slice(-8).map(([, v]) => ({
    ...v, pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0
  }))

  return weeks
}

// ─── getAssignmentsService ────────────────────────────────────────────────────
async function getAssignmentsService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id
  const enrollment = profile.enrollments[0]
  if (!enrollment) return []
  const batchId = enrollment.batch?.id

  const assignments = await prisma.assignment.findMany({
    where: { batchId },
    orderBy: { dueDate: 'asc' },
    include: {
      submissions: { where: { studentId } },
      batch: { select: { name: true } }
    }
  })

  return assignments.map(a => {
    const sub = a.submissions[0] || null
    const isOverdue = !sub && new Date(a.dueDate) < new Date()
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      batchName: a.batch.name,
      isOverdue,
      submission: sub ? {
        id: sub.id, fileUrl: sub.fileUrl, notes: sub.notes,
        grade: sub.grade, feedback: sub.feedback,
        status: sub.status, submittedAt: sub.submittedAt, gradedAt: sub.gradedAt
      } : null
    }
  })
}

// ─── submitAssignmentService ──────────────────────────────────────────────────
async function submitAssignmentService(userId, assignmentId, fileUrl, notes) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const assignment = await prisma.assignment.findUnique({ where: { id: parseInt(assignmentId) } })
  if (!assignment) throw new ApiError(404, 'Assignment not found')

  const isLate = new Date() > new Date(assignment.dueDate)

  const sub = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: parseInt(assignmentId), studentId } },
    update: { fileUrl, notes, status: isLate ? 'LATE' : 'SUBMITTED', submittedAt: new Date() },
    create: {
      assignmentId: parseInt(assignmentId), studentId,
      fileUrl, notes, status: isLate ? 'LATE' : 'SUBMITTED'
    }
  })
  return sub
}

// ─── getQuizzesService ────────────────────────────────────────────────────────
async function getQuizzesService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id
  const enrollment = profile.enrollments[0]
  const batchId  = enrollment?.batch?.id
  const courseId = enrollment?.batch?.courseId

  const where = { isPublished: true }
  if (batchId || courseId) {
    where.OR = []
    if (batchId)  where.OR.push({ batchId })
    if (courseId) where.OR.push({ courseId })
    where.OR.push({ batchId: null, courseId: null })
  }

  const quizzes = await prisma.quiz.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'asc' }],
    include: {
      questions: { select: { id: true } },
      attempts: { where: { studentId } }
    }
  })

  return quizzes.map(q => {
    const attempt = q.attempts[0] || null
    return {
      id: q.id, title: q.title, description: q.description,
      duration: q.duration, totalMarks: q.totalMarks, passMark: q.passMark,
      dueDate: q.dueDate, questionCount: q.questions.length,
      quizType: q.quizType, category: q.category, tags: q.tags, isFeatured: q.isFeatured,
      attempt: attempt ? {
        score: attempt.score, totalMarks: attempt.totalMarks,
        passed: attempt.passed, pct: Math.round(attempt.score / attempt.totalMarks * 100),
        submittedAt: attempt.submittedAt, timeTaken: attempt.timeTaken
      } : null
    }
  })
}

// ─── getQuizDetailService ──────────────────────────────────────────────────────
async function getQuizDetailService(userId, quizId) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId) },
    include: { questions: { orderBy: { order: 'asc' } } }
  })
  if (!quiz) throw new ApiError(404, 'Quiz not found')
  return {
    ...quiz,
    questions: quiz.questions.map(q => ({
      ...q,
      topic: q.topic,
      difficulty: q.difficulty,
      codeSnippet: q.codeSnippet,
      options: q.options
    }))
  }
}

// ─── submitQuizService ────────────────────────────────────────────────────────
async function submitQuizService(userId, quizId, answers, timeTaken) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const existing = await prisma.quizAttempt.findUnique({
    where: { quizId_studentId: { quizId: parseInt(quizId), studentId } }
  })
  if (existing) throw new ApiError(409, 'Quiz already attempted')

  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId) },
    include: { questions: { orderBy: { order: 'asc' } } }
  })
  if (!quiz) throw new ApiError(404, 'Quiz not found')

  let score = 0
  const breakdown = []
  const topicMap = {}

  for (const q of quiz.questions) {
    const selectedIdx = answers[`q${q.order}`] ?? answers[String(q.id)]
    const opts = q.options
    const correct = opts.findIndex(o => o.isCorrect === true)
    const isRight = parseInt(selectedIdx) === correct
    if (isRight) score += q.marks

    // Selected and correct option texts
    const selectedText = selectedIdx !== undefined && selectedIdx !== null && opts[parseInt(selectedIdx)]
      ? opts[parseInt(selectedIdx)].text : null
    const correctText = correct >= 0 ? opts[correct].text : null

    breakdown.push({
      questionId: q.id, text: q.text,
      selectedIdx: parseInt(selectedIdx), correctIdx: correct,
      selectedText, correctText,
      isCorrect: isRight, explanation: q.explanation,
      topic: q.topic, difficulty: q.difficulty
    })

    // Per-topic breakdown
    const topic = q.topic || 'General'
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 }
    topicMap[topic].total++
    if (isRight) topicMap[topic].correct++
  }

  const topicBreakdown = Object.entries(topicMap).reduce((acc, [topic, data]) => {
    acc[topic] = { ...data, pct: Math.round((data.correct / data.total) * 100) }
    return acc
  }, {})

  const passed = score >= quiz.passMark
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id, studentId,
      answers, score, totalMarks: quiz.totalMarks,
      passed, timeTaken: timeTaken || null,
      submittedAt: new Date(),
      topicBreakdown
    }
  })

  // Notification
  await prisma.notification.create({
    data: {
      userId,
      title: `Quiz Result: ${quiz.title}`,
      body: `You scored ${score}/${quiz.totalMarks} (${Math.round(score / quiz.totalMarks * 100)}%). ${passed ? 'Passed!' : 'Keep practicing!'}`,
      type: passed ? 'SUCCESS' : 'WARNING'
    }
  })

  return {
    score, totalMarks: quiz.totalMarks,
    percentage: Math.round(score / quiz.totalMarks * 100),
    passed, breakdown, topicBreakdown
  }
}

// ─── getQuizLeaderboard ───────────────────────────────────────────────────────
async function getQuizLeaderboard(quizId, currentUserId) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: parseInt(quizId), submittedAt: { not: null } },
    include: {
      student: {
        include: { user: { select: { name: true, profilePhoto: true, id: true } } }
      }
    },
    orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }],
    take: 20
  })

  // Find current user's student profile
  let currentStudentId = null
  if (currentUserId) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: currentUserId } })
    currentStudentId = profile?.id
  }

  const ranked = attempts.map((a, i) => ({
    rank: i + 1,
    name: a.student.user.name,
    profilePhoto: a.student.user.profilePhoto,
    score: a.score,
    totalMarks: a.totalMarks,
    pct: Math.round((a.score / a.totalMarks) * 100),
    timeTaken: a.timeTaken,
    passed: a.passed,
    submittedAt: a.submittedAt,
    isCurrentUser: currentStudentId !== null && a.studentId === currentStudentId
  }))

  // If current user not in top 20, get their rank
  let currentUserEntry = null
  if (currentStudentId && !ranked.find(r => r.isCurrentUser)) {
    const allAttempts = await prisma.quizAttempt.findMany({
      where: { quizId: parseInt(quizId), submittedAt: { not: null } },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }]
    })
    const idx = allAttempts.findIndex(a => a.studentId === currentStudentId)
    if (idx >= 0) {
      const a = allAttempts[idx]
      currentUserEntry = {
        rank: idx + 1,
        score: a.score,
        totalMarks: a.totalMarks,
        pct: Math.round((a.score / a.totalMarks) * 100),
        timeTaken: a.timeTaken,
        passed: a.passed,
        isCurrentUser: true
      }
    }
  }

  return { leaderboard: ranked, currentUserEntry }
}

// ─── getQuizAnalytics ─────────────────────────────────────────────────────────
async function getQuizAnalytics(userId) {
  const profile = await getStudentProfile(userId)
  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId: profile.id, submittedAt: { not: null } },
    include: {
      quiz: { select: { title: true, category: true, quizType: true, totalMarks: true } }
    },
    orderBy: { submittedAt: 'asc' }
  })

  if (!attempts.length) return { totalAttempts: 0, avgScore: 0, passRate: 0, bestScore: 0, avgTime: 0, trend: [], topicBreakdown: [], byType: {}, byCategory: {} }

  const totalAttempts = attempts.length
  const avgScore = Math.round(attempts.reduce((s, a) => s + (a.score / a.totalMarks) * 100, 0) / totalAttempts)
  const passRate = Math.round((attempts.filter(a => a.passed).length / totalAttempts) * 100)
  const bestScore = Math.max(...attempts.map(a => Math.round((a.score / a.totalMarks) * 100)))
  const timedAttempts = attempts.filter(a => a.timeTaken)
  const avgTime = timedAttempts.length > 0
    ? Math.round(timedAttempts.reduce((s, a) => s + a.timeTaken, 0) / timedAttempts.length)
    : 0

  const trend = attempts.slice(-10).map(a => ({
    quiz: a.quiz.title.substring(0, 18),
    score: Math.round((a.score / a.totalMarks) * 100),
    date: a.submittedAt
  }))

  // Merge topic breakdowns
  const topicMap = {}
  for (const a of attempts) {
    if (!a.topicBreakdown) continue
    for (const [topic, data] of Object.entries(a.topicBreakdown)) {
      if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 }
      topicMap[topic].correct += data.correct || 0
      topicMap[topic].total   += data.total   || 0
    }
  }
  const topicBreakdown = Object.entries(topicMap).map(([topic, d]) => ({
    topic, correct: d.correct, total: d.total,
    pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
  })).sort((a, b) => b.pct - a.pct)

  const byType = {}
  for (const a of attempts) {
    const t = a.quiz.quizType || 'MCQ'
    if (!byType[t]) byType[t] = { count: 0, totalPct: 0 }
    byType[t].count++
    byType[t].totalPct += Math.round((a.score / a.totalMarks) * 100)
  }
  Object.keys(byType).forEach(k => {
    byType[k].avg = Math.round(byType[k].totalPct / byType[k].count)
  })

  const byCategory = {}
  for (const a of attempts) {
    const cat = a.quiz.category || 'General'
    if (!byCategory[cat]) byCategory[cat] = { count: 0, totalPct: 0 }
    byCategory[cat].count++
    byCategory[cat].totalPct += Math.round((a.score / a.totalMarks) * 100)
  }
  Object.keys(byCategory).forEach(k => {
    byCategory[k].avg = Math.round(byCategory[k].totalPct / byCategory[k].count)
  })

  return { totalAttempts, avgScore, passRate, bestScore, avgTime, trend, topicBreakdown, byType, byCategory }
}

// ─── getInterviewPrepService ──────────────────────────────────────────────────
async function getInterviewPrepService({ category, difficulty, search, page = 1, limit = 20 } = {}) {
  const where = {}
  if (category)   where.category = { contains: category, mode: 'insensitive' }
  if (difficulty) where.difficulty = difficulty
  if (search) {
    where.OR = [
      { question: { contains: search, mode: 'insensitive' } },
      { answer:   { contains: search, mode: 'insensitive' } }
    ]
  }
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const [total, questions] = await Promise.all([
    prisma.interviewQuestion.count({ where }),
    prisma.interviewQuestion.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { category: 'asc' }
    })
  ])
  const categories = await prisma.interviewQuestion.groupBy({
    by: ['category'],
    _count: { category: true }
  })
  return {
    questions, total,
    page: pageNum, totalPages: Math.ceil(total / limitNum),
    categories: categories.map(c => ({ name: c.category, count: c._count.category }))
  }
}

// ─── getPlacementDataService ──────────────────────────────────────────────────
async function getPlacementDataService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const [mocks, updates] = await Promise.all([
    prisma.mockInterview.findMany({
      where: { studentId }, orderBy: { scheduledAt: 'desc' }
    }),
    prisma.placementUpdate.findMany({
      where: { studentId }, orderBy: { createdAt: 'desc' }
    })
  ])

  const rated  = mocks.filter(m => m.rating !== null)
  const avgRating = rated.length > 0
    ? Math.round(rated.reduce((s, m) => s + m.rating, 0) / rated.length * 10) / 10
    : 0

  return {
    status: profile.placementStatus,
    resumeUrl: profile.resumeUrl,
    linkedinUrl: profile.linkedinUrl,
    mockInterviews: mocks,
    placementUpdates: updates,
    stats: {
      totalMocks: mocks.length,
      completedMocks: mocks.filter(m => m.status === 'COMPLETED').length,
      upcomingMocks: mocks.filter(m => m.status === 'SCHEDULED').length,
      avgRating
    }
  }
}

// ─── getMockInterviewsService ─────────────────────────────────────────────────
async function getMockInterviewsService(userId) {
  const profile = await getStudentProfile(userId)
  return prisma.mockInterview.findMany({
    where: { studentId: profile.id },
    orderBy: { scheduledAt: 'desc' }
  })
}

// ─── getNotificationsService ──────────────────────────────────────────────────
async function getNotificationsService(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

// ─── markReadService ──────────────────────────────────────────────────────────
async function markReadService(userId, notifId) {
  const n = await prisma.notification.findFirst({
    where: { id: parseInt(notifId), userId }
  })
  if (!n) throw new ApiError(404, 'Notification not found')
  return prisma.notification.update({
    where: { id: parseInt(notifId) },
    data: { isRead: true }
  })
}

// ─── markAllReadService ───────────────────────────────────────────────────────
async function markAllReadService(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  })
}

// ─── getActivityFeedService ───────────────────────────────────────────────────
async function getActivityFeedService(userId) {
  const profile = await getStudentProfile(userId)
  const studentId = profile.id

  const [attendances, submissions, quizAttempts, placements] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { markedAt: 'desc' },
      take: 10,
      include: { class: { select: { title: true, date: true } } }
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: { assignment: { select: { title: true } } }
    }),
    prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: { quiz: { select: { title: true } } }
    }),
    prisma.placementUpdate.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  const items = []
  for (const a of attendances) {
    items.push({
      type: 'ATTENDANCE', icon: 'Calendar',
      color: a.status === 'PRESENT' ? 'green' : a.status === 'LATE' ? 'blue' : 'yellow',
      title: a.status === 'PRESENT' ? `Attended ${a.class.title}` : `Missed ${a.class.title}`,
      subtitle: a.status,
      time: a.markedAt || a.class.date
    })
  }
  for (const s of submissions) {
    items.push({
      type: 'ASSIGNMENT', icon: 'ClipboardList', color: 'blue',
      title: s.status === 'GRADED'
        ? `Assignment graded: ${s.assignment.title} — ${s.grade}/100`
        : `Submitted: ${s.assignment.title}`,
      subtitle: s.status,
      time: s.gradedAt || s.submittedAt
    })
  }
  for (const q of quizAttempts) {
    items.push({
      type: 'QUIZ', icon: 'Brain', color: 'yellow',
      title: `Scored ${q.score}/${q.totalMarks} on ${q.quiz.title}`,
      subtitle: q.passed ? 'Passed' : 'Needs improvement',
      time: q.submittedAt
    })
  }
  for (const p of placements) {
    items.push({
      type: 'PLACEMENT', icon: 'Briefcase', color: 'green',
      title: p.title, subtitle: p.type,
      time: p.createdAt
    })
  }

  items.sort((a, b) => new Date(b.time) - new Date(a.time))
  return items.slice(0, 20)
}

// ─── getPlacementHubService ───────────────────────────────────────────────────
async function getPlacementHubService(userId) {
  const profile = await getStudentProfile(userId)

  const [mockInterviews, placementUpdates, skills, resumeData, driveApplications] = await Promise.all([
    prisma.mockInterview.findMany({
      where: { studentId: profile.id },
      orderBy: { scheduledAt: 'desc' }
    }),
    prisma.placementUpdate.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.studentSkill.findMany({
      where: { studentId: profile.id },
      orderBy: { proficiency: 'desc' }
    }),
    prisma.resumeData.findUnique({ where: { studentId: profile.id } }),
    prisma.driveApplication.findMany({
      where: { studentId: profile.id },
      include: { drive: true },
      orderBy: { appliedAt: 'desc' }
    })
  ])

  const completed = mockInterviews.filter(m => m.status === 'COMPLETED')
  const rated = completed.filter(m => m.rating)
  const avgRating = rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : 0
  const avgRatingRounded = Math.round(avgRating * 10) / 10

  const hasResume = !!(resumeData?.summary)
  const skillScore = Math.min(skills.length / 8, 1) * 25
  const mockScore = Math.min(completed.length / 3, 1) * 25
  const ratingScore = (avgRating / 5) * 25
  const resumeScore = hasResume ? 25 : 0
  const readiness = Math.round(resumeScore + skillScore + mockScore + ratingScore)

  return {
    status: profile.placementStatus,
    resumeUrl: profile.resumeUrl,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    resumeData,
    skills,
    mockInterviews,
    placementUpdates,
    driveApplications,
    stats: {
      totalMocks: mockInterviews.length,
      completedMocks: completed.length,
      upcomingMocks: mockInterviews.filter(m => m.status === 'SCHEDULED').length,
      avgRating: avgRatingRounded,
      totalApplications: driveApplications.length,
      shortlisted: driveApplications.filter(a => a.status === 'SHORTLISTED').length,
      selected: driveApplications.filter(a => a.status === 'SELECTED').length,
    },
    readiness
  }
}

// ─── updatePlacementProfileService ───────────────────────────────────────────
async function updatePlacementProfileService(userId, data) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) throw new ApiError(404, 'Profile not found')
  const allowed = ['placementStatus', 'linkedinUrl', 'githubUrl', 'resumeUrl']
  const update = {}
  for (const k of allowed) if (data[k] !== undefined) update[k] = data[k]
  if (data.placementStatus) {
    await prisma.placementUpdate.create({
      data: { studentId: profile.id, title: 'Status Updated', body: `Changed status to ${data.placementStatus}`, type: 'UPDATE' }
    })
  }
  return prisma.studentProfile.update({ where: { id: profile.id }, data: update })
}

// ─── getResumeDataService ─────────────────────────────────────────────────────
async function getResumeDataService(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true, phone: true } }, resumeData: true }
  })
  if (!profile) throw new ApiError(404, 'Profile not found')
  return profile.resumeData || {
    headline: '', summary: '', phone: profile.user.phone || '', email: profile.user.email,
    linkedinUrl: profile.linkedinUrl || '', githubUrl: profile.githubUrl || '',
    portfolioUrl: '', location: '', education: [], experience: [], projects: [], certifications: [], languages: []
  }
}

// ─── saveResumeDataService ────────────────────────────────────────────────────
async function saveResumeDataService(userId, data) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) throw new ApiError(404, 'Profile not found')
  const fields = ['headline','summary','phone','email','linkedinUrl','githubUrl','portfolioUrl','location','education','experience','projects','certifications','languages']
  const update = {}
  for (const f of fields) if (data[f] !== undefined) update[f] = data[f]
  return prisma.resumeData.upsert({
    where: { studentId: profile.id },
    update,
    create: { studentId: profile.id, ...update }
  })
}

// ─── getSkillsService ─────────────────────────────────────────────────────────
async function getSkillsService(userId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) throw new ApiError(404, 'Profile not found')
  return prisma.studentSkill.findMany({
    where: { studentId: profile.id },
    orderBy: [{ category: 'asc' }, { proficiency: 'desc' }]
  })
}

// ─── addSkillService ──────────────────────────────────────────────────────────
async function addSkillService(userId, { name, category, proficiency, yearsExp }) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) throw new ApiError(404, 'Profile not found')
  return prisma.studentSkill.create({
    data: {
      studentId: profile.id,
      name,
      category: category || 'Programming',
      proficiency: parseInt(proficiency) || 3,
      yearsExp: yearsExp ? parseFloat(yearsExp) : null
    }
  })
}

// ─── updateSkillService ───────────────────────────────────────────────────────
async function updateSkillService(userId, skillId, data) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  const skill = await prisma.studentSkill.findFirst({ where: { id: parseInt(skillId), studentId: profile.id } })
  if (!skill) throw new ApiError(404, 'Skill not found')
  return prisma.studentSkill.update({
    where: { id: parseInt(skillId) },
    data: {
      proficiency: data.proficiency ? parseInt(data.proficiency) : undefined,
      yearsExp: data.yearsExp !== undefined ? (data.yearsExp ? parseFloat(data.yearsExp) : null) : undefined
    }
  })
}

// ─── deleteSkillService ───────────────────────────────────────────────────────
async function deleteSkillService(userId, skillId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  await prisma.studentSkill.deleteMany({ where: { id: parseInt(skillId), studentId: profile.id } })
  return { success: true }
}

// ─── getCompanyDrivesService ──────────────────────────────────────────────────
async function getCompanyDrivesService(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      enrollments: { include: { batch: true } },
      driveApplications: { select: { driveId: true, status: true } }
    }
  })
  if (!profile) throw new ApiError(404, 'Profile not found')
  const batchIds = profile.enrollments.map(e => e.batchId)
  const drives = await prisma.companyDrive.findMany({
    where: { OR: [{ batchId: null }, { batchId: { in: batchIds } }], status: { not: 'CLOSED' } },
    include: { _count: { select: { applications: true } } },
    orderBy: { driveDate: 'asc' }
  })
  const appliedMap = {}
  for (const a of profile.driveApplications) appliedMap[a.driveId] = a.status
  return drives.map(d => ({ ...d, hasApplied: !!appliedMap[d.id], applicationStatus: appliedMap[d.id] || null }))
}

// ─── applyToDriveService ──────────────────────────────────────────────────────
async function applyToDriveService(userId, driveId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) throw new ApiError(404, 'Profile not found')
  return prisma.driveApplication.create({ data: { studentId: profile.id, driveId: parseInt(driveId) } })
}

// ─── getMockInterviewAnalyticsService ─────────────────────────────────────────
async function getMockInterviewAnalyticsService(userId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!profile) return { trend: [], avgRating: 0, totalCompleted: 0, topStrengths: [], topImprovements: [] }
  const interviews = await prisma.mockInterview.findMany({
    where: { studentId: profile.id, status: 'COMPLETED' },
    orderBy: { scheduledAt: 'asc' }
  })
  if (!interviews.length) return { trend: [], avgRating: 0, totalCompleted: 0, topStrengths: [], topImprovements: [] }

  const trend = interviews.map(m => ({
    date: m.scheduledAt,
    rating: m.rating || 0,
    label: new Date(m.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }))

  const allStrengths = interviews.flatMap(m => m.strengths || [])
  const allImprovements = interviews.flatMap(m => m.improvements || [])
  const countOccurrences = (arr) => {
    const map = {}
    for (const item of arr) map[item] = (map[item] || 0) + 1
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([text, count]) => ({ text, count }))
  }

  const rated = interviews.filter(m => m.rating)
  const avgRating = rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : 0

  return {
    trend,
    avgRating: Math.round(avgRating * 10) / 10,
    totalCompleted: interviews.length,
    topStrengths: countOccurrences(allStrengths),
    topImprovements: countOccurrences(allImprovements)
  }
}

module.exports = {
  getDashboardService,
  getCoursesService,
  getCourseDetailService,
  getSyllabusService,
  getMaterialsService,
  getSessionsService,
  getClassesService,
  getClassDetailService,
  getAttendanceService,
  getAttendanceSummaryService,
  getStudentAttendanceTrend,
  getAssignmentsService,
  submitAssignmentService,
  getQuizzesService,
  getQuizDetailService,
  submitQuizService,
  getQuizLeaderboard,
  getQuizAnalytics,
  getInterviewPrepService,
  getPlacementDataService,
  getMockInterviewsService,
  getNotificationsService,
  markReadService,
  markAllReadService,
  getActivityFeedService,
  getPlacementHubService,
  updatePlacementProfileService,
  getResumeDataService,
  saveResumeDataService,
  getSkillsService,
  addSkillService,
  updateSkillService,
  deleteSkillService,
  getCompanyDrivesService,
  applyToDriveService,
  getMockInterviewAnalyticsService
}
