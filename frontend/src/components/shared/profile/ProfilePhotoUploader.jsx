'use client'
import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import profileService from '@/services/profileService'
import { resolveFileUrl } from '@/lib/api'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export default function ProfilePhotoUploader({ name, photoUrl, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Photo must be a JPG, PNG, or WEBP image')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Photo must be 5MB or smaller')
      return
    }
    setUploading(true)
    try {
      const res = await profileService.uploadPhoto(file)
      toast.success('Profile photo updated')
      onUploaded?.(res.data.photoUrl)
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      {photoUrl ? (
        <img src={resolveFileUrl(photoUrl)} alt={name}
          className="w-20 h-20 rounded-2xl object-cover border border-purple-100 dark:border-purple-900/30" />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-2xl font-display">
          {name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <button
        type="button"
        onClick={handlePick}
        disabled={uploading}
        title="Change profile photo"
        className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-60"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
    </div>
  )
}
