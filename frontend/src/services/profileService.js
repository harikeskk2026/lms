import apiCall from '@/utilities/apiCall'

// "My Profile", shared by every role — SUPERADMIN/ADMIN/TRAINER and STUDENT all
// hit the same endpoints; the backend resolves the account from the JWT, so
// there's never an id to pass here.
const profileService = {
  get: () => apiCall({ method: 'GET', url: '/profile' }),

  update: (data) => apiCall({ method: 'PUT', url: '/profile', data }),

  changePassword: (data) => apiCall({ method: 'POST', url: '/profile/change-password', data }),

  uploadPhoto: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    // No explicit Content-Type here — axios must compute the multipart
    // boundary itself from the FormData instance.
    return apiCall({ method: 'POST', url: '/profile/photo', data: formData })
  },
}

export default profileService
