import apiCall from '@/utilities/apiCall'

const studentService = {
  list: (params) => apiCall({ method: 'GET', url: '/students', params }),

  count: () => apiCall({ method: 'GET', url: '/students/count' }),

  get: (id) => apiCall({ method: 'GET', url: `/students/${id}` }),

  create: (student) => apiCall({ method: 'POST', url: '/students', data: student }),

  update: (id, student) => apiCall({ method: 'PUT', url: `/students/${id}`, data: student }),

  toggleStatus: (id) => apiCall({ method: 'PATCH', url: `/students/${id}/status` }),
}

export default studentService
