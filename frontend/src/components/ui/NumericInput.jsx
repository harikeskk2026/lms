'use client'

import { useState, useEffect, useRef } from 'react'

export default function NumericInput({
  value = '',
  onChange,
  onBlur,
  min,
  max,
  step = 1,
  allowZero = false,
  allowNegative = false,
  allowDecimal = false,
  placeholder = '',
  errorMessage,
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  inputMode = 'decimal',
  label,
  showError = true,
}) {
  const [internalValue, setInternalValue] = useState(String(value ?? ''))
  const [error, setError] = useState(null)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setInternalValue(String(value ?? ''))
  }, [value])

  const validate = (val) => {
    if (val === '' || val === null || val === undefined) {
      if (required) return 'This field is required'
      return null
    }

    const str = String(val).trim()
    if (str === '') {
      if (required) return 'This field is required'
      return null
    }

    // Explicitly reject scientific notation or signs if not allowed
    if (/[eE]/.test(str)) return 'Scientific notation is not allowed'
    if (!allowNegative && str.includes('-')) return 'Negative values not allowed'
    if (str.includes('+')) return 'Plus sign is not allowed'

    if (!allowDecimal && str.includes('.')) return 'Decimals not allowed'

    // Check for malformed numbers like multiple dots or signs
    if (allowDecimal && (str.match(/\./g) || []).length > 1) return 'Invalid decimal format'

    // Check leading zeros (e.g., 01, 001) for integers
    if (!allowDecimal && /^0\d+/.test(str)) {
      return 'Leading zeros not permitted'
    }

    const num = Number(str)
    if (isNaN(num)) return 'Invalid number'

    if (!allowNegative && num < 0) return 'Negative values not allowed'
    if (!allowZero && num === 0) return 'Zero is not allowed'
    if (min !== undefined && num < min) return `Minimum value is ${min}`
    if (max !== undefined && num > max) return `Maximum value is ${max}`

    if (!allowDecimal && !Number.isInteger(num)) return 'Decimals not allowed'
    if (allowDecimal && step && step < 1) {
      const decimals = Math.max(0, -Math.floor(Math.log10(step)))
      const factor = Math.pow(10, decimals)
      if (!Number.isInteger(Math.round(num * factor))) {
        return `Value must be a multiple of ${step}`
      }
    }

    return null
  }

  const sanitize = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    let sanitized = String(val).replace(/[^\d.-]/g, '')
    if (!allowNegative) sanitized = sanitized.replace(/-/g, '')
    if (!allowDecimal) sanitized = sanitized.replace(/\./g, '')
    if (!allowNegative && !allowDecimal) sanitized = sanitized.replace(/[^0-9]/g, '')
    return sanitized
  }

  const handleChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitize(raw)
    setInternalValue(sanitized)
    if (touched) {
      setError(validate(sanitized))
    }
    onChange?.(sanitized)
  }

  const handleBlur = (e) => {
    setTouched(true)
    const err = validate(internalValue)
    setError(err)
    onBlur?.(e)
  }

  const handleKeyDown = (e) => {
    const forbidden = ['e', 'E', '+']
    if (!allowNegative) forbidden.push('-')
    if (!allowDecimal) forbidden.push('.')

    if (forbidden.includes(e.key)) {
      e.preventDefault()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const sanitized = sanitize(pasted)
    setInternalValue(sanitized)
    if (touched) {
      setError(validate(sanitized))
    }
    onChange?.(sanitized)
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
          error && touched ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200 dark:border-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-invalid={error && touched}
        aria-describedby={error && touched ? `${id}-error` : undefined}
      />
      {showError && error && touched && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500 font-medium" role="alert">
          {errorMessage || error}
        </p>
      )}
    </div>
  )
}