'use client'
import clsx from 'clsx'

function getStrength(password) {
  let score = 0
  const checks = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ]
  score = checks.filter(Boolean).length

  if (score <= 2) return { score, label: 'Weak',       color: 'bg-red-500',    textColor: 'text-red-600',    segments: 1 }
  if (score === 3) return { score, label: 'Fair',       color: 'bg-orange-500', textColor: 'text-orange-600', segments: 2 }
  if (score === 4) return { score, label: 'Good',       color: 'bg-yellow-400', textColor: 'text-yellow-600', segments: 3 }
  if (score === 5) return { score, label: 'Strong',     color: 'bg-green-500',  textColor: 'text-green-600',  segments: 4 }
  return               { score, label: 'Very Strong', color: 'bg-brand-600',  textColor: 'text-brand-600',  segments: 5 }
}

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null
  const { label, color, textColor, segments } = getStrength(password)

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i <= segments ? color : 'bg-slate-200'
            )}
          />
        ))}
      </div>
      <p className={clsx('text-xs font-semibold', textColor)}>
        {label}
        {segments >= 4 && ' — Great choice!'}
        {segments <= 2 && ' — Add uppercase, numbers, or symbols'}
      </p>
    </div>
  )
}
