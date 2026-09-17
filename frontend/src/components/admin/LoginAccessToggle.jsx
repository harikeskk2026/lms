'use client'
import { useState } from 'react'
import clsx from 'clsx'
import ConfirmModal from '@/components/ui/ConfirmModal'

// Shared login-access control for Admin/Trainer/Student user lists.
// ON = Active / Login Allowed. OFF = Deactivated / Login Blocked.
// Blocking access is confirmed first (it signs the user out immediately);
// allowing access is not, since it has no disruptive side effect.
export default function LoginAccessToggle({ active, name, onToggle, disabled = false, disabledReason }) {
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const runToggle = async () => {
    setLoading(true)
    try {
      await onToggle()
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (disabled || loading) return
    if (active) {
      setConfirmOpen(true)
    } else {
      runToggle()
    }
  }

  const isDisabled = disabled || loading

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        title={disabled ? disabledReason : active ? 'Click to block login access' : 'Click to allow login access'}
        aria-label={active ? 'Login access allowed' : 'Login access blocked'}
        className={clsx(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
          active ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
          style={{ transform: active ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false)
          await runToggle()
        }}
        title="Block login access?"
        message={`${name || 'This user'} will be signed out immediately and won't be able to log in until you allow access again.`}
        confirmLabel="Block Access"
        cancelLabel="Cancel"
        tone="warning"
        loading={loading}
        loadingText="Blocking..."
      />
    </>
  )
}
