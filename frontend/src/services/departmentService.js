import apiCall from '@/utilities/apiCall'

const departmentService = {
  // Departments are scoped to a college (e.g. "Computer Science" at
  // "National College of Engineering") - not to a CareerLabs course.
  list: (collegeId, search) => apiCall({
    method: 'GET',
    url: '/departments',
    params: { collegeId, ...(search ? { search } : {}) },
  }),

  get: (id) => apiCall({ method: 'GET', url: `/departments/${id}` }),

  create: (department) => apiCall({ method: 'POST', url: '/departments', data: department }),

  update: (id, department) => apiCall({ method: 'PUT', url: `/departments/${id}`, data: department }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/departments/${id}` }),
}

export default departmentService
