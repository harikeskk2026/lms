import apiCall from '@/utilities/apiCall'

const submissionService = {
  list: (assignmentId) => apiCall({ method: 'GET', url: `/assignments/${assignmentId}/submissions` }),

  grade: (assignmentId, submissionId, data) => apiCall({
    method: 'PATCH',
    url: `/assignments/${assignmentId}/submissions/${submissionId}`,
    data,
  }),
}

export default submissionService
