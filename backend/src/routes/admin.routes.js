const express = require('express')
const ctrl = require('../controllers/admin.controller')

const router = express.Router()

function adminOnly(req, res, next) {
  if (!['SUPERADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  next()
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', ctrl.getDashboardStats)

// ─── Students ─────────────────────────────────────────────────────────────────
router.get('/students',                                       ctrl.getStudents)
router.post('/students',              adminOnly,              ctrl.createStudent)
router.get('/students/:id',                                   ctrl.getStudentDetail)
router.patch('/students/:id',         adminOnly,              ctrl.updateStudent)
router.patch('/students/:id/status',  adminOnly,              ctrl.toggleStudentStatus)
router.post('/students/:id/reset-password', adminOnly,        ctrl.resetStudentPassword)

// ─── Batches ──────────────────────────────────────────────────────────────────
router.get('/batches',                                        ctrl.getBatches)
router.post('/batches',               adminOnly,              ctrl.createBatch)
router.get('/batches/:id',                                    ctrl.getBatchDetail)
router.patch('/batches/:id',          adminOnly,              ctrl.updateBatch)
router.post('/batches/:id/enroll',    adminOnly,              ctrl.enrollStudent)
router.delete('/batches/:id/students/:studentId', adminOnly,  ctrl.removeStudentFromBatch)

// ─── Courses & Materials ──────────────────────────────────────────────────────
// Course list/create now served by the Java API (api/).
router.post('/courses/:id/materials', adminOnly,              ctrl.addMaterial)
router.delete('/courses/:courseId/materials/:materialId', adminOnly, ctrl.deleteMaterial)
router.post('/courses/:id/sessions',  adminOnly,              ctrl.addRecordedSession)
router.post('/courses/:id/syllabus/modules', adminOnly,       ctrl.addSyllabusModule)
router.post('/courses/:id/syllabus/modules/:moduleId/topics', adminOnly, ctrl.addSyllabusTopic)

// ─── Classes ──────────────────────────────────────────────────────────────────
router.get('/classes',                                        ctrl.getClasses)
router.post('/classes',                                       ctrl.createClass)
router.patch('/classes/:id',                                  ctrl.updateClass)

// ─── Attendance ───────────────────────────────────────────────────────────────
router.get('/attendance',                                     ctrl.getAttendanceOverview)
router.get('/attendance/analytics',                           ctrl.getAttendanceAnalytics)
router.get('/attendance/alerts',                              ctrl.getAttendanceAlerts)
router.post('/attendance/alerts/generate',                    ctrl.generateAlerts)
router.patch('/attendance/alerts/:id/resolve',                ctrl.resolveAlert)
router.get('/attendance/low',                                 ctrl.getLowAttendanceStudents)
router.get('/attendance/student/:id',                         ctrl.getStudentAttHistory)
router.get('/attendance/batch/:id',                           ctrl.getBatchAttDetail)
router.get('/attendance/:classId',                            ctrl.getAttendanceSheet)
router.post('/attendance/:classId',                           ctrl.markAttendance)
router.patch('/attendance/:classId/student/:studentId',       ctrl.markAttendance)

// ─── Quizzes ──────────────────────────────────────────────────────────────────
router.get('/quizzes',                                        ctrl.getQuizzes)
router.post('/quizzes',                                       ctrl.createQuiz)
router.patch('/quizzes/:id',                                  ctrl.updateQuiz)
router.post('/quizzes/:id/publish',                           ctrl.publishQuiz)
router.get('/quizzes/:id/results',                            ctrl.getQuizResults)
router.get('/quizzes/:id/leaderboard',                        ctrl.getQuizLeaderboard)
router.post('/quizzes/:id/questions',                         ctrl.addQuestion)
router.patch('/quizzes/:id/questions/:qId',                   ctrl.updateQuestion)
router.delete('/quizzes/:id/questions/:qId',                  ctrl.deleteQuestion)

// ─── Interview Questions ──────────────────────────────────────────────────────
router.get('/interview-questions',                            ctrl.getInterviewQuestions)
router.post('/interview-questions',   adminOnly,              ctrl.createInterviewQuestion)
router.patch('/interview-questions/:id', adminOnly,           ctrl.updateInterviewQuestion)
router.delete('/interview-questions/:id', adminOnly,          ctrl.deleteInterviewQuestion)

// ─── Placement & Mock Interviews ──────────────────────────────────────────────
router.get('/placement',                                      ctrl.getPlacementOverview)
router.patch('/placement/:studentId/status', adminOnly,       ctrl.updatePlacementStatus)
router.get('/mock-interviews',                                ctrl.getMockInterviews)
router.post('/mock-interviews',                               ctrl.scheduleMockInterview)
router.patch('/mock-interviews/:id',                          ctrl.updateMockInterview)

// ─── Assignments ──────────────────────────────────────────────────────────────
router.get('/assignments',                                    ctrl.getAssignments)
router.post('/assignments',                                   ctrl.createAssignment)
router.get('/assignments/:id/submissions',                    ctrl.getAssignmentSubmissions)
router.patch('/assignments/:id/submissions/:subId',           ctrl.gradeSubmission)

// ─── Announcements ────────────────────────────────────────────────────────────
router.get('/announcements',                                  ctrl.getAnnouncements)
router.post('/announcements',                                 ctrl.createAnnouncement)
router.patch('/announcements/:id',                            ctrl.updateAnnouncement)
router.delete('/announcements/:id',   adminOnly,              ctrl.deleteAnnouncement)

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports/attendance',                             ctrl.getAttendanceReport)
router.get('/reports/performance',                            ctrl.getPerformanceReport)
router.get('/reports/export',                                 ctrl.exportCSV)

// ─── Company Drives ───────────────────────────────────────────────────────────
router.get('/drives',                                         ctrl.getAdminDrives)
router.post('/drives',                adminOnly,              ctrl.createAdminDrive)
router.patch('/drives/:id',           adminOnly,              ctrl.updateAdminDrive)
router.get('/drives/:id/applications',                        ctrl.getAdminDriveApplications)
router.patch('/drives/:id/applications/:appId', adminOnly,    ctrl.updateAdminDriveApplication)

module.exports = router
