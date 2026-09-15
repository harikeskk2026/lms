import apiCall from '@/utilities/apiCall'

const courseService = {
  list: () => apiCall({ method: 'GET', url: '/courses' }),

  get: (id) => apiCall({ method: 'GET', url: `/courses/${id}` }),

  create: (course) => apiCall({ method: 'POST', url: '/courses', data: course }),

  update: (id, course) => apiCall({ method: 'PUT', url: `/courses/${id}`, data: course }),

  updateStatus: (id, status) => apiCall({ method: 'PATCH', url: `/courses/${id}/status`, data: { status } }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/courses/${id}` }),

  getEnrollmentContact: () => apiCall({ method: 'GET', url: '/student/enrollment-contact' }),

  mine: () => apiCall({ method: 'GET', url: '/courses/mine' }),

  getEnrollments: (courseId, params) => apiCall({ method: 'GET', url: `/courses/${courseId}/enrollments`, params }),

  enrollStudent: (courseId, data) => apiCall({ method: 'POST', url: `/courses/${courseId}/enroll`, data }),

  bulkEnrollStudents: (courseId, data) => apiCall({ method: 'POST', url: `/courses/${courseId}/enrollments/bulk`, data }),

  unenrollStudent: (courseId, enrollmentId) => apiCall({ method: 'DELETE', url: `/courses/${courseId}/enrollments/${enrollmentId}` }),
}

export default courseService
