import apiCall from '@/utilities/apiCall'

const academicDetailsService = {
  get: (studentId) => apiCall({ method: 'GET', url: `/students/${studentId}/academic-details` }),

  update: (studentId, data) => apiCall({ method: 'PUT', url: `/students/${studentId}/academic-details`, data }),

  // Student self-service — same AcademicDetails row as above, scoped to the
  // caller's own account via the JWT instead of an admin-supplied studentId.
  getMine: () => apiCall({ method: 'GET', url: '/student/academic-details' }),

  updateMine: (data) => apiCall({ method: 'PUT', url: '/student/academic-details', data }),
}

export default academicDetailsService
