import apiCall from '@/utilities/apiCall'

const collegeService = {
  list: (search) => apiCall({ method: 'GET', url: '/colleges', params: search ? { search } : undefined }),

  get: (id) => apiCall({ method: 'GET', url: `/colleges/${id}` }),

  getCourses: (id) => apiCall({ method: 'GET', url: `/colleges/${id}/courses` }),

  create: (college) => apiCall({ method: 'POST', url: '/colleges', data: college }),

  update: (id, college) => apiCall({ method: 'PUT', url: `/colleges/${id}`, data: college }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/colleges/${id}` }),
}

export default collegeService
