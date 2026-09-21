'use client'
import { useState, useEffect, useCallback } from 'react'
import { studentApi } from '@/lib/api'

function makeHook(apiFn) {
  return function useHook(...args) {
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    const fetch = useCallback(() => {
      setLoading(true)
      setError(null)
      apiFn(...args)
        .then(r => setData(r.data.data))
        .catch(e => setError(e?.response?.data?.message || 'Failed to load data'))
        .finally(() => setLoading(false))
    }, [JSON.stringify(args)])

    useEffect(() => { fetch() }, [fetch])

    return { data, loading, error, refetch: fetch }
  }
}

export function useDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    return studentApi.getDashboard()
      .then(r => {
        const d = r.data?.data || r.data
        if (d) setData({ ...d })
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useAttendance(month) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [refetchTick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      studentApi.getAttendance(month),
      studentApi.getAttSummary(month)
    ])
      .then(([calRes, sumRes]) => setData({
        calendar: calRes.data.data,
        summary:  sumRes.data.data
      }))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load attendance'))
      .finally(() => setLoading(false))
  }, [month, refetchTick])

  return { data, loading, error, refetch: () => setTick(t => t + 1) }
}

export function useAssignments(status) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [refetchTick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    studentApi.getAssignments(status ? { status } : {})
      .then(r => setData(r.data.data))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load assignments'))
      .finally(() => setLoading(false))
  }, [status, refetchTick])

  return { data, loading, error, refetch: () => setTick(t => t + 1) }
}

export function useQuizzes() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [refetchTick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    studentApi.getQuizzes()
      .then(r => setData(r.data.data))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load quizzes'))
      .finally(() => setLoading(false))
  }, [refetchTick])

  return { data, loading, error, refetch: () => setTick(t => t + 1) }
}

export function usePlacement() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    studentApi.getPlacement()
      .then(r => setData(r.data.data))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load placement data'))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useNotifications() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [refetchTick, setTick] = useState(0)

  useEffect(() => {
    studentApi.getNotifications()
      .then(r => {
        const raw = r.data.data
        // Spring Boot API returns { notifications: [...], unreadCount: N }
        // Node.js API returns a plain array — handle both
        const list = Array.isArray(raw) ? raw : (raw?.notifications ?? [])
        setData(list)
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [refetchTick])

  return { data, loading, error, refetch: () => setTick(t => t + 1) }
}

