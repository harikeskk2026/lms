import axios from 'axios'
import toast from 'react-hot-toast'
import tokenStorage from '@/utilities/tokenStorage'

// The API base URL is configured exclusively via the environment variable NEXT_PUBLIC_JAVA_API_URL.
const BASE_URL = process.env.NEXT_PUBLIC_JAVA_API_URL

if (!BASE_URL && typeof window !== 'undefined') {
  console.error('[api.js] Configuration error: NEXT_PUBLIC_JAVA_API_URL is not defined in the environment.')
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
})

// ─── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use(config => {
  if (!config.baseURL) {
    throw new Error('API configuration error: NEXT_PUBLIC_JAVA_API_URL environment variable is not configured.')
  }
  const token = tokenStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── De-dupe concurrent identical GET requests ────────────────────────────────
// Several independent components (e.g. the sidebar badge counts and a page's
// own data hook) fetch the same endpoint on mount within the same tick - e.g.
// notifications is fetched by StudentShell, NotificationDropdown and
// useNotifications() all at once on dashboard load. Rather than firing 3
// identical network requests, share the in-flight promise for any GET with
// the same url+params; the entry is cleared as soon as it settles, so this
// never serves stale data on a later, separate fetch.
const inFlightGETs = new Map()
const rawRequest = api.request.bind(api)
api.request = (config = {}) => {
  if ((config.method || 'get').toLowerCase() !== 'get') return rawRequest(config)

  const key = `${config.url}?${JSON.stringify(config.params || {})}`
  const pending = inFlightGETs.get(key)
  if (pending) return pending

  const promise = rawRequest(config).finally(() => inFlightGETs.delete(key))
  inFlightGETs.set(key, promise)
  return promise
}

// ─── Response: on an expired/invalid session, log out once and redirect ──────
// The API has no refresh-token endpoint - a 401 here means the token is gone
// for good, so there's nothing to retry. Log out immediately instead of
// letting every subsequent call (including polling components) 401 again and
// show its own error - that's what caused "authorization error" to reappear
// repeatedly instead of the user just being sent back to the login page once.
let sessionExpiredHandled = false

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const alreadyOnLogin = window.location.pathname.startsWith('/login')
      if (!alreadyOnLogin && !sessionExpiredHandled) {
        sessionExpiredHandled = true
        tokenStorage.clear()
        toast.error(err.response?.data?.message || 'Your session has expired. Please log in again.')
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)

export default api

// Files (e.g. assignment attachments, submissions) come back from the API as
// paths relative to the API origin (e.g. "/uploads/assignments/x.pdf"), not
// the frontend origin — resolve them to an absolute URL before linking.
const API_ORIGIN = (BASE_URL || '').replace(/\/api\/?$/, '')

export function resolveFileUrl(path) {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined') {
    return normalized
  }
  return `${API_ORIGIN}${normalized}`
}

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  getSuperAdminDashboard: () => api.get('/admin/dashboard/superadmin'),
  getTrainerDashboard: () => api.get('/admin/dashboard/trainer'),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),

  // Admins (SUPERADMIN only)
  getAdmins: (params) => api.get('/admin/admins', { params }),
  createAdmin: (data) => api.post('/admin/admins', data),
  toggleAdminStatus: (id) => api.patch(`/admin/admins/${id}/status`),
  resetUserPassword: (userId, newPassword) => api.post(`/admin/users/${userId}/reset-password`, { newPassword }),
  resetStudentPassword: (id, data) => {
    const pwd = data?.newPassword || data?.password || data
    const val = typeof pwd === 'string' ? pwd : pwd?.newPassword
    return api.post(`/admin/users/${id}/reset-password`, { newPassword: val })
  },
  resetTrainerPassword: (id, newPassword) => {
    const val = typeof newPassword === 'string' ? newPassword : newPassword?.newPassword || newPassword?.password
    return api.post(`/admin/users/${id}/reset-password`, { newPassword: val })
  },

  // Students
  getStudents: (params) => api.get('/admin/students', { params }),
  createStudent: (data) => api.post('/admin/students', data),
  getStudentDetail: (id) => api.get(`/admin/students/${id}`),
  updateStudent: (id, data) => api.patch(`/admin/students/${id}`, data),
  toggleStudentStatus: (id) => api.patch(`/admin/students/${id}/status`),

  // Trainers
  getTrainers: (params) => api.get('/trainers', { params }),
  createTrainer: (data) => api.post('/trainers', data),
  getTrainerDetail: (id) => api.get(`/trainers/${id}`),
  updateTrainer: (id, data) => api.put(`/trainers/${id}`, data),
  toggleTrainerStatus: (id) => api.patch(`/trainers/${id}/status`),
  deleteTrainer: (id) => api.delete(`/trainers/${id}`),


  // Batches
  getBatches: (params) => api.get('/batches', { params }),
  createBatch: (data) => api.post('/batches', data),
  getBatchDetail: (id) => api.get(`/batches/${id}`),
  updateBatch: (id, data) => api.put(`/batches/${id}`, data),
  toggleBatchStatus: (id) => api.patch(`/batches/${id}/status`),
  enrollStudent: (batchId, studentId) => api.post(`/admin/batches/${batchId}/enroll`, { studentId }),
  removeFromBatch: (batchId, studentId) => api.delete(`/admin/batches/${batchId}/students/${studentId}`),

  // Classes
  getClasses: (params) => api.get('/admin/classes', { params }),

  // Attendance
  getAttendanceSheet: (classId) => api.get(`/admin/attendance/${classId}`),
  markAttendance: (classId, records) => api.post(`/admin/attendance/${classId}`, { records }),
  // Attendance system
  getAttendanceOverview: () => api.get('/admin/attendance'),
  getAttendanceAnalytics: (params) => api.get('/admin/attendance/analytics', { params }),
  getLowAttendance: (params) => api.get('/admin/attendance/low', { params }),
  getStudentAttHistory: (id) => api.get(`/admin/attendance/student/${id}`),
  getBatchAttDetail: (id, p) => api.get(`/admin/attendance/batch/${id}`, { params: p }),
  getAttendanceAlerts: (params) => api.get('/admin/attendance/alerts', { params }),
  generateAlerts: (params) => api.post('/admin/attendance/alerts/generate', null, { params }),
  resolveAlert: (id) => api.patch(`/admin/attendance/alerts/${id}/resolve`),
  getAttendanceDashboard: () => api.get('/admin/attendance/dashboard'),
  getTodayClasses: () => api.get('/admin/attendance/today'),
  copyPreviousAttendance: (classId) => api.get(`/admin/attendance/${classId}/copy-previous`),
  saveAttendanceDraft: (classId, records) => api.post(`/admin/attendance/${classId}`, { records }, { params: { submit: false } }),
  submitAttendance: (classId, records) => api.post(`/admin/attendance/${classId}`, { records }, { params: { submit: true } }),
  editAttendanceRecord: (id, data) => api.put(`/admin/attendance/${id}`, data),
  getCorrections: (params) => api.get('/admin/attendance/corrections', { params }),
  reviewCorrection: (id, data) => api.put(`/admin/attendance/corrections/${id}`, data),
  getAttendancePolicy: (params) => api.get('/admin/attendance/policy', { params }),
  saveAttendancePolicy: (data) => api.put('/admin/attendance/policy', data),
  getAttendanceHistory: (params) => api.get('/admin/attendance/history', { params }),
  exportCSV: (params) => api.get('/reports/export', { params }),

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
  getDrives: (p) => api.get('/admin/drives', { params: p }),
  createDrive: (d) => api.post('/admin/drives', d),
  updateDrive: (id, d) => api.patch(`/admin/drives/${id}`, d),
  updateDriveStatus: (id, status) => api.patch(`/admin/drives/${id}/status`, { status }),
  getDriveApplications: (id) => api.get(`/admin/drives/${id}/applications`),
  updateDriveApplication: (driveId, appId, d) => api.patch(`/admin/drives/${driveId}/applications/${appId}`, d),

  // Placement
  getPlacement: (params) => api.get('/students', { params }),
  updatePlacementStatus: (studentId, status) => api.put(`/students/${studentId}`, { placementStatus: status }),
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
  getNotifications: () => api.get('/admin/notifications'),
  markNotifRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotifsRead: () => api.patch('/admin/notifications/read-all'),
  getUnreadCount: () => api.get('/admin/notifications/unread-count'),
}

export const studentApi = {
  getDashboard: () => api.get('/student/dashboard'),
  getCourses: () => api.get('/student/courses'),
  getCourse: (id) => api.get(`/student/courses/${id}`),
  getSyllabus: (id) => api.get(`/student/courses/${id}/syllabus`),
  getMaterials: (id) => api.get(`/student/courses/${id}/materials`),
  getClasses: (status) => api.get(`/student/classes?status=${status || ''}`),
  getAttendance: (month) => api.get(`/student/attendance?month=${month || ''}`),
  getAttSummary: () => api.get('/student/attendance/summary'),
  getAttendanceTrend: () => api.get('/student/attendance/trend'),
  getAttendanceHealth: () => api.get('/student/attendance/health'),
  getAttendanceGoal: () => api.get('/student/attendance/goal'),
  setAttendanceGoal: (targetPercentage) => api.post('/student/attendance/goal', { targetPercentage }),
  getCalendarDay: (date) => api.get('/student/attendance/calendar/day', { params: { date } }),
  getMyCorrections: () => api.get('/student/attendance/corrections'),
  requestCorrection: (data) => api.post('/student/attendance/corrections', data),
  getAssignments: () => api.get('/student/assignments'),
  submitAssignment: (id, form) => api.post(`/assignments/${id}/submissions`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getQuizzes: () => api.get('/student/quizzes'),
  getQuiz: (id) => api.get(`/student/quizzes/${id}`),
  submitQuiz: (id, body) => api.post(`/student/quizzes/${id}/attempt`, body),
  getQuizLeaderboard: (id) => api.get(`/student/quizzes/${id}/leaderboard`),
  getQuizAnalytics: () => api.get('/student/quiz-analytics'),
  getInterviewPrep: (p) => api.get('/student/interview-prep', { params: p }),
  getPlacement: () => api.get('/student/placement'),
  getMockInterviews: () => api.get('/student/mock-interviews'),
  getNotifications: () => api.get('/student/notifications'),
  markRead: (id) => api.patch(`/student/notifications/${id}/read`),
  markAllRead: () => api.patch('/student/notifications/read-all'),
  getActivity: () => api.get('/student/activity'),

  // Placement Hub
  getPlacementHub: () => api.get('/student/placement/hub'),
  updatePlacementProfile: (d) => api.patch('/student/placement/profile', d),

  // Resume
  getResume: () => api.get('/student/resume'),
  saveResume: (d) => api.put('/student/resume', d),

  // Skills
  getSkills: () => api.get('/student/skills'),
  addSkill: (d) => api.post('/student/skills', d),
  updateSkill: (id, d) => api.patch(`/student/skills/${id}`, d),
  deleteSkill: (id) => api.delete(`/student/skills/${id}`),

  // Drives
  getDrives: () => api.get('/student/drives'),
  expressInterest: (id) => api.post(`/student/drives/${id}/interest`),

  // Resume upload (actual PDF file - distinct from the Resume Builder above)
  uploadResumeFile: (form) => api.post('/student/resume-file', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Mock Analytics
  getMockAnalytics: () => api.get('/student/mock-analytics'),

  // Announcements
  getAnnouncements: () => api.get('/student/announcements'),
  markAnnouncementViewed: (id) => api.post(`/student/announcements/${id}/view`),
  acknowledgeAnnouncement: (id) => api.post(`/student/announcements/${id}/acknowledge`),
  getAnnouncementComments: (id) => api.get(`/student/announcements/${id}/comments`),
  addAnnouncementComment: (id, data) => api.post(`/student/announcements/${id}/comments`, data),
}
