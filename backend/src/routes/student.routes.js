const express   = require('express')
const multer    = require('multer')
const path      = require('path')
const ctrl      = require('../controllers/student.controller')

const router = express.Router()

// Multer for file uploads (in-memory for demo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.zip', '.py', '.js', '.txt', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

// Dashboard
router.get('/dashboard',                ctrl.getDashboard)

// Courses
router.get('/courses',                  ctrl.getCourses)
router.get('/courses/:id',              ctrl.getCourseDetail)
router.get('/courses/:id/syllabus',     ctrl.getSyllabus)
router.get('/courses/:id/materials',    ctrl.getMaterials)
router.get('/courses/:id/sessions',     ctrl.getSessions)

// Classes
router.get('/classes',                  ctrl.getClasses)
router.get('/classes/:id',              ctrl.getClassDetail)

// Attendance
router.get('/attendance',               ctrl.getAttendance)
router.get('/attendance/summary',       ctrl.getAttendanceSummary)
router.get('/attendance/trend',         ctrl.getAttendanceTrend)

// Assignments
router.get('/assignments',              ctrl.getAssignments)
router.post('/assignments/:id/submit',  upload.single('file'), ctrl.submitAssignment)

// Quizzes
router.get('/quizzes',                     ctrl.getQuizzes)
router.get('/quiz-analytics',              ctrl.getQuizAnalytics)
router.get('/interview-prep',              ctrl.getInterviewPrep)
router.get('/quizzes/:id',                 ctrl.getQuizDetail)
router.post('/quizzes/:id/attempt',        ctrl.submitQuiz)
router.get('/quizzes/:id/leaderboard',     ctrl.getQuizLeaderboard)

// Placement Hub (must come before legacy /placement)
router.get('/placement/hub',            ctrl.getPlacementHub)
router.patch('/placement/profile',      ctrl.updatePlacementProfile)

// Placement (legacy)
router.get('/placement',                ctrl.getPlacementData)
router.get('/mock-interviews',          ctrl.getMockInterviews)

// Resume
router.get('/resume',                   ctrl.getResumeData)
router.put('/resume',                   ctrl.saveResumeData)

// Skills
router.get('/skills',                   ctrl.getSkills)
router.post('/skills',                  ctrl.addSkill)
router.patch('/skills/:id',             ctrl.updateSkill)
router.delete('/skills/:id',            ctrl.deleteSkill)

// Company Drives
router.get('/drives',                   ctrl.getCompanyDrives)
router.post('/drives/:id/apply',        ctrl.applyToDrive)

// Mock Analytics
router.get('/mock-analytics',           ctrl.getMockAnalytics)

// Notifications
router.get('/notifications',            ctrl.getNotifications)
router.patch('/notifications/read-all', ctrl.markAllRead)
router.patch('/notifications/:id/read', ctrl.markRead)

// Activity
router.get('/activity',                 ctrl.getActivityFeed)

module.exports = router
