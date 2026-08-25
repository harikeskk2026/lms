import apiCall from '@/utilities/apiCall'

const departmentService = {
  list: (courseId, search) => apiCall({
    method: 'GET',
    url: '/departments',
    params: { courseId, ...(search ? { search } : {}) },
  }),

  get: (id) => apiCall({ method: 'GET', url: `/departments/${id}` }),

  create: (department) => apiCall({ method: 'POST', url: '/departments', data: department }),

  update: (id, department) => apiCall({ method: 'PUT', url: `/departments/${id}`, data: department }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/departments/${id}` }),
}

export default departmentService
