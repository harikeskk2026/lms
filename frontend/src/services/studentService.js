import apiCall from '@/utilities/apiCall'

const studentService = {
  list: (params) => apiCall({ method: 'GET', url: '/students', params }),

  count: () => apiCall({ method: 'GET', url: '/students/count' }),

  get: (id) => apiCall({ method: 'GET', url: `/students/${id}` }),

  create: (student) => apiCall({ method: 'POST', url: '/students', data: student }),

  update: (id, student) => apiCall({ method: 'PUT', url: `/students/${id}`, data: student }),

  updatePlacementStatus: (id, placementStatus) => apiCall({
    method: 'PATCH',
    url: `/students/${id}/placement-status`,
    data: { placementStatus },
  }),

  toggleStatus: (id) => apiCall({ method: 'PATCH', url: `/students/${id}/status` }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/students/${id}` }),

  bulkImport: ({ file, enrollImportedStudents, defaultCourseId, defaultBatchId }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('enrollImportedStudents', enrollImportedStudents ? 'true' : 'false')
    if (defaultCourseId) formData.append('defaultCourseId', defaultCourseId)
    if (defaultBatchId) formData.append('defaultBatchId', defaultBatchId)
    return apiCall({
      method: 'POST',
      url: '/students/bulk-import',
      data: formData,
    })
  },
}

export default studentService
