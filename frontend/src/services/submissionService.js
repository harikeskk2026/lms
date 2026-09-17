import apiCall from '@/utilities/apiCall'

const submissionService = {
  list: (assignmentId, params, config) => apiCall({
    method: 'GET',
    url: `/assignments/${assignmentId}/submissions`,
    params,
    ...config,
  }),

  grade: (assignmentId, submissionId, data) => apiCall({
    method: 'PATCH',
    url: `/assignments/${assignmentId}/submissions/${submissionId}`,
    data,
  }),

  approveOrReject: (assignmentId, submissionId, data) => apiCall({
    method: 'POST',
    url: `/assignments/${assignmentId}/submissions/${submissionId}/approval`,
    data,
  }),
}

export default submissionService
