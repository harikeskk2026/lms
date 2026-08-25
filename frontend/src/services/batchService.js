import apiCall from '@/utilities/apiCall'

const batchService = {
  list: () => apiCall({ method: 'GET', url: '/batches' }),

  get: (id) => apiCall({ method: 'GET', url: `/batches/${id}` }),

  create: (batch) => apiCall({ method: 'POST', url: '/batches', data: batch }),

  update: (id, batch) => apiCall({ method: 'PUT', url: `/batches/${id}`, data: batch }),

  remove: (id) => apiCall({ method: 'DELETE', url: `/batches/${id}` }),
}

export default batchService
