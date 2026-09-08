import apiCall from '@/utilities/apiCall'

const courseContentService = {
  // Syllabus - modules
  getModules: (courseId) => apiCall({ method: 'GET', url: `/courses/${courseId}/modules` }),
  createModule: (courseId, data) => apiCall({ method: 'POST', url: `/courses/${courseId}/modules`, data }),
  updateModule: (id, data) => apiCall({ method: 'PUT', url: `/modules/${id}`, data }),
  deleteModule: (id) => apiCall({ method: 'DELETE', url: `/modules/${id}` }),
  reorderModules: (courseId, orderedIds) =>
    apiCall({ method: 'PUT', url: `/courses/${courseId}/modules/reorder`, data: { orderedIds } }),

  // Syllabus - topics
  createTopic: (moduleId, data) => apiCall({ method: 'POST', url: `/modules/${moduleId}/topics`, data }),
  updateTopic: (id, data) => apiCall({ method: 'PUT', url: `/topics/${id}`, data }),
  deleteTopic: (id) => apiCall({ method: 'DELETE', url: `/topics/${id}` }),
  reorderTopics: (moduleId, orderedIds) =>
    apiCall({ method: 'PUT', url: `/modules/${moduleId}/topics/reorder`, data: { orderedIds } }),
  updateSyllabusStatus: (courseId, status, includeTopics = true) =>
    apiCall({ method: 'PUT', url: `/courses/${courseId}/syllabus/status`, data: { status, includeTopics } }),

  // Sessions
  getSessions: (topicId) => apiCall({ method: 'GET', url: `/topics/${topicId}/sessions` }),
  createSession: (topicId, data) => apiCall({ method: 'POST', url: `/topics/${topicId}/sessions`, data }),
  updateSession: (id, data) => apiCall({ method: 'PUT', url: `/sessions/${id}`, data }),
  deleteSession: (id) => apiCall({ method: 'DELETE', url: `/sessions/${id}` }),
  reorderSessions: (topicId, orderedIds) =>
    apiCall({ method: 'PUT', url: `/topics/${topicId}/sessions/reorder`, data: { orderedIds } }),

  // Syllabus import
  previewImportSyllabus: (courseId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall({ method: 'POST', url: `/courses/${courseId}/modules/import/preview`, data: formData, headers: { 'Content-Type': 'multipart/form-data' } })
  },
  confirmImportSyllabus: (courseId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall({ method: 'POST', url: `/courses/${courseId}/modules/import`, data: formData, headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Materials
  getMaterials: (params) => apiCall({ method: 'GET', url: '/materials', params }),
  getAllCourseMaterials: (courseId) => apiCall({ method: 'GET', url: '/materials', params: { courseId, all: true } }),
  createMaterial: (data) => apiCall({ method: 'POST', url: '/materials', data }),
  updateMaterial: (id, data) => apiCall({ method: 'PUT', url: `/materials/${id}`, data }),
  deleteMaterial: (id) => apiCall({ method: 'DELETE', url: `/materials/${id}` }),
  reorderMaterials: (orderedIds) => apiCall({ method: 'PUT', url: '/materials/reorder', data: { orderedIds } }),
  uploadMaterial: (fileOrFormData, type) => {
    let formData
    let typeParam = type
    if (fileOrFormData instanceof FormData) {
      formData = fileOrFormData
      if (type && !formData.has('type')) formData.append('type', type)
      if (!typeParam && formData.has('type')) typeParam = formData.get('type')
    } else {
      formData = new FormData()
      formData.append('file', fileOrFormData)
      if (type) formData.append('type', type)
    }
    return apiCall({
      method: 'POST',
      url: '/materials/upload',
      data: formData,
      params: typeParam ? { type: typeParam } : undefined,
    })
  },
}

export default courseContentService
