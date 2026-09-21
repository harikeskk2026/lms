import apiCall from '@/utilities/apiCall'

const recordedSessionService = {
  // Admin
  listSessions: (params, config) => apiCall({ method: 'GET', url: '/admin/recorded-sessions', params, ...config }),
  getSession: (id) => apiCall({ method: 'GET', url: `/admin/recorded-sessions/${id}` }),
  createSession: (data) => apiCall({ method: 'POST', url: '/admin/recorded-sessions', data }),
  updateSession: (id, data) => apiCall({ method: 'PUT', url: `/admin/recorded-sessions/${id}`, data }),
  deleteSession: (id) => apiCall({ method: 'DELETE', url: `/admin/recorded-sessions/${id}` }),
  uploadVideo: (id, file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall({
      method: 'POST',
      url: `/admin/recorded-sessions/${id}/upload`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 30 * 60 * 1000,
    })
  },
  getProcessingStatus: (id) => apiCall({ method: 'GET', url: `/admin/recorded-sessions/${id}/processing-status` }),
  publishSession: (id) => apiCall({ method: 'POST', url: `/admin/recorded-sessions/${id}/publish` }),
  archiveSession: (id) => apiCall({ method: 'POST', url: `/admin/recorded-sessions/${id}/archive` }),
  getAnalytics: (id) => apiCall({ method: 'GET', url: `/admin/recorded-sessions/${id}/analytics` }),
  getPlaybackSessions: (id) => apiCall({ method: 'GET', url: `/admin/recorded-sessions/${id}/playback-sessions` }),
  getAuditLog: (id) => apiCall({ method: 'GET', url: `/admin/recorded-sessions/${id}/audit-log` }),
  revokePlaybackSession: (playbackSessionId) =>
    apiCall({ method: 'POST', url: `/admin/recorded-sessions/playback-sessions/${playbackSessionId}/revoke` }),
  revokeAllSessionsForStudent: (studentUserId) =>
    apiCall({ method: 'POST', url: `/admin/recorded-sessions/students/${studentUserId}/revoke-all-sessions` }),
  getBlockedStudents: (id) => apiCall({ method: 'GET', url: `/admin/recorded-sessions/${id}/blocked-students` }),
  blockStudent: (id, studentUserId) =>
    apiCall({ method: 'POST', url: `/admin/recorded-sessions/${id}/block-student/${studentUserId}` }),
  unblockStudent: (id, studentUserId) =>
    apiCall({ method: 'POST', url: `/admin/recorded-sessions/${id}/unblock-student/${studentUserId}` }),

  // Student
  listMySessions: () => apiCall({ method: 'GET', url: '/student/recorded-sessions' }),
  getMySession: (id) => apiCall({ method: 'GET', url: `/student/recorded-sessions/${id}` }),
  startPlayback: (id, deviceId, forceTakeover = false) =>
    apiCall({ method: 'POST', url: `/student/recorded-sessions/${id}/playback`, data: { deviceId, forceTakeover } }),
  heartbeat: (playbackSessionId, positionSeconds) =>
    apiCall({ method: 'POST', url: `/student/recorded-sessions/playback/${playbackSessionId}/heartbeat`, data: { positionSeconds } }),
  endPlayback: (playbackSessionId) =>
    apiCall({ method: 'POST', url: `/student/recorded-sessions/playback/${playbackSessionId}/end` }),
  reportCaptureAttempt: (playbackSessionId, positionSeconds) =>
    apiCall({
      method: 'POST',
      url: `/student/recorded-sessions/playback/${playbackSessionId}/capture-detected`,
      params: { positionSeconds },
    }),
  reportClientEvent: (playbackSessionId, eventType, positionSeconds) =>
    apiCall({
      method: 'POST',
      url: `/student/recorded-sessions/playback/${playbackSessionId}/client-event`,
      params: { eventType, positionSeconds },
    }),
}

export default recordedSessionService
