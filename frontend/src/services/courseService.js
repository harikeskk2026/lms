import apiCall from '@/utilities/apiCall'

const courseService = {
  list: (params, config) => apiCall({ method: 'GET', url: '/courses', params, ...config }),

  get: (id) => apiCall({ method: 'GET', url: `/courses/${id}` }),

  create: (course) => apiCall({ method: 'POST', url: '/courses', data: course }),

  update: (id, course) => apiCall({ method: 'PUT', url: `/courses/${id}`, data: course }),

  updateStatus: (id, status) => apiCall({ method: 'PATCH', url: `/courses/${id}/status`, data: { status } }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/courses/${id}` }),

  statusCounts: () => apiCall({ method: 'GET', url: '/courses/status-counts' }),

  getEnrollmentContact: () => apiCall({ method: 'GET', url: '/student/enrollment-contact' }),

  mine: () => apiCall({ method: 'GET', url: '/courses/mine' }),

  getEnrollments: (courseId, params, config) => apiCall({ method: 'GET', url: `/courses/${courseId}/enrollments`, params, ...config }),

  enrollStudent: (courseId, data) => apiCall({ method: 'POST', url: `/courses/${courseId}/enroll`, data }),

  bulkEnrollStudents: (courseId, data) => apiCall({ method: 'POST', url: `/courses/${courseId}/enrollments/bulk`, data }),

  unenrollStudent: (courseId, enrollmentId) => apiCall({ method: 'DELETE', url: `/courses/${courseId}/enrollments/${enrollmentId}` }),

  bulkImport: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall({ method: 'POST', url: '/courses/bulk-import', data: formData })
  },
}

export default courseService
