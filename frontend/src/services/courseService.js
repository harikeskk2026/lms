import apiCall from '@/utilities/apiCall'

const courseService = {
  list: () => apiCall({ method: 'GET', url: '/courses' }),

  get: (id) => apiCall({ method: 'GET', url: `/courses/${id}` }),

  create: (course) => apiCall({ method: 'POST', url: '/courses', data: course }),

  update: (id, course) => apiCall({ method: 'PUT', url: `/courses/${id}`, data: course }),

  updateStatus: (id, status) => apiCall({ method: 'PATCH', url: `/courses/${id}/status`, data: { status } }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/courses/${id}` }),

  enroll: (id) => apiCall({ method: 'POST', url: `/courses/${id}/enroll` }),

  mine: () => apiCall({ method: 'GET', url: '/courses/mine' }),
}

export default courseService
