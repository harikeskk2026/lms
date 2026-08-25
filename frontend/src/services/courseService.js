import apiCall from '@/utilities/apiCall'

const courseService = {
  list: () => apiCall({ method: 'GET', url: '/courses' }),

  get: (id) => apiCall({ method: 'GET', url: `/courses/${id}` }),

  create: (course) => apiCall({ method: 'POST', url: '/courses', data: course }),

  update: (id, course) => apiCall({ method: 'PUT', url: `/courses/${id}`, data: course }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/courses/${id}` }),
}

export default courseService
