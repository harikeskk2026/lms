import apiCall from '@/utilities/apiCall'

const assignmentService = {
  list: (params) => apiCall({ method: 'GET', url: '/assignments', params }),

  get: (id) => apiCall({ method: 'GET', url: `/assignments/${id}` }),

  create: (assignment) => apiCall({ method: 'POST', url: '/assignments', data: assignment }),

  update: (id, assignment) => apiCall({ method: 'PUT', url: `/assignments/${id}`, data: assignment }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/assignments/${id}` }),

  publish: (id) => apiCall({ method: 'PATCH', url: `/assignments/${id}/publish` }),

  close: (id) => apiCall({ method: 'PATCH', url: `/assignments/${id}/close` }),

  reopen: (id) => apiCall({ method: 'PATCH', url: `/assignments/${id}/reopen` }),

  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    // No explicit Content-Type here — axios must compute the multipart
    // boundary itself from the FormData instance.
    return apiCall({ method: 'POST', url: '/assignments/upload', data: formData })
  },

  uploadMultiple: (files) => {
    const formData = new FormData()
    files.forEach(f => {
      formData.append('files', f)
    })
    return apiCall({ method: 'POST', url: '/assignments/upload-multiple', data: formData })
  },
}

export default assignmentService
