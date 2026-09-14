import api, { getApiBaseUrl, resolveFileUrl } from './axiosClient'

export { getApiBaseUrl, resolveFileUrl }
export default api


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
  getStudents: (params) => api.get('/students', { params }),
  createStudent: (data) => api.post('/students', data),
  getStudentDetail: (id) => api.get(`/students/${id}`),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  toggleStudentStatus: (id) => api.patch(`/students/${id}/status`),

  // Trainers
  getTrainers: (params) => api.get('/trainers', { params }),
  createTrainer: (data) => api.post('/trainers', data),
  getTrainerDetail: (id) => api.get(`/trainers/${id}`),
  updateTrainer: (id, data) => api.put(`/trainers/${id}`, data),
  toggleTrainerStatus: (id) => api.patch(`/trainers/${id}/status`),
  deleteTrainer: (id) => api.delete(`/trainers/${id}`),


  // Courses
  getCourses: (params) => api.get('/courses', { params }),

  // Batches
  getBatches: (params) => api.get('/batches', { params }),
  getCourses: () => api.get('/courses'),
  createBatch: (data) => api.post('/batches', data),
  getBatchDetail: (id) => api.get(`/batches/${id}`),
  updateBatch: (id, data) => api.put(`/batches/${id}`, data),
  toggleBatchStatus: (id) => api.patch(`/batches/${id}/status`),
  enrollStudent: (batchId, studentId) => api.post(`/admin/batches/${batchId}/enroll`, { studentId }),
  removeFromBatch: (batchId, studentId) => api.delete(`/admin/batches/${batchId}/students/${studentId}`),

  // Classes
  getClasses: (params) => api.get('/admin/classes', { params }),
  createClass: (data) => api.post('/admin/classes', data),
  updateClass: (id, data) => api.patch(`/admin/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/admin/classes/${id}`),

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
  getTodayClasses: (date) => api.get('/admin/attendance/today', { params: date ? { date } : {} }),
  copyPreviousAttendance: (classId) => api.get(`/admin/attendance/${classId}/copy-previous`),
  saveAttendanceDraft: (classId, records) => api.post(`/admin/attendance/${classId}`, { records }, { params: { submit: false } }),
  submitAttendance: (classId, records) => api.post(`/admin/attendance/${classId}`, { records }, { params: { submit: true } }),
  editAttendanceRecord: (id, data) => api.put(`/admin/attendance/${id}`, data),
  getCorrections: (params) => api.get('/admin/attendance/corrections', { params }),
  reviewCorrection: (id, data) => api.put(`/admin/attendance/corrections/${id}`, data),
  verifyCorrection: (id) => api.get(`/admin/attendance/corrections/${id}/verify`),
  getAttendancePolicy: (params) => api.get('/admin/attendance/policy', { params }),
  saveAttendancePolicy: (data) => api.put('/admin/attendance/policy', data),
  getAttendanceHistory: (params) => api.get('/admin/attendance/history', { params }),
  getAttendanceAuditLogs: (params) => api.get('/admin/attendance/audit-logs', { params }),
  getStudentAuditLogs: (id) => api.get(`/admin/attendance/student/${id}/audit-logs`),
  exportCSV: (params) => api.get('/reports/export', { params }),

  // Meeting Links / Scheduled Classes
  getMeetings: (params) => api.get('/admin/meetings', { params }),
  createMeeting: (data) => api.post('/admin/meetings', data),
  updateMeeting: (id, data) => api.put(`/admin/meetings/${id}`, data),
  updateMeetingStatus: (id, status) => api.patch(`/admin/meetings/${id}/status`, null, { params: { status } }),
  deleteMeeting: (id) => api.delete(`/admin/meetings/${id}`),
  getMeetingAttendees: (id) => api.get(`/admin/meetings/${id}/attendees`),

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

  // Aptitude Tips
  getAptitudeTips: (params) => api.get('/admin/aptitude-tips', { params }),
  createAptitudeTip: (data) => api.post('/admin/aptitude-tips', data),
  updateAptitudeTip: (id, data) => api.patch(`/admin/aptitude-tips/${id}`, data),
  deleteAptitudeTip: (id) => api.delete(`/admin/aptitude-tips/${id}`),

  // Interview Resources
  getInterviewResources: (params) => api.get('/admin/interview-resources', { params }),
  createInterviewResource: (data) => api.post('/admin/interview-resources', data),
  updateInterviewResource: (id, data) => api.patch(`/admin/interview-resources/${id}`, data),
  deleteInterviewResource: (id) => api.delete(`/admin/interview-resources/${id}`),

  // Admin Company Drives
  getDrives: (p) => api.get('/admin/drives', { params: p }),
  createDrive: (d) => api.post('/admin/drives', d),
  updateDrive: (id, d) => api.patch(`/admin/drives/${id}`, d),
  deleteDrive: (id) => api.delete(`/admin/drives/${id}`),
  getDriveApplications: (id) => api.get(`/admin/drives/${id}/applications`),
  getApplicationHistory: (driveId, appId) => api.get(`/admin/drives/${driveId}/applications/${appId}/history`),
  updateDriveApplication: (driveId, appId, d) => api.patch(`/admin/drives/${driveId}/applications/${appId}`, d),

  // Interview rounds & scheduling (real placement interviews per drive)
  getInterviewRounds: (driveId) => api.get(`/admin/drives/${driveId}/interviews/rounds`),
  createInterviewRound: (driveId, d) => api.post(`/admin/drives/${driveId}/interviews/rounds`, d),
  deleteInterviewRound: (driveId, roundId) => api.delete(`/admin/drives/${driveId}/interviews/rounds/${roundId}`),
  getInterviews: (driveId) => api.get(`/admin/drives/${driveId}/interviews`),
  scheduleInterview: (driveId, d) => api.post(`/admin/drives/${driveId}/interviews`, d),
  completeInterview: (driveId, interviewId, d) => api.patch(`/admin/drives/${driveId}/interviews/${interviewId}`, d),
  submitEvaluation: (driveId, d) => api.post(`/admin/drives/${driveId}/interviews/evaluations`, d),
  getInterviewEvaluations: (driveId, interviewId) => api.get(`/admin/drives/${driveId}/interviews/${interviewId}/evaluations`),

  // Placement
  getPlacement: (params) => api.get('/students', { params }),
  updatePlacementStatus: (studentId, status) => api.patch(`/students/${studentId}/placement-status`, { placementStatus: status }),
  getPlacementRecords: () => api.get('/admin/placement/placements'),
  recordPlacement: (d) => api.post('/admin/placement/placements', d),
  getMockInterviews: (params) => api.get('/admin/mock-interviews', { params }),
  scheduleMockInterview: (data) => api.post('/admin/mock-interviews', data),
  updateMockInterview: (id, data) => api.patch(`/admin/mock-interviews/${id}`, data),
  updateMockCandidate: (id, candidateId, data) => api.patch(`/admin/mock-interviews/${id}/candidates/${candidateId}`, data),

  // Preparation materials
  getPreparationMaterials: () => api.get('/admin/preparation-materials'),
  getPreparationMaterial: (id) => api.get(`/admin/preparation-materials/${id}`),
  createPreparationMaterial: (d) => api.post('/admin/preparation-materials', d),
  updatePreparationMaterial: (id, d) => api.patch(`/admin/preparation-materials/${id}`, d),
  deletePreparationMaterial: (id) => api.delete(`/admin/preparation-materials/${id}`),
  publishPreparationMaterial: (id) => api.post(`/admin/preparation-materials/${id}/publish`),
  archivePreparationMaterial: (id) => api.post(`/admin/preparation-materials/${id}/archive`),
  uploadPrepDocument: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/admin/preparation-materials/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  deletePrepDocument: (id, docId) => api.delete(`/admin/preparation-materials/${id}/documents/${docId}`),
  setPrepQuestions: (id, questions) => api.put(`/admin/preparation-materials/${id}/questions`, questions),

  // Offers
  getOffers: (driveId) => api.get('/admin/offers', { params: driveId ? { driveId } : {} }),
  issueOffer: (d) => api.post('/admin/offers', d),
  withdrawOffer: (id) => api.delete(`/admin/offers/${id}`),

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
  previewAnnouncementPlaceholders: (title, body, courseId, batchId) =>
    api.post('/admin/announcements/preview-placeholders', {
      title,
      body,
      courseId: courseId ? Number(courseId) : null,
      batchId: batchId ? Number(batchId) : null,
    }),
  getAnnouncementAudienceCount: (data) => api.post('/admin/announcements/audience-count', data),

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
  getAttSummary: (month) => api.get('/student/attendance/summary', { params: month ? { month } : {} }),
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
  getAptitudeTips: () => api.get('/student/interview-prep/aptitude-tips'),
  getInterviewResources: () => api.get('/student/interview-prep/resources'),
  getPlacement: () => api.get('/student/placement'),
  getMockInterviews: () => api.get('/student/mock-interviews'),

  // Preparation materials
  getPreparationMaterials: () => api.get('/student/preparation-materials'),
  getPreparationMaterial: (id) => api.get(`/student/preparation-materials/${id}`),
  downloadPrepDocument: (id, docId) => api.get(`/student/preparation-materials/${id}/documents/${docId}`, { responseType: 'blob' }),
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

  // Drives
  getDrives: () => api.get('/student/drives'),
  expressInterest: (id) => api.post(`/student/drives/${id}/interest`),
  withdrawInterest: (id) => api.delete(`/student/drives/${id}/interest`),

  // Offers
  getMyOffers: () => api.get('/student/offers'),
  acceptOffer: (id) => api.post(`/student/offers/${id}/accept`),
  rejectOffer: (id) => api.post(`/student/offers/${id}/reject`),

  // Placement interviews
  getMyInterviews: () => api.get('/student/interviews'),

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

  // Meeting Links
  getMeetings: () => api.get('/student/meetings'),
  getLiveMeetings: () => api.get('/student/meetings/live'),
  joinMeeting: (id) => api.post(`/student/meetings/${id}/join`),
}
