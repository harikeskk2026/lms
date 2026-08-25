const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const ApiError = require('../utils/ApiError')

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
async function getDashboardStats() {
  const now = new Date()
  const monthStart = startOfMonth(now)

  const [
    totalStudents,
    activeStudents,
    newThisMonth,
    totalBatches,
    activeBatches,
    placementCounts,
    ungradedSubs,
    recentStudents,
    recentSubs,
    recentAttempts,
    recentMocks,
    weekAttendance,
    batchesRaw,
    monthEnrollments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: monthStart } } }),
    prisma.batch.count(),
    prisma.batch.count({ where: { isActive: true } }),
    prisma.studentProfile.groupBy({ by: ['placementStatus'], _count: { placementStatus: true } }),
    prisma.assignmentSubmission.count({ where: { status: 'SUBMITTED', grade: null } }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.assignmentSubmission.findMany({
      where: { status: { in: ['SUBMITTED', 'GRADED'] } },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: { student: { include: { user: { select: { name: true } } } }, assignment: { select: { title: true } } },
    }),
    prisma.quizAttempt.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: { student: { include: { user: { select: { name: true } } } }, quiz: { select: { title: true } } },
    }),
    prisma.mockInterview.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      include: { student: { include: { user: { select: { name: true } } } } },
    }),
    // last 7 days attendance
    prisma.attendance.findMany({
      where: { class: { date: { gte: new Date(Date.now() - 7 * 86400000) } } },
      include: { class: { select: { date: true } } },
    }),
    // batch performance
    prisma.batch.findMany({
      where: { isActive: true },
      include: {
        course: { select: { title: true } },
        enrollments: { include: { student: { include: { attendances: true, quizAttempts: true } } } },
        _count: { select: { enrollments: true } },
      },
      take: 10,
    }),
    // monthly enrollments last 6 months
    prisma.user.findMany({
      where: {
        role: 'STUDENT',
        createdAt: { gte: new Date(new Date().setMonth(now.getMonth() - 5, 1)) },
      },
      select: { createdAt: true },
    }),
  ])

  // Placement breakdown
  const placementBreakdown = { SEEKING: 0, INTERVIEWING: 0, PLACED: 0, NOT_SEEKING: 0 }
  for (const p of placementCounts) placementBreakdown[p.placementStatus] = p._count.placementStatus
  const totalPlacement = Object.values(placementBreakdown).reduce((a, b) => a + b, 0)

  // Monthly enrollments (last 6 months)
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      monthNum: d.getMonth(),
      count: 0,
    })
  }
  for (const u of monthEnrollments) {
    const d = new Date(u.createdAt)
    const m = months.find(x => x.monthNum === d.getMonth() && x.year === d.getFullYear())
    if (m) m.count++
  }
  const monthlyEnrollments = months.map(({ month, count }) => ({ month, count }))

  // Batch performance
  const batchPerformance = batchesRaw.map(b => {
    const students = b.enrollments.map(e => e.student)
    const allAtt = students.flatMap(s => s.attendances)
    const present = allAtt.filter(a => a.status === 'PRESENT').length
    const avgAttendance = allAtt.length ? Math.round((present / allAtt.length) * 100) : 0
    const allQuizzes = students.flatMap(s => s.quizAttempts)
    const avgQuizScore = allQuizzes.length
      ? Math.round(allQuizzes.reduce((a, q) => a + (q.score / q.totalMarks) * 100, 0) / allQuizzes.length)
      : 0
    return {
      batchId: b.id,
      name: b.name,
      course: b.course.title,
      studentCount: b._count.enrollments,
      avgAttendance,
      avgQuizScore,
    }
  })

  // Avg attendance across active batches
  const avgAttendance = batchPerformance.length
    ? Math.round(batchPerformance.reduce((a, b) => a + b.avgAttendance, 0) / batchPerformance.length)
    : 0

  // Placed students count
  const placedStudents = placementBreakdown.PLACED
  const seekingStudents = placementBreakdown.SEEKING

  // Recent Activity (merged, sorted by date)
  const activity = []
  for (const s of recentStudents) {
    activity.push({ type: 'NEW_STUDENT', label: `${s.name} joined`, time: s.createdAt })
  }
  for (const s of recentSubs) {
    activity.push({ type: 'SUBMISSION', label: `${s.student?.user?.name || 'Student'} submitted ${s.assignment?.title}`, time: s.submittedAt })
  }
  for (const a of recentAttempts) {
    activity.push({ type: 'QUIZ_ATTEMPT', label: `${a.student?.user?.name || 'Student'} attempted ${a.quiz?.title}`, time: a.submittedAt || a.startedAt })
  }
  for (const m of recentMocks) {
    activity.push({ type: 'MOCK_INTERVIEW', label: `Mock interview for ${m.student?.user?.name || 'Student'}`, time: m.scheduledAt })
  }
  activity.sort((a, b) => new Date(b.time) - new Date(a.time))
  const recentActivity = activity.slice(0, 10).map(a => ({ ...a, timeAgo: timeAgo(a.time) }))

  // Weekly attendance (last 7 days)
  const dayMap = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().split('T')[0]
    dayMap[key] = { date: key, present: 0, absent: 0, late: 0 }
  }
  for (const a of weekAttendance) {
    const key = new Date(a.class.date).toISOString().split('T')[0]
    if (dayMap[key]) {
      if (a.status === 'PRESENT') dayMap[key].present++
      else if (a.status === 'ABSENT') dayMap[key].absent++
      else if (a.status === 'LATE') dayMap[key].late++
    }
  }
  const weeklyAttendance = Object.values(dayMap)

  return {
    totalStudents,
    activeStudents,
    newThisMonth,
    totalBatches,
    activeBatches,
    avgAttendance,
    placedStudents,
    seekingStudents,
    totalAssignmentsPending: ungradedSubs,
    monthlyEnrollments,
    batchPerformance,
    recentActivity,
    placementBreakdown,
    weeklyAttendance,
  }
}

// ─── Students ─────────────────────────────────────────────────────────────────
async function getStudents({ search = '', batchId, status, placementStatus, page = 1, limit = 20 } = {}) {
  page  = parseInt(page)  || 1
  limit = parseInt(limit) || 20
  const where = { role: 'STUDENT' }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false

  const profileWhere = {}
  if (placementStatus) profileWhere.placementStatus = placementStatus
  if (batchId) {
    profileWhere.enrollments = { some: { batchId: parseInt(batchId) } }
  }

  const [total, students] = await Promise.all([
    prisma.user.count({ where: { ...where, studentProfile: profileWhere } }),
    prisma.user.findMany({
      where: { ...where, studentProfile: profileWhere },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              include: { batch: { include: { course: { select: { title: true } } } } },
              take: 1,
              orderBy: { joinedAt: 'desc' },
            },
            attendances: { select: { status: true } },
          },
        },
      },
    }),
  ])

  const enriched = students.map(s => {
    const att = s.studentProfile?.attendances || []
    const present = att.filter(a => a.status === 'PRESENT').length
    const attendancePct = att.length ? Math.round((present / att.length) * 100) : 0
    return { ...s, attendancePct }
  })

  return { students: enriched, total, page, totalPages: Math.ceil(total / limit) }
}

async function createStudent({ name, email, phone, password, batchId } = {}) {
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) throw new ApiError(409, 'Email already in use')

  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: { name, email, phone: phone || null, passwordHash, role: 'STUDENT', isActive: true, isEmailVerified: true },
    })
    const year = new Date().getFullYear()
    const enrollmentNo = `CL-${year}-${String(user.id).padStart(4, '0')}`
    const profile = await tx.studentProfile.create({
      data: { userId: user.id, enrollmentNo },
    })
    if (batchId) {
      await tx.batchEnrollment.create({ data: { batchId: parseInt(batchId), studentId: profile.id } })
    }
    return { ...user, studentProfile: profile }
  })
}

async function getStudentDetail(studentId) {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(studentId) },
    include: {
      studentProfile: {
        include: {
          enrollments: {
            include: { batch: { include: { course: true } } },
          },
          attendances: { include: { class: true } },
          submissions: { include: { assignment: true } },
          quizAttempts: { include: { quiz: { select: { title: true, totalMarks: true } } } },
          mockInterviews: true,
          placementUpdates: { orderBy: { createdAt: 'desc' } },
        },
      },
      notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!user) throw new ApiError(404, 'Student not found')

  const att = user.studentProfile?.attendances || []
  const present = att.filter(a => a.status === 'PRESENT').length
  const absent = att.filter(a => a.status === 'ABSENT').length
  const late = att.filter(a => a.status === 'LATE').length
  const attendanceSummary = {
    present, absent, late,
    total: att.length,
    percentage: att.length ? Math.round((present / att.length) * 100) : 0,
  }

  return { ...user, attendanceSummary }
}

async function updateStudent(studentId, data) {
  const { name, phone, address, qualification, linkedinUrl, githubUrl, placementStatus } = data
  return prisma.$transaction(async tx => {
    const userUpdate = {}
    if (name) userUpdate.name = name
    if (phone !== undefined) userUpdate.phone = phone
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({ where: { id: parseInt(studentId) }, data: userUpdate })
    }
    const profileUpdate = {}
    if (address !== undefined) profileUpdate.address = address
    if (qualification !== undefined) profileUpdate.qualification = qualification
    if (linkedinUrl !== undefined) profileUpdate.linkedinUrl = linkedinUrl
    if (githubUrl !== undefined) profileUpdate.githubUrl = githubUrl
    if (placementStatus) profileUpdate.placementStatus = placementStatus
    if (Object.keys(profileUpdate).length > 0) {
      await tx.studentProfile.update({ where: { userId: parseInt(studentId) }, data: profileUpdate })
    }
    return tx.user.findUnique({
      where: { id: parseInt(studentId) },
      include: { studentProfile: true },
    })
  })
}

async function toggleStudentStatus(studentId) {
  const user = await prisma.user.findUnique({ where: { id: parseInt(studentId) } })
  if (!user) throw new ApiError(404, 'Student not found')
  return prisma.user.update({
    where: { id: parseInt(studentId) },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  })
}

async function resetStudentPassword(studentId, newPassword) {
  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: parseInt(studentId) }, data: { passwordHash: hash } })
  await prisma.refreshToken.deleteMany({ where: { userId: parseInt(studentId) } })
  return { success: true }
}

// ─── Batches ──────────────────────────────────────────────────────────────────
async function getBatches({ courseId, isActive } = {}) {
  const where = {}
  if (courseId) where.courseId = parseInt(courseId)
  if (isActive === 'true' || isActive === true) where.isActive = true
  if (isActive === 'false' || isActive === false) where.isActive = false

  const batches = await prisma.batch.findMany({
    where,
    include: {
      course: true,
      _count: { select: { enrollments: true, classes: true } },
    },
    orderBy: { startDate: 'desc' },
  })
  // Attach trainer info
  const trainerIds = batches.filter(b => b.trainerId).map(b => b.trainerId)
  const trainers = trainerIds.length
    ? await prisma.user.findMany({ where: { id: { in: trainerIds } }, select: { id: true, name: true, email: true } })
    : []
  const trainerMap = Object.fromEntries(trainers.map(t => [t.id, t]))
  return batches.map(b => ({ ...b, trainer: b.trainerId ? trainerMap[b.trainerId] || null : null }))
}

async function createBatch(data) {
  const { name, courseId, trainerId, startDate, endDate, timing, mode, maxStudents } = data
  return prisma.batch.create({
    data: {
      name,
      courseId: parseInt(courseId),
      trainerId: trainerId ? parseInt(trainerId) : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      timing: timing || null,
      mode: mode || 'ONLINE',
      maxStudents: maxStudents ? parseInt(maxStudents) : 30,
      isActive: true,
    },
    include: { course: true },
  })
}

async function getBatchDetail(batchId) {
  const batch = await prisma.batch.findUnique({
    where: { id: parseInt(batchId) },
    include: {
      course: true,
      enrollments: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true, isActive: true } },
              attendances: { select: { status: true } },
              quizAttempts: { select: { score: true, totalMarks: true } },
            },
          },
        },
      },
      classes: { orderBy: { date: 'asc' }, include: { attendances: true } },
      assignments: { include: { _count: { select: { submissions: true } } } },
    },
  })
  if (!batch) throw new ApiError(404, 'Batch not found')

  // Attach trainer info
  let trainer = null
  if (batch.trainerId) {
    trainer = await prisma.user.findUnique({
      where: { id: batch.trainerId },
      select: { id: true, name: true, email: true },
    })
  }

  const enrichedEnrollments = batch.enrollments.map(e => {
    const att = e.student.attendances
    const present = att.filter(a => a.status === 'PRESENT').length
    const attPct = att.length ? Math.round((present / att.length) * 100) : 0
    const quizzes = e.student.quizAttempts
    const avgQuiz = quizzes.length
      ? Math.round(quizzes.reduce((a, q) => a + (q.score / q.totalMarks) * 100, 0) / quizzes.length)
      : 0
    return { ...e, attendancePct: attPct, avgQuizScore: avgQuiz }
  })

  return { ...batch, trainer, enrollments: enrichedEnrollments }
}

async function updateBatch(batchId, data) {
  const updateData = {}
  const allowed = ['name', 'timing', 'mode', 'maxStudents', 'isActive', 'meetLink']
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key]
  }
  if (data.startDate) updateData.startDate = new Date(data.startDate)
  if (data.endDate) updateData.endDate = new Date(data.endDate)
  if (data.trainerId) updateData.trainerId = parseInt(data.trainerId)
  return prisma.batch.update({ where: { id: parseInt(batchId) }, data: updateData })
}

async function enrollStudent(batchId, studentId) {
  const batch = await prisma.batch.findUnique({
    where: { id: parseInt(batchId) },
    include: { _count: { select: { enrollments: true } } },
  })
  if (!batch) throw new ApiError(404, 'Batch not found')
  if (batch._count.enrollments >= batch.maxStudents) {
    throw new ApiError(400, 'Batch is full')
  }
  const profile = await prisma.studentProfile.findUnique({ where: { userId: parseInt(studentId) } })
  if (!profile) throw new ApiError(404, 'Student profile not found')
  return prisma.batchEnrollment.create({ data: { batchId: parseInt(batchId), studentId: profile.id } })
}

async function removeStudentFromBatch(batchId, studentId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId: parseInt(studentId) } })
  if (!profile) throw new ApiError(404, 'Student profile not found')
  await prisma.batchEnrollment.delete({
    where: { batchId_studentId: { batchId: parseInt(batchId), studentId: profile.id } },
  })
  return { success: true }
}

// ─── Courses ──────────────────────────────────────────────────────────────────
// Course list/create now served by the Java API (api/); materials/syllabus/sessions
// below still operate on courses that already exist in this database.

async function addMaterial(courseId, { title, type, fileUrl, fileSize, batchId }) {
  return prisma.courseMaterial.create({
    data: {
      courseId: parseInt(courseId),
      title,
      type: type || 'PDF',
      fileUrl,
      fileSize: fileSize || null,
      batchId: batchId ? parseInt(batchId) : null,
    },
  })
}

async function deleteMaterial(materialId) {
  return prisma.courseMaterial.delete({ where: { id: parseInt(materialId) } })
}

async function addRecordedSession(courseId, data) {
  return prisma.recordedSession.create({
    data: {
      courseId: parseInt(courseId),
      title: data.title,
      videoUrl: data.videoUrl || data.youtubeUrl || '',
      duration: data.duration || null,
      classDate: data.classDate ? new Date(data.classDate) : null,
      batchId: data.batchId ? parseInt(data.batchId) : null,
    },
  })
}

async function addSyllabusModule(courseId, { title, order }) {
  return prisma.syllabusModule.create({ data: { courseId: parseInt(courseId), title, order: parseInt(order) || 0 } })
}

async function addSyllabusTopic(moduleId, { title, order }) {
  return prisma.syllabusTopic.create({ data: { moduleId: parseInt(moduleId), title, order: parseInt(order) || 0 } })
}

// ─── Classes ──────────────────────────────────────────────────────────────────
async function getClasses({ batchId, date, status } = {}) {
  const where = {}
  if (batchId) where.batchId = parseInt(batchId)
  if (status) where.status = status
  if (date) {
    const d = new Date(date)
    where.date = {
      gte: new Date(d.setHours(0, 0, 0, 0)),
      lte: new Date(d.setHours(23, 59, 59, 999)),
    }
  }
  return prisma.dailyClass.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      batch: { include: { course: { select: { title: true } } } },
      _count: { select: { topics: true, attendances: true } },
    },
  })
}

async function createClass(data) {
  return prisma.dailyClass.create({
    data: {
      batchId: parseInt(data.batchId),
      date: new Date(data.date),
      title: data.title,
      notes: data.notes || null,
      meetLink: data.meetLink || null,
      status: data.status || 'SCHEDULED',
    },
  })
}

async function updateClass(classId, data) {
  const updateData = {}
  const allowed = ['title', 'notes', 'meetLink', 'status', 'recordingUrl']
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key]
  }
  if (data.date) updateData.date = new Date(data.date)
  return prisma.dailyClass.update({ where: { id: parseInt(classId) }, data: updateData })
}

// ─── Attendance ───────────────────────────────────────────────────────────────
async function getAttendanceSheet(classId) {
  const cls = await prisma.dailyClass.findUnique({
    where: { id: parseInt(classId) },
    include: {
      batch: {
        include: {
          enrollments: {
            include: {
              student: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
        },
      },
      attendances: true,
    },
  })
  if (!cls) throw new ApiError(404, 'Class not found')

  const students = cls.batch.enrollments.map(e => {
    const att = cls.attendances.find(a => a.studentId === e.studentId)
    return {
      studentId: e.studentId,
      userId: e.student.userId,
      name: e.student.user.name,
      email: e.student.user.email,
      status: att?.status || 'ABSENT',
      markedAt: att?.markedAt || null,
    }
  })

  return { class: { ...cls, attendances: undefined }, students }
}

async function markAttendance(classId, records) {
  const ops = records.map(({ studentId, status }) =>
    prisma.attendance.upsert({
      where: { studentId_classId: { studentId: parseInt(studentId), classId: parseInt(classId) } },
      update: { status, markedAt: new Date() },
      create: { studentId: parseInt(studentId), classId: parseInt(classId), status, markedAt: new Date() },
    })
  )
  return Promise.all(ops)
}

// ─── Attendance Analytics ──────────────────────────────────────────────────────

async function getAttendanceOverview() {
  const batches = await prisma.batch.findMany({
    where: { isActive: true },
    include: {
      course: { select: { title: true } },
      enrollments: {
        include: {
          student: {
            include: {
              attendances: {
                include: { class: { select: { batchId: true } } }
              }
            }
          }
        }
      },
      classes: { where: { status: 'COMPLETED' }, select: { id: true, date: true } },
      _count: { select: { enrollments: true, classes: true } }
    }
  })

  return batches.map(batch => {
    const totalClasses = batch.classes.length
    let totalPresent = 0, totalAbsent = 0, totalLate = 0
    const studentStats = batch.enrollments.map(e => {
      const batchAtt = e.student.attendances.filter(a => a.class?.batchId === batch.id)
      const present = batchAtt.filter(a => a.status === 'PRESENT').length
      const absent  = batchAtt.filter(a => a.status === 'ABSENT').length
      const late    = batchAtt.filter(a => a.status === 'LATE').length
      const total   = batchAtt.length
      const pct     = total > 0 ? Math.round((present / total) * 100) : 0
      totalPresent += present; totalAbsent += absent; totalLate += late
      return { studentId: e.studentId, present, absent, late, total, pct }
    })
    const totalStudents = batch.enrollments.length
    const avgAttendance = studentStats.length > 0
      ? Math.round(studentStats.reduce((s, x) => s + x.pct, 0) / studentStats.length)
      : 0
    const lowAttendanceCount = studentStats.filter(s => s.pct < 75 && s.total > 0).length
    return {
      batchId: batch.id,
      batchName: batch.name,
      course: batch.course.title,
      totalStudents,
      totalClasses,
      avgAttendance,
      lowAttendanceCount,
      presentToday: 0,
      totalPresent,
      totalAbsent,
      totalLate
    }
  })
}

async function getAttendanceAnalytics({ batchId, days } = {}) {
  // Build where clause — only filter by date when days is explicitly provided
  // Default: query all completed classes (works with seeded historical data)
  const where = { status: 'COMPLETED' }
  if (days) {
    const since = new Date()
    since.setDate(since.getDate() - parseInt(days))
    where.date = { gte: since }
  }
  if (batchId) where.batchId = parseInt(batchId)

  const classes = await prisma.dailyClass.findMany({
    where,
    include: {
      attendances: { select: { status: true } },
      batch: { select: { name: true, course: { select: { title: true } } } }
    },
    orderBy: { date: 'asc' }
  })

  const dailyTrend = classes.map(cls => {
    const total   = cls.attendances.length
    const present = cls.attendances.filter(a => a.status === 'PRESENT').length
    const absent  = cls.attendances.filter(a => a.status === 'ABSENT').length
    const late    = cls.attendances.filter(a => a.status === 'LATE').length
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0
    return {
      date: cls.date.toISOString().split('T')[0],
      label: cls.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      classTitle: cls.title,
      batchName: cls.batch.name,
      present, absent, late, total, pct
    }
  })

  const weeklyMap = {}
  for (const d of dailyTrend) {
    const date = new Date(d.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const key = weekStart.toISOString().split('T')[0]
    if (!weeklyMap[key]) weeklyMap[key] = { week: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), present: 0, absent: 0, late: 0, total: 0 }
    weeklyMap[key].present += d.present
    weeklyMap[key].absent  += d.absent
    weeklyMap[key].late    += d.late
    weeklyMap[key].total   += d.total
  }
  const weeklyTrend = Object.values(weeklyMap).map(w => ({
    ...w, pct: w.total > 0 ? Math.round((w.present / w.total) * 100) : 0
  }))

  const monthlyMap = {}
  for (const d of dailyTrend) {
    const key = d.date.substring(0, 7)
    const label = new Date(d.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { month: label, present: 0, absent: 0, late: 0, total: 0 }
    monthlyMap[key].present += d.present
    monthlyMap[key].absent  += d.absent
    monthlyMap[key].late    += d.late
    monthlyMap[key].total   += d.total
  }
  const monthlyTrend = Object.values(monthlyMap).map(m => ({
    ...m, pct: m.total > 0 ? Math.round((m.present / m.total) * 100) : 0
  }))

  const totalPresent = dailyTrend.reduce((s, d) => s + d.present, 0)
  const totalAbsent  = dailyTrend.reduce((s, d) => s + d.absent, 0)
  const totalLate    = dailyTrend.reduce((s, d) => s + d.late, 0)
  const totalAll     = dailyTrend.reduce((s, d) => s + d.total, 0)
  const overallPct   = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0

  return { dailyTrend, weeklyTrend, monthlyTrend, overallPct, totalPresent, totalAbsent, totalLate, totalAll }
}

async function getLowAttendanceStudents({ threshold = 75, batchId } = {}) {
  const where = {}
  if (batchId) where.batchId = parseInt(batchId)

  const enrollments = await prisma.batchEnrollment.findMany({
    where,
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          attendances: {
            include: { class: { select: { batchId: true, date: true } } }
          }
        }
      },
      batch: { include: { course: { select: { title: true } } } }
    }
  })

  const results = []
  for (const e of enrollments) {
    const batchAtt = e.student.attendances.filter(a => a.class?.batchId === e.batchId)
    const total   = batchAtt.length
    if (total < 3) continue
    const present = batchAtt.filter(a => a.status === 'PRESENT').length
    const late    = batchAtt.filter(a => a.status === 'LATE').length
    const absent  = batchAtt.filter(a => a.status === 'ABSENT').length
    const pct     = Math.round((present / total) * 100)
    if (pct < parseFloat(threshold)) {
      results.push({
        studentId:    e.studentId,
        userId:       e.student.userId,
        name:         e.student.user.name,
        email:        e.student.user.email,
        phone:        e.student.user.phone,
        enrollmentNo: e.student.enrollmentNo,
        batchId:      e.batchId,
        batchName:    e.batch.name,
        course:       e.batch.course.title,
        present, absent, late, total,
        percentage:   pct,
        deficit:      Math.ceil(((parseFloat(threshold) / 100) * total - present)),
        risk:         pct < 50 ? 'CRITICAL' : pct < 65 ? 'HIGH' : 'MEDIUM'
      })
    }
  }
  return results.sort((a, b) => a.percentage - b.percentage)
}

async function getStudentAttendanceHistory(studentId) {
  const sid = parseInt(studentId)
  // Try userId first (the ID passed from admin student list), fall back to profile id
  let profile = await prisma.studentProfile.findUnique({
    where: { userId: sid },
    include: {
      user: { select: { name: true, email: true } },
      enrollments: { include: { batch: { include: { course: { select: { title: true } } } } } }
    }
  })
  if (!profile) {
    profile = await prisma.studentProfile.findUnique({
      where: { id: sid },
      include: {
        user: { select: { name: true, email: true } },
        enrollments: { include: { batch: { include: { course: { select: { title: true } } } } } }
      }
    })
  }
  if (!profile) throw new ApiError(404, 'Student not found')

  const attendances = await prisma.attendance.findMany({
    where: { studentId: profile.id },
    include: {
      class: {
        include: {
          batch: { include: { course: { select: { title: true } } } }
        }
      }
    },
    orderBy: { class: { date: 'desc' } }
  })

  const byBatch = {}
  for (const a of attendances) {
    const bid = a.class.batchId
    if (!byBatch[bid]) {
      byBatch[bid] = {
        batchId: bid,
        batchName: a.class.batch.name,
        course: a.class.batch.course.title,
        records: [],
        present: 0, absent: 0, late: 0, excused: 0, total: 0
      }
    }
    byBatch[bid].records.push({
      classId: a.classId,
      date: a.class.date,
      classTitle: a.class.title,
      status: a.status,
      markedAt: a.markedAt
    })
    byBatch[bid][a.status.toLowerCase()]++
    byBatch[bid].total++
  }

  const batches = Object.values(byBatch).map(b => ({
    ...b,
    percentage: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0
  }))

  const monthlyBreakdown = {}
  for (const a of attendances) {
    const key = a.class.date.toISOString().substring(0, 7)
    const label = new Date(a.class.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    if (!monthlyBreakdown[key]) monthlyBreakdown[key] = { month: label, present: 0, absent: 0, late: 0, total: 0 }
    monthlyBreakdown[key][a.status.toLowerCase()]++
    monthlyBreakdown[key].total++
  }
  const monthly = Object.values(monthlyBreakdown).reverse()

  const totalPresent = attendances.filter(a => a.status === 'PRESENT').length
  const totalAll     = attendances.length
  const overallPct   = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0

  const sorted = [...attendances].sort((a, b) => new Date(b.class.date) - new Date(a.class.date))
  let streak = 0
  for (const a of sorted) {
    if (a.status === 'PRESENT') streak++
    else break
  }

  return {
    student: { id: profile.id, userId: profile.userId, name: profile.user.name, email: profile.user.email, enrollmentNo: profile.enrollmentNo },
    overallPct, totalPresent, totalAbsent: attendances.filter(a => a.status === 'ABSENT').length,
    totalLate: attendances.filter(a => a.status === 'LATE').length, totalAll, streak,
    batches, monthly,
    recentRecords: attendances.slice(0, 20).map(a => ({
      date: a.class.date, classTitle: a.class.title, batchName: a.class.batch.name, status: a.status, markedAt: a.markedAt
    }))
  }
}

async function getBatchAttendanceDetail(batchId, { month } = {}) {
  const batch = await prisma.batch.findUnique({
    where: { id: parseInt(batchId) },
    include: { course: { select: { title: true } } }
  })
  if (!batch) throw new ApiError(404, 'Batch not found')

  const classWhere = { batchId: parseInt(batchId) }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    classWhere.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
  }

  const classes = await prisma.dailyClass.findMany({
    where: classWhere,
    include: { attendances: true },
    orderBy: { date: 'asc' }
  })

  const enrollments = await prisma.batchEnrollment.findMany({
    where: { batchId: parseInt(batchId) },
    include: { student: { include: { user: { select: { name: true, email: true } } } } }
  })

  const matrix = enrollments.map(e => {
    const row = {
      studentId:    e.studentId,
      name:         e.student.user.name,
      email:        e.student.user.email,
      enrollmentNo: e.student.enrollmentNo,
      records:      {}
    }
    let present = 0, total = 0
    for (const cls of classes) {
      const att = cls.attendances.find(a => a.studentId === e.studentId)
      row.records[cls.id] = att?.status || null
      if (att) { total++; if (att.status === 'PRESENT') present++ }
    }
    row.present = present
    row.total   = total
    row.pct     = total > 0 ? Math.round((present / total) * 100) : 0
    return row
  })

  const classSummary = classes.map(cls => {
    const present = cls.attendances.filter(a => a.status === 'PRESENT').length
    const absent  = cls.attendances.filter(a => a.status === 'ABSENT').length
    const late    = cls.attendances.filter(a => a.status === 'LATE').length
    const total   = enrollments.length
    return {
      classId: cls.id, date: cls.date, title: cls.title, status: cls.status,
      present, absent, late, unmarked: total - cls.attendances.length,
      pct: total > 0 ? Math.round((present / total) * 100) : 0
    }
  })

  return { batch: { ...batch }, classes: classSummary, matrix }
}

async function resolveAlert(alertId) {
  return prisma.attendanceAlert.update({
    where: { id: parseInt(alertId) },
    data: { isResolved: true, resolvedAt: new Date() }
  })
}

async function getAttendanceAlerts({ resolved = false, batchId } = {}) {
  const where = { isResolved: resolved === 'true' || resolved === true }
  if (batchId) where.batchId = parseInt(batchId)
  return prisma.attendanceAlert.findMany({
    where,
    include: {
      student: { include: { user: { select: { name: true, email: true, phone: true } } } },
      batch:   { include: { course: { select: { title: true } } } }
    },
    orderBy: { currentPct: 'asc' }
  })
}

async function generateAttendanceAlerts({ threshold = 75 } = {}) {
  const lowStudents = await getLowAttendanceStudents({ threshold })
  let created = 0
  for (const s of lowStudents) {
    const existing = await prisma.attendanceAlert.findFirst({
      where: { studentId: s.studentId, batchId: s.batchId, isResolved: false }
    })
    if (!existing) {
      await prisma.attendanceAlert.create({
        data: {
          studentId: s.studentId,
          batchId:   s.batchId,
          threshold: parseFloat(threshold),
          currentPct: s.percentage,
          message: `${s.name} has ${s.percentage}% attendance in ${s.batchName}. Needs ${s.deficit} more classes to reach ${threshold}%.`
        }
      })
      await prisma.notification.create({
        data: {
          userId: s.userId,
          title: 'Low Attendance Alert',
          body:  `Your attendance is ${s.percentage}%. You need ${s.deficit} more classes to reach ${threshold}%. Please attend regularly.`,
          type:  'WARNING'
        }
      })
      created++
    } else {
      await prisma.attendanceAlert.update({
        where: { id: existing.id },
        data:  { currentPct: s.percentage }
      })
    }
  }
  return { generated: created, checked: lowStudents.length }
}

// ─── Quizzes ──────────────────────────────────────────────────────────────────
async function getQuizzes({ batchId, courseId } = {}) {
  const where = {}
  if (batchId) where.batchId = parseInt(batchId)
  if (courseId) where.courseId = parseInt(courseId)
  return prisma.quiz.findMany({
    where,
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

async function createQuiz(data) {
  const { title, description, courseId, batchId, duration, totalMarks, passMark, dueDate,
          quizType, category, tags, isFeatured, questions = [] } = data
  return prisma.$transaction(async tx => {
    const quiz = await tx.quiz.create({
      data: {
        title,
        description: description || null,
        courseId: courseId ? parseInt(courseId) : null,
        batchId: batchId ? parseInt(batchId) : null,
        duration: parseInt(duration),
        totalMarks: parseInt(totalMarks),
        passMark: parseInt(passMark),
        dueDate: dueDate ? new Date(dueDate) : null,
        quizType: quizType || 'MCQ',
        category: category || null,
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        isFeatured: isFeatured === true || isFeatured === 'true',
      },
    })
    if (questions.length > 0) {
      await tx.question.createMany({
        data: questions.map((q, i) => ({
          quizId: quiz.id,
          text: q.text,
          type: q.type || 'MCQ',
          options: q.options,
          marks: parseInt(q.marks) || 1,
          order: q.order ?? i,
          explanation: q.explanation || null,
          topic: q.topic || null,
          difficulty: q.difficulty || 'MEDIUM',
          codeSnippet: q.codeSnippet || null,
        })),
      })
    }
    return quiz
  })
}

async function updateQuiz(quizId, data) {
  const updateData = {}
  const allowed = ['title', 'description', 'duration', 'totalMarks', 'passMark', 'isPublished']
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key]
  }
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
  if (data.courseId) updateData.courseId = parseInt(data.courseId)
  if (data.batchId) updateData.batchId = parseInt(data.batchId)
  return prisma.quiz.update({ where: { id: parseInt(quizId) }, data: updateData })
}

async function publishQuiz(quizId) {
  const quiz = await prisma.quiz.update({
    where: { id: parseInt(quizId) },
    data: { isPublished: true },
    include: { batch: { include: { enrollments: { include: { student: true } } } } },
  })
  if (quiz.batch) {
    const notifs = quiz.batch.enrollments.map(e => ({
      userId: e.student.userId,
      title: 'New Quiz Available',
      body: `Quiz "${quiz.title}" is now available.`,
      type: 'QUIZ',
    }))
    if (notifs.length > 0) await prisma.notification.createMany({ data: notifs })
  }
  return quiz
}

async function getQuizResults(quizId) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: parseInt(quizId) },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { submittedAt: 'desc' },
  })
  return attempts.map(a => ({
    studentId: a.studentId,
    name: a.student?.user?.name || 'Unknown',
    score: a.score,
    totalMarks: a.totalMarks,
    percentage: Math.round((a.score / a.totalMarks) * 100),
    passed: a.passed,
    timeTaken: a.timeTaken,
    submittedAt: a.submittedAt,
  }))
}

async function addQuestion(quizId, data) {
  const count = await prisma.question.count({ where: { quizId: parseInt(quizId) } })
  return prisma.question.create({
    data: {
      quizId: parseInt(quizId),
      text: data.text,
      type: data.type || 'MCQ',
      options: data.options,
      marks: parseInt(data.marks) || 1,
      order: data.order ?? count,
      explanation: data.explanation || null,
    },
  })
}

async function updateQuestion(questionId, data) {
  return prisma.question.update({ where: { id: parseInt(questionId) }, data })
}

async function deleteQuestion(questionId) {
  return prisma.question.delete({ where: { id: parseInt(questionId) } })
}

// ─── Interview Questions ──────────────────────────────────────────────────────
async function getInterviewQuestions({ category, difficulty, search, page = 1, limit = 20 } = {}) {
  const where = {}
  if (category) where.category = { contains: category, mode: 'insensitive' }
  if (difficulty) where.difficulty = difficulty
  if (search) {
    where.OR = [
      { question: { contains: search, mode: 'insensitive' } },
      { answer: { contains: search, mode: 'insensitive' } },
    ]
  }
  const [total, items] = await Promise.all([
    prisma.interviewQuestion.count({ where }),
    prisma.interviewQuestion.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return { items, total, page, totalPages: Math.ceil(total / limit) }
}

async function createInterviewQuestion(data) {
  return prisma.interviewQuestion.create({
    data: {
      category: data.category,
      question: data.question,
      answer: data.answer,
      difficulty: data.difficulty || 'MEDIUM',
      tags: data.tags || [],
    },
  })
}

async function updateInterviewQuestion(id, data) {
  return prisma.interviewQuestion.update({ where: { id: parseInt(id) }, data })
}

async function deleteInterviewQuestion(id) {
  return prisma.interviewQuestion.delete({ where: { id: parseInt(id) } })
}

// ─── Placement ────────────────────────────────────────────────────────────────
async function getPlacementOverview({ batchId } = {}) {
  const profileWhere = {}
  if (batchId) profileWhere.enrollments = { some: { batchId: parseInt(batchId) } }

  const [profiles, mocks] = await Promise.all([
    prisma.studentProfile.findMany({
      where: profileWhere,
      include: {
        user: { select: { name: true, email: true } },
        mockInterviews: true,
        placementUpdates: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.mockInterview.findMany({
      where: batchId ? { student: { enrollments: { some: { batchId: parseInt(batchId) } } } } : {},
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'desc' },
    }),
  ])

  const statusCounts = { SEEKING: 0, INTERVIEWING: 0, PLACED: 0, NOT_SEEKING: 0 }
  for (const p of profiles) statusCounts[p.placementStatus] = (statusCounts[p.placementStatus] || 0) + 1
  const total = profiles.length
  const conversionRate = total ? Math.round((statusCounts.PLACED / total) * 100) : 0

  const students = profiles.map(p => {
    const mocks = p.mockInterviews
    const avgRating = mocks.filter(m => m.rating).length
      ? Math.round(mocks.filter(m => m.rating).reduce((a, m) => a + m.rating, 0) / mocks.filter(m => m.rating).length)
      : 0
    return {
      id: p.userId,
      profileId: p.id,
      name: p.user.name,
      email: p.user.email,
      placementStatus: p.placementStatus,
      mockCount: mocks.length,
      avgMockRating: avgRating,
      latestUpdate: p.placementUpdates[0] || null,
    }
  })

  return { statusCounts, conversionRate, students, mockInterviews: mocks }
}

async function updatePlacementStatus(studentId, status) {
  const sid = parseInt(studentId)
  let profile = await prisma.studentProfile.findUnique({ where: { userId: sid } })
  if (!profile) profile = await prisma.studentProfile.findUnique({ where: { id: sid } })
  if (!profile) throw new ApiError(404, 'Student profile not found')
  await prisma.studentProfile.update({ where: { id: profile.id }, data: { placementStatus: status } })
  await prisma.placementUpdate.create({
    data: { studentId: profile.id, title: 'Status Updated', body: `Placement status changed to ${status}` },
  })
  return { success: true }
}

async function getMockInterviews({ batchId, status } = {}) {
  const where = {}
  if (status) where.status = status
  if (batchId) where.student = { enrollments: { some: { batchId: parseInt(batchId) } } }
  return prisma.mockInterview.findMany({
    where,
    include: { student: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { scheduledAt: 'desc' },
  })
}

async function scheduleMockInterview(data) {
  const sid = parseInt(data.studentId)
  // Accept either userId or profileId — try userId first, fall back to profile id
  let profile = await prisma.studentProfile.findUnique({ where: { userId: sid } })
  if (!profile) profile = await prisma.studentProfile.findUnique({ where: { id: sid } })
  if (!profile) throw new ApiError(404, 'Student profile not found')
  const mock = await prisma.mockInterview.create({
    data: {
      studentId: profile.id,
      scheduledAt: new Date(data.scheduledAt),
      interviewerName: data.interviewerName || null,
      meetLink: data.meetLink || null,
    },
  })
  await prisma.notification.create({
    data: {
      userId: parseInt(data.studentId),
      title: 'Mock Interview Scheduled',
      body: `Your mock interview is scheduled for ${new Date(data.scheduledAt).toLocaleDateString()}.`,
      type: 'MOCK_INTERVIEW',
    },
  })
  return mock
}

async function updateMockInterview(id, data) {
  const updateData = {}
  const allowed = ['feedback', 'strengths', 'improvements', 'rating', 'status', 'interviewerName', 'meetLink']
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key]
  }
  if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt)
  return prisma.mockInterview.update({ where: { id: parseInt(id) }, data: updateData })
}

// ─── Assignments ──────────────────────────────────────────────────────────────
async function getAssignments({ batchId } = {}) {
  const where = {}
  if (batchId) where.batchId = parseInt(batchId)
  return prisma.assignment.findMany({
    where,
    include: {
      batch: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function createAssignment(data) {
  const { batchId, title, description, dueDate, maxMarks } = data
  const assignment = await prisma.assignment.create({
    data: {
      batchId: parseInt(batchId),
      title,
      description,
      dueDate: new Date(dueDate),
      maxMarks: parseInt(maxMarks) || 100,
      fileUrl: data.fileUrl || null,
    },
  })
  // Notify students
  const enrollments = await prisma.batchEnrollment.findMany({
    where: { batchId: parseInt(batchId) },
    include: { student: true },
  })
  const notifs = enrollments.map(e => ({
    userId: e.student.userId,
    title: 'New Assignment',
    body: `Assignment "${title}" has been posted. Due: ${new Date(dueDate).toLocaleDateString()}`,
    type: 'ASSIGNMENT',
  }))
  if (notifs.length > 0) await prisma.notification.createMany({ data: notifs })
  return assignment
}

async function getAssignmentSubmissions(assignmentId) {
  return prisma.assignmentSubmission.findMany({
    where: { assignmentId: parseInt(assignmentId) },
    include: { student: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { submittedAt: 'desc' },
  })
}

async function gradeSubmission(submissionId, { grade, feedback }) {
  const sub = await prisma.assignmentSubmission.update({
    where: { id: parseInt(submissionId) },
    data: { grade: parseInt(grade), feedback, status: 'GRADED', gradedAt: new Date() },
    include: { assignment: true, student: true },
  })
  await prisma.notification.create({
    data: {
      userId: sub.student.userId,
      title: 'Assignment Graded',
      body: `Your assignment "${sub.assignment.title}" has been graded: ${grade}/${sub.assignment.maxMarks}`,
      type: 'ASSIGNMENT',
    },
  })
  return sub
}

// ─── Announcements ────────────────────────────────────────────────────────────
async function getAnnouncements({ batchId } = {}) {
  const where = {}
  if (batchId) where.batchId = parseInt(batchId)
  return prisma.announcement.findMany({ where, orderBy: { createdAt: 'desc' } })
}

async function createAnnouncement(data) {
  const { batchId, title, body, isPinned, expiresAt } = data
  const ann = await prisma.announcement.create({
    data: {
      batchId: batchId ? parseInt(batchId) : null,
      title,
      body,
      isPinned: isPinned || false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })
  // Notify target students
  const userWhere = { role: 'STUDENT' }
  if (batchId) {
    userWhere.studentProfile = { enrollments: { some: { batchId: parseInt(batchId) } } }
  }
  const students = await prisma.user.findMany({ where: userWhere, select: { id: true } })
  if (students.length > 0) {
    await prisma.notification.createMany({
      data: students.map(s => ({ userId: s.id, title, body, type: 'ANNOUNCEMENT' })),
    })
  }
  return ann
}

async function updateAnnouncement(id, data) {
  return prisma.announcement.update({ where: { id: parseInt(id) }, data })
}

async function deleteAnnouncement(id) {
  return prisma.announcement.delete({ where: { id: parseInt(id) } })
}

// ─── Reports ──────────────────────────────────────────────────────────────────
async function getAttendanceReport({ batchId, startDate, endDate } = {}) {
  const enrollments = await prisma.batchEnrollment.findMany({
    where: batchId ? { batchId: parseInt(batchId) } : {},
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          attendances: {
            where: {
              class: {
                date: {
                  gte: startDate ? new Date(startDate) : undefined,
                  lte: endDate ? new Date(endDate) : undefined,
                },
              },
            },
            include: { class: { select: { date: true } } },
          },
        },
      },
    },
  })

  return enrollments.map(e => {
    const att = e.student.attendances
    const present = att.filter(a => a.status === 'PRESENT').length
    const absent = att.filter(a => a.status === 'ABSENT').length
    const late = att.filter(a => a.status === 'LATE').length
    const total = att.length
    return {
      name: e.student.user.name,
      email: e.student.user.email,
      enrollmentNo: e.student.enrollmentNo,
      present,
      absent,
      late,
      total,
      percentage: total ? Math.round((present / total) * 100) : 0,
    }
  })
}

async function getPerformanceReport({ batchId } = {}) {
  const enrollments = await prisma.batchEnrollment.findMany({
    where: batchId ? { batchId: parseInt(batchId) } : {},
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          attendances: { select: { status: true } },
          submissions: { select: { grade: true, status: true } },
          quizAttempts: { select: { score: true, totalMarks: true } },
          mockInterviews: { select: { rating: true } },
        },
      },
    },
  })

  return enrollments.map(e => {
    const s = e.student
    const att = s.attendances
    const present = att.filter(a => a.status === 'PRESENT').length
    const attPct = att.length ? Math.round((present / att.length) * 100) : 0
    const quizzes = s.quizAttempts
    const avgQuiz = quizzes.length
      ? Math.round(quizzes.reduce((a, q) => a + (q.score / q.totalMarks) * 100, 0) / quizzes.length)
      : 0
    const graded = s.submissions.filter(sub => sub.grade !== null)
    const avgGrade = graded.length ? Math.round(graded.reduce((a, sub) => a + sub.grade, 0) / graded.length) : 0
    const mocks = s.mockInterviews
    const avgMockRating = mocks.filter(m => m.rating).length
      ? Math.round(mocks.filter(m => m.rating).reduce((a, m) => a + m.rating, 0) / mocks.filter(m => m.rating).length)
      : 0
    return {
      name: s.user.name,
      email: s.user.email,
      enrollmentNo: s.enrollmentNo,
      attendancePct: attPct,
      avgQuizScore: avgQuiz,
      assignmentsSubmitted: s.submissions.length,
      assignmentsGraded: graded.length,
      avgGrade,
      mockInterviewCount: mocks.length,
      avgMockRating,
    }
  })
}

async function exportCSV(type, filters) {
  if (type === 'attendance') return getAttendanceReport(filters)
  if (type === 'performance') return getPerformanceReport(filters)
  // students
  const { students } = await getStudents({ limit: 1000, ...filters })
  return students.map(s => ({
    name: s.name,
    email: s.email,
    phone: s.phone || '',
    enrollmentNo: s.studentProfile?.enrollmentNo || '',
    batch: s.studentProfile?.enrollments?.[0]?.batch?.name || '',
    course: s.studentProfile?.enrollments?.[0]?.batch?.course?.title || '',
    placementStatus: s.studentProfile?.placementStatus || '',
    isActive: s.isActive,
    joinedAt: new Date(s.createdAt).toLocaleDateString(),
  }))
}

// ─── Company Drives (Admin) ───────────────────────────────────────────────────
async function getAdminCompanyDrives({ status, batchId } = {}) {
  const where = {}
  if (status) where.status = status
  if (batchId) where.batchId = parseInt(batchId)
  return prisma.companyDrive.findMany({
    where,
    include: {
      batch: { select: { name: true } },
      _count: { select: { applications: true } }
    },
    orderBy: { driveDate: 'asc' }
  })
}

async function createAdminCompanyDrive(data) {
  return prisma.companyDrive.create({
    data: {
      companyName: data.companyName,
      role: data.role,
      package: data.package,
      location: data.location,
      driveDate: new Date(data.driveDate),
      applyDeadline: new Date(data.applyDeadline),
      description: data.description,
      requirements: data.requirements || [],
      skills: data.skills || [],
      driveType: data.driveType || 'CAMPUS',
      status: data.status || 'UPCOMING',
      applyLink: data.applyLink || null,
      batchId: data.batchId ? parseInt(data.batchId) : null,
    }
  })
}

async function updateAdminCompanyDrive(id, data) {
  const update = {}
  const fields = ['companyName','role','package','location','description','requirements','skills','driveType','status','applyLink','batchId']
  for (const f of fields) if (data[f] !== undefined) update[f] = data[f]
  if (data.driveDate) update.driveDate = new Date(data.driveDate)
  if (data.applyDeadline) update.applyDeadline = new Date(data.applyDeadline)
  return prisma.companyDrive.update({ where: { id: parseInt(id) }, data: update })
}

async function getAdminDriveApplications(driveId) {
  return prisma.driveApplication.findMany({
    where: { driveId: parseInt(driveId) },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } }
    },
    orderBy: { appliedAt: 'desc' }
  })
}

async function updateAdminDriveApplication(driveId, appId, { status, notes }) {
  const app = await prisma.driveApplication.update({
    where: { id: parseInt(appId) },
    data: { status, notes },
    include: {
      student: { include: { user: { select: { id: true } } } },
      drive: { select: { companyName: true, role: true } }
    }
  })
  if (status === 'SHORTLISTED' || status === 'SELECTED') {
    await prisma.notification.create({
      data: {
        userId: app.student.user.id,
        title: status === 'SELECTED' ? '🎉 Selected!' : '⭐ Shortlisted!',
        body: `You have been ${status.toLowerCase()} for ${app.drive.role} at ${app.drive.companyName}`,
        type: 'SUCCESS'
      }
    })
  }
  return app
}

module.exports = {
  getDashboardStats,
  getStudents, createStudent, getStudentDetail, updateStudent, toggleStudentStatus, resetStudentPassword,
  getBatches, createBatch, getBatchDetail, updateBatch, enrollStudent, removeStudentFromBatch,
  addMaterial, deleteMaterial, addRecordedSession, addSyllabusModule, addSyllabusTopic,
  getClasses, createClass, updateClass,
  getAttendanceSheet, markAttendance,
  getAttendanceOverview, getAttendanceAnalytics, getLowAttendanceStudents,
  getStudentAttendanceHistory, getBatchAttendanceDetail, getAttendanceAlerts,
  generateAttendanceAlerts, resolveAlert,
  getQuizzes, createQuiz, updateQuiz, publishQuiz, getQuizResults, addQuestion, updateQuestion, deleteQuestion,
  getInterviewQuestions, createInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion,
  getPlacementOverview, updatePlacementStatus, getMockInterviews, scheduleMockInterview, updateMockInterview,
  getAssignments, createAssignment, getAssignmentSubmissions, gradeSubmission,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAttendanceReport, getPerformanceReport, exportCSV,
  getAdminCompanyDrives, createAdminCompanyDrive, updateAdminCompanyDrive,
  getAdminDriveApplications, updateAdminDriveApplication,
}
