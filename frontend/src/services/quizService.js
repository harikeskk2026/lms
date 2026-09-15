import apiCall from '@/utilities/apiCall'

const quizService = {
  // Admin - quizzes
  listQuizzes: () => apiCall({ method: 'GET', url: '/admin/quizzes' }),
  getQuiz: (id) => apiCall({ method: 'GET', url: `/admin/quizzes/${id}` }),
  createQuiz: (quiz) => apiCall({ method: 'POST', url: '/admin/quizzes', data: quiz }),
  updateQuiz: (id, quiz) => apiCall({ method: 'PUT', url: `/admin/quizzes/${id}`, data: quiz }),
  removeQuiz: (id) => apiCall({ method: 'DELETE', url: `/admin/quizzes/${id}` }),
  attachQuestions: (quizId, questionIds) =>
    apiCall({ method: 'POST', url: `/admin/quizzes/${quizId}/questions`, data: { questionIds } }),
  detachQuestion: (quizId, questionId) =>
    apiCall({ method: 'DELETE', url: `/admin/quizzes/${quizId}/questions/${questionId}` }),
  reorderQuestions: (quizId, items) =>
    apiCall({ method: 'PUT', url: `/admin/quizzes/${quizId}/questions/reorder`, data: { items } }),

  // Admin - quiz assignment & result release
  assignQuiz: (quizId, data) => apiCall({ method: 'POST', url: `/admin/quizzes/${quizId}/assignments`, data }),
  getQuizAssignments: (quizId) => apiCall({ method: 'GET', url: `/admin/quizzes/${quizId}/assignments` }),
  removeQuizAssignment: (quizId, assignmentId) =>
    apiCall({ method: 'DELETE', url: `/admin/quizzes/${quizId}/assignments/${assignmentId}` }),
  releaseResults: (quizId) => apiCall({ method: 'POST', url: `/admin/quizzes/${quizId}/release-results` }),

  // Admin - quiz attempts & review
  getQuizAttempts: (quizId) => apiCall({ method: 'GET', url: `/admin/quizzes/${quizId}/attempts` }),
  getAdminAttemptReview: (quizId, attemptId) =>
    apiCall({ method: 'GET', url: `/admin/quizzes/${quizId}/attempts/${attemptId}` }),

  // Admin - question bank
  listQuestions: (filters = {}) => apiCall({ method: 'GET', url: '/admin/questions', params: filters }),
  getQuestion: (id) => apiCall({ method: 'GET', url: `/admin/questions/${id}` }),
  createQuestion: (question) => apiCall({ method: 'POST', url: '/admin/questions', data: question }),
  updateQuestion: (id, question) => apiCall({ method: 'PUT', url: `/admin/questions/${id}`, data: question }),
  deleteQuestion: (id) => apiCall({ method: 'DELETE', url: `/admin/questions/${id}/permanent` }),
  deactivateQuestion: (id) => apiCall({ method: 'DELETE', url: `/admin/questions/${id}` }),

  // Admin - topics
  listTopics: () => apiCall({ method: 'GET', url: '/admin/quiz-topics' }),
  createTopic: (topic) => apiCall({ method: 'POST', url: '/admin/quiz-topics', data: topic }),

  // Admin - analytics
  getAdminQuizAnalytics: (id) => apiCall({ method: 'GET', url: `/admin/quizzes/${id}/analytics` }),
  getAdminQuestionAnalytics: (id) => apiCall({ method: 'GET', url: `/admin/questions/${id}/analytics` }),

  // Admin - create quiz from PDF
  extractQuestionsFromPdf: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall({
      method: 'POST',
      url: '/admin/quizzes/pdf-import/preview',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadSourcePdf: (quizId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall({
      method: 'POST',
      url: `/admin/quizzes/${quizId}/source-pdf`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Student - quizzes + attempts
  listStudentQuizzes: () => apiCall({ method: 'GET', url: '/student/quizzes' }),
  getStudentQuiz: (id) => apiCall({ method: 'GET', url: `/student/quizzes/${id}` }),
  startQuiz: (id) => apiCall({ method: 'POST', url: `/student/quizzes/${id}/start` }),
  saveAnswer: (attemptId, answer) =>
    apiCall({ method: 'POST', url: `/student/quiz-attempts/${attemptId}/answers`, data: answer }),
  submitAttempt: (attemptId) => apiCall({ method: 'POST', url: `/student/quiz-attempts/${attemptId}/submit` }),
  listMyAttempts: () => apiCall({ method: 'GET', url: '/student/quiz-attempts' }),
  getAttempt: (id) => apiCall({ method: 'GET', url: `/student/quiz-attempts/${id}` }),

  // Student - analytics + weak areas
  getQuizAnalytics: () => apiCall({ method: 'GET', url: '/student/quiz-analytics' }),
  getWeakAreas: () => apiCall({ method: 'GET', url: '/student/weak-areas' }),
  createPracticeQuiz: () => apiCall({ method: 'POST', url: '/student/weak-areas/practice' }),
  getSkillAssessment: () => apiCall({ method: 'GET', url: '/student/skill-assessment' }),
  getInterviewSimulation: (attemptId) => apiCall({ method: 'GET', url: `/student/quiz-attempts/${attemptId}/interview-simulation` }),

  // Student - leaderboard, daily challenge, achievements
  getLeaderboard: (type = 'GLOBAL') => apiCall({ method: 'GET', url: '/student/leaderboard', params: { type } }),
  getDailyChallenge: () => apiCall({ method: 'GET', url: '/student/daily-challenge' }),
  startDailyChallenge: () => apiCall({ method: 'POST', url: '/student/daily-challenge/start' }),
  getAchievements: () => apiCall({ method: 'GET', url: '/student/achievements' }),
}

export default quizService
