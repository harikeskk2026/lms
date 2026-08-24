const service = require('../services/student.service')
const ApiError = require('../utils/ApiError')

const wrap = fn => async (req, res, next) => {
  try {
    const result = await fn(req, res)
    if (!res.headersSent) res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

exports.getDashboard = wrap(req => service.getDashboardService(req.user.id))

exports.getCourses   = wrap(req => service.getCoursesService(req.user.id))

exports.getCourseDetail = wrap(req =>
  service.getCourseDetailService(req.user.id, req.params.id))

exports.getSyllabus  = wrap(req =>
  service.getSyllabusService(req.user.id, req.params.id))

exports.getMaterials = wrap(req =>
  service.getMaterialsService(req.user.id, req.params.id))

exports.getSessions  = wrap(req =>
  service.getSessionsService(req.user.id, req.params.id))

exports.getClasses   = wrap(req =>
  service.getClassesService(req.user.id, req.query.status))

exports.getClassDetail = wrap(req =>
  service.getClassDetailService(req.user.id, req.params.id))

exports.getAttendance = wrap(req =>
  service.getAttendanceService(req.user.id, req.query.month))

exports.getAttendanceSummary = wrap(req =>
  service.getAttendanceSummaryService(req.user.id))

exports.getAttendanceTrend = wrap(req =>
  service.getStudentAttendanceTrend(req.user.id))

exports.getAssignments = wrap(req =>
  service.getAssignmentsService(req.user.id))

exports.submitAssignment = wrap(async (req, res) => {
  const fileUrl = req.file
    ? `/uploads/${req.file.filename}`
    : req.body.fileUrl || 'https://example.com/demo-submission.pdf'
  return service.submitAssignmentService(
    req.user.id, req.params.id, fileUrl, req.body.notes
  )
})

exports.getQuizzes   = wrap(req => service.getQuizzesService(req.user.id))

exports.getQuizDetail = wrap(req =>
  service.getQuizDetailService(req.user.id, req.params.id))

exports.submitQuiz   = wrap(req =>
  service.submitQuizService(req.user.id, req.params.id, req.body.answers, req.body.timeTaken))

exports.getQuizLeaderboard = wrap(req =>
  service.getQuizLeaderboard(req.params.id, req.user.id))

exports.getQuizAnalytics = wrap(req =>
  service.getQuizAnalytics(req.user.id))

exports.getInterviewPrep = wrap(req =>
  service.getInterviewPrepService({
    category:   req.query.category,
    difficulty: req.query.difficulty,
    search:     req.query.search,
    page:       req.query.page,
    limit:      req.query.limit
  }))

exports.getPlacementData = wrap(req => service.getPlacementDataService(req.user.id))

exports.getMockInterviews = wrap(req => service.getMockInterviewsService(req.user.id))

exports.getNotifications = wrap(req => service.getNotificationsService(req.user.id))

exports.markRead = wrap(req =>
  service.markReadService(req.user.id, req.params.id))

exports.markAllRead = wrap(req => service.markAllReadService(req.user.id))

exports.getActivityFeed = wrap(req => service.getActivityFeedService(req.user.id))

// ─── Placement Hub ─────────────────────────────────────────────────────────────
exports.getPlacementHub = wrap(req => service.getPlacementHubService(req.user.id))

exports.updatePlacementProfile = wrap(async (req, res) => {
  const d = await service.updatePlacementProfileService(req.user.id, req.body)
  res.json({ success: true, data: d })
})

exports.getResumeData = wrap(req => service.getResumeDataService(req.user.id))

exports.saveResumeData = wrap(async (req, res) => {
  const d = await service.saveResumeDataService(req.user.id, req.body)
  res.json({ success: true, data: d })
})

exports.getSkills = wrap(req => service.getSkillsService(req.user.id))

exports.addSkill = wrap(async (req, res) => {
  const d = await service.addSkillService(req.user.id, req.body)
  res.json({ success: true, data: d })
})

exports.updateSkill = wrap(async (req, res) => {
  const d = await service.updateSkillService(req.user.id, req.params.id, req.body)
  res.json({ success: true, data: d })
})

exports.deleteSkill = wrap(async (req, res) => {
  const d = await service.deleteSkillService(req.user.id, req.params.id)
  res.json({ success: true, data: d })
})

exports.getCompanyDrives = wrap(req => service.getCompanyDrivesService(req.user.id))

exports.applyToDrive = wrap(async (req, res) => {
  const d = await service.applyToDriveService(req.user.id, req.params.id)
  res.json({ success: true, data: d })
})

exports.getMockAnalytics = wrap(req => service.getMockInterviewAnalyticsService(req.user.id))
