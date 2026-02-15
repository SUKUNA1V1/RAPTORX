'use client'
import { useState, useEffect, useCallback } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  fallback?: T,
  deps: unknown[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(fallback ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      setData(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'API error'
      setError(msg)
      if (fallback !== undefined) setData(fallback)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  fallback?: T
): UseApiResult<T> {
  const result = useApi(fetcher, fallback)

  useEffect(() => {
    const id = setInterval(result.refetch, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return result
}
