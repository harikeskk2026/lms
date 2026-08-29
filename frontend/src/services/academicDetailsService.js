import apiCall from '@/utilities/apiCall'

const academicDetailsService = {
  get: (studentId) => apiCall({ method: 'GET', url: `/students/${studentId}/academic-details` }),

  update: (studentId, data) => apiCall({ method: 'PUT', url: `/students/${studentId}/academic-details`, data }),
}

export default academicDetailsService
