'use client'
import { useEffect, useState } from 'react'

// Returns `value`, but only updates (300-500ms after the caller stops changing
// it) once `value` has stopped changing for `delayMs` - so a search box can
// bind its raw keystroke state locally while every consumer of the debounced
// value (the API call) only re-fires once typing pauses.
export default function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
