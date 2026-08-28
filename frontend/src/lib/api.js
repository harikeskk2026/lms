import axios from 'axios'
import tokenStorage from '@/utilities/tokenStorage'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_JAVA_API_URL || 'http://localhost:7000/api',
  withCredentials: true,
  timeout: 10000,
})

// ─── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = tokenStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response: auto-refresh on TOKEN_EXPIRED ──────────────────────────────────
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    if (
      err.response?.status === 401 &&
      err.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }).catch(e => Promise.reject(e))
      }

      isRefreshing = true

      try {
        const baseURL = process.env.NEXT_PUBLIC_JAVA_API_URL || 'http://localhost:7000/api'
        const { data } = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = data.accessToken
        tokenStorage.setSession(newToken, tokenStorage.getUser())
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        tokenStorage.clear()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api

// Files (e.g. assignment attachments, submissions) come back from the API as
// paths relative to the API origin (e.g. "/uploads/assignments/x.pdf"), not
// the frontend origin — resolve them to an absolute URL before linking.
const API_ORIGIN = (process.env.NEXT_PUBLIC_JAVA_API_URL || 'http://localhost:7000/api').replace(/\/api\/?$/, '')

export function resolveFileUrl(path) {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),

  // Students
  getStudents: (params) => api.get('/admin/students', { params }),
  createStudent: (data) => api.post('/admin/students', data),
  getStudentDetail: (id) => api.get(`/admin/students/${id}`),
  updateStudent: (id, data) => api.patch(`/admin/students/${id}`, data),
  toggleStudentStatus: (id) => api.patch(`/admin/students/${id}/status`),
  resetStudentPassword: (id, data) => api.post(`/admin/students/${id}/reset-password`, data),

  // Batches
  getBatches: (params) => api.get('/batches', { params }),
  createBatch: (data) => api.post('/batches', data),
  getBatchDetail: (id) => api.get(`/batches/${id}`),
  updateBatch: (id, data) => api.put(`/batches/${id}`, data),
  toggleBatchStatus: (id) => api.patch(`/batches/${id}/status`),
  enrollStudent: (batchId, studentId) => api.post(`/admin/batches/${batchId}/enroll`, { studentId }),
  removeFromBatch: (batchId, studentId) => api.delete(`/admin/batches/${batchId}/students/${studentId}`),

  // Courses (list/create now served by the Java API - see @/services/courseService)
  addMaterial: (courseId, data) => api.post(`/admin/courses/${courseId}/materials`, data),
  deleteMaterial: (courseId, materialId) => api.delete(`/admin/courses/${courseId}/materials/${materialId}`),
  addSession: (courseId, data) => api.post(`/admin/courses/${courseId}/sessions`, data),
  addSyllabusModule: (courseId, data) => api.post(`/admin/courses/${courseId}/syllabus/modules`, data),
  addSyllabusTopic: (courseId, moduleId, data) => api.post(`/admin/courses/${courseId}/syllabus/modules/${moduleId}/topics`, data),

  // Classes
  getClasses: (params) => api.get('/admin/classes', { params }),
  createClass: (data) => api.post('/admin/classes', data),
  updateClass: (id, data) => api.patch(`/admin/classes/${id}`, data),

  // Attendance
  getAttendanceSheet: (classId) => api.get(`/admin/attendance/${classId}`),
  markAttendance: (classId, records) => api.post(`/admin/attendance/${classId}`, { records }),
  // Attendance system
  getAttendanceOverview:  ()        => api.get('/admin/attendance'),
  getAttendanceAnalytics: (params)  => api.get('/admin/attendance/analytics', { params }),
  getLowAttendance:       (params)  => api.get('/admin/attendance/low', { params }),
  getStudentAttHistory:   (id)      => api.get(`/admin/attendance/student/${id}`),
  getBatchAttDetail:      (id, p)   => api.get(`/admin/attendance/batch/${id}`, { params: p }),
  getAttendanceAlerts:    (params)  => api.get('/admin/attendance/alerts', { params }),
  generateAlerts:         (params)  => api.post('/admin/attendance/alerts/generate', null, { params }),
  resolveAlert:           (id)      => api.patch(`/admin/attendance/alerts/${id}/resolve`),
  getAttendanceDashboard: ()        => api.get('/admin/attendance/dashboard'),
  getTodayClasses:        ()        => api.get('/admin/attendance/today'),
  copyPreviousAttendance: (classId) => api.get(`/admin/attendance/${classId}/copy-previous`),
  saveAttendanceDraft:    (classId, records) => api.post(`/admin/attendance/${classId}`, { records }, { params: { submit: false } }),
  submitAttendance:       (classId, records) => api.post(`/admin/attendance/${classId}`, { records }, { params: { submit: true } }),
  editAttendanceRecord:   (id, data) => api.put(`/admin/attendance/${id}`, data),
  getCorrections:         (params)  => api.get('/admin/attendance/corrections', { params }),
  reviewCorrection:       (id, data) => api.put(`/admin/attendance/corrections/${id}`, data),
  getAttendancePolicy:    (params)  => api.get('/admin/attendance/policy', { params }),
  saveAttendancePolicy:   (data)    => api.put('/admin/attendance/policy', data),
  getAttendanceHistory:   (params)  => api.get('/admin/attendance/history', { params }),
  exportCSV:              (params)  => api.get('/reports/export', { params }),

  // Quizzes
  getQuizzes: (params) => api.get('/admin/quizzes', { params }),
  createQuiz: (data) => api.post('/admin/quizzes', data),
  updateQuiz: (id, data) => api.patch(`/admin/quizzes/${id}`, data),
  publishQuiz: (id) => api.post(`/admin/quizzes/${id}/publish`),
  getQuizResults: (id) => api.get(`/admin/quizzes/${id}/results`),
  getQuizLeaderboard: (id) => api.get(`/admin/quizzes/${id}/leaderboard`),
  addQuestion: (quizId, data) => api.post(`/admin/quizzes/${quizId}/questions`, data),
  deleteQuestion: (quizId, qId) => api.delete(`/admin/quizzes/${quizId}/questions/${qId}`),

  // Interview Questions
  getInterviewQuestions: (params) => api.get('/admin/interview-questions', { params }),
  createInterviewQuestion: (data) => api.post('/admin/interview-questions', data),
  updateInterviewQuestion: (id, data) => api.patch(`/admin/interview-questions/${id}`, data),
  deleteInterviewQuestion: (id) => api.delete(`/admin/interview-questions/${id}`),

  // Admin Company Drives
  getDrives:              (p)           => api.get('/admin/drives', { params: p }),
  createDrive:            (d)           => api.post('/admin/drives', d),
  updateDrive:            (id, d)       => api.patch(`/admin/drives/${id}`, d),
  updateDriveStatus:      (id, status)  => api.patch(`/admin/drives/${id}/status`, { status }),
  getDriveApplications:   (id)          => api.get(`/admin/drives/${id}/applications`),
  updateDriveApplication: (driveId, appId, d) => api.patch(`/admin/drives/${driveId}/applications/${appId}`, d),

  // Placement
  getPlacement: (params) => api.get('/admin/placement', { params }),
  updatePlacementStatus: (studentId, status) => api.patch(`/admin/placement/${studentId}/status`, { status }),
  getMockInterviews: (params) => api.get('/admin/mock-interviews', { params }),
  scheduleMockInterview: (data) => api.post('/admin/mock-interviews', data),
  updateMockInterview: (id, data) => api.patch(`/admin/mock-interviews/${id}`, data),

  // Assignments
  getAssignments: (params) => api.get('/admin/assignments', { params }),
  createAssignment: (data) => api.post('/admin/assignments', data),
  getSubmissions: (id) => api.get(`/admin/assignments/${id}/submissions`),
  gradeSubmission: (assignmentId, subId, data) => api.patch(`/admin/assignments/${assignmentId}/submissions/${subId}`, data),

  // Announcements
  getAnnouncements: (params) => api.get('/admin/announcements', { params }),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  updateAnnouncement: (id, data) => api.patch(`/admin/announcements/${id}`, data),
  publishAnnouncement: (id) => api.patch(`/admin/announcements/${id}/publish`),
  scheduleAnnouncement: (id, scheduledAt) => api.patch(`/admin/announcements/${id}/schedule`, { scheduledAt }),
  submitAnnouncementForApproval: (id) => api.post(`/admin/announcements/${id}/submit-for-approval`),
  approveAnnouncement: (id) => api.post(`/admin/announcements/${id}/approve`),
  rejectAnnouncement: (id) => api.post(`/admin/announcements/${id}/reject`),
  duplicateAnnouncement: (id) => api.post(`/admin/announcements/${id}/duplicate`),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  getAnnouncementAnalytics: (id) => api.get(`/admin/announcements/${id}/analytics`),
  getAnnouncementHistory: (id) => api.get(`/admin/announcements/${id}/history`),
  getAnnouncementSuggestions: () => api.get('/admin/announcements/suggestions'),
  getAnnouncementComments: (id) => api.get(`/admin/announcements/${id}/comments`),
  addAnnouncementComment: (id, data) => api.post(`/admin/announcements/${id}/comments`, data),
  previewAnnouncementPlaceholders: (title, body) => api.post('/admin/announcements/preview-placeholders', { title, body }),

  // Announcement Templates
  getAnnouncementTemplates: () => api.get('/admin/announcement-templates'),
  createAnnouncementTemplate: (data) => api.post('/admin/announcement-templates', data),
  updateAnnouncementTemplate: (id, data) => api.patch(`/admin/announcement-templates/${id}`, data),
  deleteAnnouncementTemplate: (id) => api.delete(`/admin/announcement-templates/${id}`),
  applyAnnouncementTemplate: (templateId, variables) => api.post('/admin/announcement-templates/apply', { templateId, variables }),

  // Notifications
  getNotifications:    ()    => api.get('/admin/notifications'),
  markNotifRead:       (id)  => api.patch(`/admin/notifications/${id}/read`),
  markAllNotifsRead:   ()    => api.patch('/admin/notifications/read-all'),
  getUnreadCount:      ()    => api.get('/admin/notifications/unread-count'),
}

export const studentApi = {
  getDashboard:      ()         => api.get('/student/dashboard'),
  getCourses:        ()         => api.get('/student/courses'),
  getCourse:         (id)       => api.get(`/student/courses/${id}`),
  getSyllabus:       (id)       => api.get(`/student/courses/${id}/syllabus`),
  getMaterials:      (id)       => api.get(`/student/courses/${id}/materials`),
  getSessions:       (id)       => api.get(`/student/courses/${id}/sessions`),
  getClasses:        (status)   => api.get(`/student/classes?status=${status || ''}`),
  getAttendance:     (month)    => api.get(`/student/attendance?month=${month || ''}`),
  getAttSummary:     ()         => api.get('/student/attendance/summary'),
  getAttendanceTrend: ()        => api.get('/student/attendance/trend'),
  getAttendanceHealth: ()       => api.get('/student/attendance/health'),
  getAttendanceGoal:  ()        => api.get('/student/attendance/goal'),
  setAttendanceGoal:  (targetPercentage) => api.post('/student/attendance/goal', { targetPercentage }),
  getCalendarDay:     (date)    => api.get('/student/attendance/calendar/day', { params: { date } }),
  getMyCorrections:   ()        => api.get('/student/attendance/corrections'),
  requestCorrection:  (data)    => api.post('/student/attendance/corrections', data),
  getAssignments:    ()         => api.get('/student/assignments'),
  submitAssignment:  (id, form) => api.post(`/student/assignments/${id}/submit`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getQuizzes:        ()         => api.get('/student/quizzes'),
  getQuiz:           (id)       => api.get(`/student/quizzes/${id}`),
  submitQuiz:        (id, body) => api.post(`/student/quizzes/${id}/attempt`, body),
  getQuizLeaderboard:(id)       => api.get(`/student/quizzes/${id}/leaderboard`),
  getQuizAnalytics:  ()         => api.get('/student/quiz-analytics'),
  getInterviewPrep:  (p)        => api.get('/student/interview-prep', { params: p }),
  getPlacement:      ()         => api.get('/student/placement'),
  getMockInterviews: ()         => api.get('/student/mock-interviews'),
  getNotifications:  ()         => api.get('/student/notifications'),
  markRead:          (id)       => api.patch(`/student/notifications/${id}/read`),
  markAllRead:       ()         => api.patch('/student/notifications/read-all'),
  getActivity:       ()         => api.get('/student/activity'),

  // Placement Hub
  getPlacementHub:          ()      => api.get('/student/placement/hub'),
  updatePlacementProfile:   (d)     => api.patch('/student/placement/profile', d),

  // Resume
  getResume:                ()      => api.get('/student/resume'),
  saveResume:               (d)     => api.put('/student/resume', d),

  // Skills
  getSkills:                ()      => api.get('/student/skills'),
  addSkill:                 (d)     => api.post('/student/skills', d),
  updateSkill:              (id, d) => api.patch(`/student/skills/${id}`, d),
  deleteSkill:              (id)    => api.delete(`/student/skills/${id}`),

  // Drives
  getDrives:                ()      => api.get('/student/drives'),
  expressInterest:          (id)    => api.post(`/student/drives/${id}/interest`),

  // Resume upload (actual PDF file - distinct from the Resume Builder above)
  uploadResumeFile:         (form)  => api.post('/student/resume-file', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Mock Analytics
  getMockAnalytics:         ()      => api.get('/student/mock-analytics'),

  // Announcements
  getAnnouncements:         ()      => api.get('/student/announcements'),
  markAnnouncementViewed:   (id)    => api.post(`/student/announcements/${id}/view`),
  acknowledgeAnnouncement:  (id)    => api.post(`/student/announcements/${id}/acknowledge`),
  getAnnouncementComments:  (id)    => api.get(`/student/announcements/${id}/comments`),
  addAnnouncementComment:   (id, data) => api.post(`/student/announcements/${id}/comments`, data),
}
