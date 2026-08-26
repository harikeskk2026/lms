import apiCall from '@/utilities/apiCall'

const reportService = {
  getAttendance: (params) => apiCall({ method: 'GET', url: '/reports/attendance', params }),

  getPerformance: (params) => apiCall({ method: 'GET', url: '/reports/performance', params }),

  getCoursePerformance: () => apiCall({ method: 'GET', url: '/reports/performance/courses' }),

  getBatchPerformance: (batchId) =>
    apiCall({ method: 'GET', url: batchId ? `/reports/performance/batches/${batchId}` : '/reports/performance/batches' }),

  getStudentPerformance: (studentId) => apiCall({ method: 'GET', url: `/reports/performance/students/${studentId}` }),

  getAtRiskStudents: (params) => apiCall({ method: 'GET', url: '/reports/at-risk', params }),

  getPlacement: (params) => apiCall({ method: 'GET', url: '/reports/placement', params }),

  getPlacementByBatch: () => apiCall({ method: 'GET', url: '/reports/placement/batches' }),

  export: (params) => apiCall({ method: 'GET', url: '/reports/export', params }),

  getOverview: () => apiCall({ method: 'GET', url: '/reports/overview' }),

  getBatchHealth: (batchId) =>
    apiCall({ method: 'GET', url: batchId ? `/reports/batch-health/${batchId}` : '/reports/batch-health' }),

  getQuizAnalytics: (params) => apiCall({ method: 'GET', url: '/reports/quiz', params }),

  getAssignmentAnalytics: (params) => apiCall({ method: 'GET', url: '/reports/assignments', params }),

  getEngagement: (params) => apiCall({ method: 'GET', url: '/reports/engagement', params }),

  getActivityTrend: () => apiCall({ method: 'GET', url: '/reports/activity-trend' }),

  getTopStudents: (params) => apiCall({ method: 'GET', url: '/reports/leaderboard/students', params }),

  getBatchLeaderboard: () => apiCall({ method: 'GET', url: '/reports/leaderboard/batches' }),

  getDecliningStudents: (params) => apiCall({ method: 'GET', url: '/reports/declining-students', params }),

  getPlacementReadiness: (params) => apiCall({ method: 'GET', url: '/reports/placement-readiness', params }),

  getCorrelations: (params) => apiCall({ method: 'GET', url: '/reports/correlations', params }),
}

export default reportService
