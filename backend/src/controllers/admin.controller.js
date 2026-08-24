const svc = require('../services/admin.service')

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ─── Dashboard ────────────────────────────────────────────────────────────────
const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await svc.getDashboardStats()
  res.json({ success: true, data })
})

// ─── Students ─────────────────────────────────────────────────────────────────
const getStudents = asyncHandler(async (req, res) => {
  const data = await svc.getStudents(req.query)
  res.json({ success: true, data })
})

const createStudent = asyncHandler(async (req, res) => {
  const data = await svc.createStudent(req.body)
  res.status(201).json({ success: true, data })
})

const getStudentDetail = asyncHandler(async (req, res) => {
  const data = await svc.getStudentDetail(req.params.id)
  res.json({ success: true, data })
})

const updateStudent = asyncHandler(async (req, res) => {
  const data = await svc.updateStudent(req.params.id, req.body)
  res.json({ success: true, data })
})

const toggleStudentStatus = asyncHandler(async (req, res) => {
  const data = await svc.toggleStudentStatus(req.params.id)
  res.json({ success: true, data })
})

const resetStudentPassword = asyncHandler(async (req, res) => {
  const data = await svc.resetStudentPassword(req.params.id, req.body.newPassword)
  res.json({ success: true, data })
})

// ─── Batches ──────────────────────────────────────────────────────────────────
const getBatches = asyncHandler(async (req, res) => {
  const data = await svc.getBatches(req.query)
  res.json({ success: true, data })
})

const createBatch = asyncHandler(async (req, res) => {
  const data = await svc.createBatch(req.body)
  res.status(201).json({ success: true, data })
})

const getBatchDetail = asyncHandler(async (req, res) => {
  const data = await svc.getBatchDetail(req.params.id)
  res.json({ success: true, data })
})

const updateBatch = asyncHandler(async (req, res) => {
  const data = await svc.updateBatch(req.params.id, req.body)
  res.json({ success: true, data })
})

const enrollStudent = asyncHandler(async (req, res) => {
  const data = await svc.enrollStudent(req.params.id, req.body.studentId)
  res.status(201).json({ success: true, data })
})

const removeStudentFromBatch = asyncHandler(async (req, res) => {
  const data = await svc.removeStudentFromBatch(req.params.id, req.params.studentId)
  res.json({ success: true, data })
})

// ─── Courses ──────────────────────────────────────────────────────────────────
const getCourses = asyncHandler(async (req, res) => {
  const data = await svc.getCourses()
  res.json({ success: true, data })
})

const createCourse = asyncHandler(async (req, res) => {
  const data = await svc.createCourse(req.body)
  res.status(201).json({ success: true, data })
})

const addMaterial = asyncHandler(async (req, res) => {
  const data = await svc.addMaterial(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

const deleteMaterial = asyncHandler(async (req, res) => {
  const data = await svc.deleteMaterial(req.params.materialId)
  res.json({ success: true, data })
})

const addRecordedSession = asyncHandler(async (req, res) => {
  const data = await svc.addRecordedSession(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

const addSyllabusModule = asyncHandler(async (req, res) => {
  const data = await svc.addSyllabusModule(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

const addSyllabusTopic = asyncHandler(async (req, res) => {
  const data = await svc.addSyllabusTopic(req.params.moduleId, req.body)
  res.status(201).json({ success: true, data })
})

// ─── Classes ──────────────────────────────────────────────────────────────────
const getClasses = asyncHandler(async (req, res) => {
  const data = await svc.getClasses(req.query)
  res.json({ success: true, data })
})

const createClass = asyncHandler(async (req, res) => {
  const data = await svc.createClass(req.body)
  res.status(201).json({ success: true, data })
})

const updateClass = asyncHandler(async (req, res) => {
  const data = await svc.updateClass(req.params.id, req.body)
  res.json({ success: true, data })
})

// ─── Attendance ───────────────────────────────────────────────────────────────
const getAttendanceSheet = asyncHandler(async (req, res) => {
  const data = await svc.getAttendanceSheet(req.params.classId)
  res.json({ success: true, data })
})

const markAttendance = asyncHandler(async (req, res) => {
  const records = req.body.records || (req.params.studentId
    ? [{ studentId: req.params.studentId, status: req.body.status }]
    : [])
  const data = await svc.markAttendance(req.params.classId, records)
  res.json({ success: true, data })
})

// ─── Quizzes ──────────────────────────────────────────────────────────────────
const getQuizzes = asyncHandler(async (req, res) => {
  const data = await svc.getQuizzes(req.query)
  res.json({ success: true, data })
})

const createQuiz = asyncHandler(async (req, res) => {
  const data = await svc.createQuiz(req.body)
  res.status(201).json({ success: true, data })
})

const updateQuiz = asyncHandler(async (req, res) => {
  const data = await svc.updateQuiz(req.params.id, req.body)
  res.json({ success: true, data })
})

const publishQuiz = asyncHandler(async (req, res) => {
  const data = await svc.publishQuiz(req.params.id)
  res.json({ success: true, data })
})

const getQuizResults = asyncHandler(async (req, res) => {
  const data = await svc.getQuizResults(req.params.id)
  res.json({ success: true, data })
})

const getQuizLeaderboard = asyncHandler(async (req, res) => {
  // Re-use student service leaderboard (no current user for admin)
  const studentSvc = require('../services/student.service')
  const data = await studentSvc.getQuizLeaderboard(req.params.id, null)
  res.json({ success: true, data })
})

const addQuestion = asyncHandler(async (req, res) => {
  const data = await svc.addQuestion(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

const updateQuestion = asyncHandler(async (req, res) => {
  const data = await svc.updateQuestion(req.params.qId, req.body)
  res.json({ success: true, data })
})

const deleteQuestion = asyncHandler(async (req, res) => {
  const data = await svc.deleteQuestion(req.params.qId)
  res.json({ success: true, data })
})

// ─── Interview Questions ──────────────────────────────────────────────────────
const getInterviewQuestions = asyncHandler(async (req, res) => {
  const data = await svc.getInterviewQuestions(req.query)
  res.json({ success: true, data })
})

const createInterviewQuestion = asyncHandler(async (req, res) => {
  const data = await svc.createInterviewQuestion(req.body)
  res.status(201).json({ success: true, data })
})

const updateInterviewQuestion = asyncHandler(async (req, res) => {
  const data = await svc.updateInterviewQuestion(req.params.id, req.body)
  res.json({ success: true, data })
})

const deleteInterviewQuestion = asyncHandler(async (req, res) => {
  const data = await svc.deleteInterviewQuestion(req.params.id)
  res.json({ success: true, data })
})

// ─── Placement ────────────────────────────────────────────────────────────────
const getPlacementOverview = asyncHandler(async (req, res) => {
  const data = await svc.getPlacementOverview(req.query)
  res.json({ success: true, data })
})

const updatePlacementStatus = asyncHandler(async (req, res) => {
  const data = await svc.updatePlacementStatus(req.params.studentId, req.body.status)
  res.json({ success: true, data })
})

const getMockInterviews = asyncHandler(async (req, res) => {
  const data = await svc.getMockInterviews(req.query)
  res.json({ success: true, data })
})

const scheduleMockInterview = asyncHandler(async (req, res) => {
  const data = await svc.scheduleMockInterview(req.body)
  res.status(201).json({ success: true, data })
})

const updateMockInterview = asyncHandler(async (req, res) => {
  const data = await svc.updateMockInterview(req.params.id, req.body)
  res.json({ success: true, data })
})

// ─── Assignments ──────────────────────────────────────────────────────────────
const getAssignments = asyncHandler(async (req, res) => {
  const data = await svc.getAssignments(req.query)
  res.json({ success: true, data })
})

const createAssignment = asyncHandler(async (req, res) => {
  const data = await svc.createAssignment(req.body)
  res.status(201).json({ success: true, data })
})

const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const data = await svc.getAssignmentSubmissions(req.params.id)
  res.json({ success: true, data })
})

const gradeSubmission = asyncHandler(async (req, res) => {
  const data = await svc.gradeSubmission(req.params.subId, req.body)
  res.json({ success: true, data })
})

// ─── Announcements ────────────────────────────────────────────────────────────
const getAnnouncements = asyncHandler(async (req, res) => {
  const data = await svc.getAnnouncements(req.query)
  res.json({ success: true, data })
})

const createAnnouncement = asyncHandler(async (req, res) => {
  const data = await svc.createAnnouncement(req.body)
  res.status(201).json({ success: true, data })
})

const updateAnnouncement = asyncHandler(async (req, res) => {
  const data = await svc.updateAnnouncement(req.params.id, req.body)
  res.json({ success: true, data })
})

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const data = await svc.deleteAnnouncement(req.params.id)
  res.json({ success: true, data })
})

// ─── Attendance Analytics ─────────────────────────────────────────────────────
const getAttendanceOverview    = asyncHandler(async (req, res) => { const d = await svc.getAttendanceOverview(); res.json({ success: true, data: d }) })
const getAttendanceAnalytics   = asyncHandler(async (req, res) => { const d = await svc.getAttendanceAnalytics(req.query); res.json({ success: true, data: d }) })
const getLowAttendanceStudents = asyncHandler(async (req, res) => { const d = await svc.getLowAttendanceStudents(req.query); res.json({ success: true, data: d }) })
const getStudentAttHistory     = asyncHandler(async (req, res) => { const d = await svc.getStudentAttendanceHistory(req.params.id); res.json({ success: true, data: d }) })
const getBatchAttDetail        = asyncHandler(async (req, res) => { const d = await svc.getBatchAttendanceDetail(req.params.id, req.query); res.json({ success: true, data: d }) })
const getAttendanceAlerts      = asyncHandler(async (req, res) => { const d = await svc.getAttendanceAlerts(req.query); res.json({ success: true, data: d }) })
const generateAlerts           = asyncHandler(async (req, res) => { const d = await svc.generateAttendanceAlerts(req.query); res.json({ success: true, data: d }) })
const resolveAlert             = asyncHandler(async (req, res) => { const d = await svc.resolveAlert(req.params.id); res.json({ success: true, data: d }) })

// ─── Reports ──────────────────────────────────────────────────────────────────
const getAttendanceReport = asyncHandler(async (req, res) => {
  const data = await svc.getAttendanceReport(req.query)
  res.json({ success: true, data })
})

const getPerformanceReport = asyncHandler(async (req, res) => {
  const data = await svc.getPerformanceReport(req.query)
  res.json({ success: true, data })
})

const exportCSV = asyncHandler(async (req, res) => {
  const data = await svc.exportCSV(req.query.type, req.query)
  res.json({ success: true, data })
})

// ─── Company Drives ───────────────────────────────────────────────────────────
const getAdminDrives = asyncHandler(async (req, res) => {
  const data = await svc.getAdminCompanyDrives(req.query)
  res.json({ success: true, data })
})

const createAdminDrive = asyncHandler(async (req, res) => {
  const data = await svc.createAdminCompanyDrive(req.body)
  res.status(201).json({ success: true, data })
})

const updateAdminDrive = asyncHandler(async (req, res) => {
  const data = await svc.updateAdminCompanyDrive(req.params.id, req.body)
  res.json({ success: true, data })
})

const getAdminDriveApplications = asyncHandler(async (req, res) => {
  const data = await svc.getAdminDriveApplications(req.params.id)
  res.json({ success: true, data })
})

const updateAdminDriveApplication = asyncHandler(async (req, res) => {
  const data = await svc.updateAdminDriveApplication(req.params.id, req.params.appId, req.body)
  res.json({ success: true, data })
})

module.exports = {
  getDashboardStats,
  getStudents, createStudent, getStudentDetail, updateStudent, toggleStudentStatus, resetStudentPassword,
  getBatches, createBatch, getBatchDetail, updateBatch, enrollStudent, removeStudentFromBatch,
  getCourses, createCourse, addMaterial, deleteMaterial, addRecordedSession, addSyllabusModule, addSyllabusTopic,
  getClasses, createClass, updateClass,
  getAttendanceSheet, markAttendance,
  getAttendanceOverview, getAttendanceAnalytics, getLowAttendanceStudents,
  getStudentAttHistory, getBatchAttDetail, getAttendanceAlerts, generateAlerts, resolveAlert,
  getQuizzes, createQuiz, updateQuiz, publishQuiz, getQuizResults, getQuizLeaderboard, addQuestion, updateQuestion, deleteQuestion,
  getInterviewQuestions, createInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion,
  getPlacementOverview, updatePlacementStatus, getMockInterviews, scheduleMockInterview, updateMockInterview,
  getAssignments, createAssignment, getAssignmentSubmissions, gradeSubmission,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAttendanceReport, getPerformanceReport, exportCSV,
  getAdminDrives, createAdminDrive, updateAdminDrive, getAdminDriveApplications, updateAdminDriveApplication,
}
