'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

export interface StorefrontData {
  featured: Array<{
    streamId: string
    name: string
    logo: string
    category: string
    streamUrl: string
    streamFormat: string
    featured: boolean
  }>
  status: {
    state: string
    totalChannels: number
    totalCategories: number
    lastUpdated: string | null
    ageSeconds: number | null
  }
  topCategories: Array<{ category: string; count: number }>
  refreshedAt: string
}

/**
 * Hook that continuously fetches fresh storefront data every `interval` ms.
 *
 * The home storefront uses this to:
 *   - Rotate featured channels (new channels appear every refresh)
 *   - Show a live "last updated" indicator
 *   - Display the current channel count
 *
 * Default interval: 60 seconds (balances freshness with server load).
 */
export function useStorefrontRefresh(intervalMs: number = 60000) {
  const [data, setData] = useState<StorefrontData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront/refresh', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StorefrontData = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh() // initial fetch
    timerRef.current = setInterval(refresh, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh, intervalMs])

  return { data, loading, error, refresh }
}
