'use client'

import { useEffect, useState, useCallback } from 'react'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

// Global auth state shared across all useAuth instances
let globalUser: CurrentUser | null = null
let globalLoading = true
const listeners = new Set<() => void>()

function setUser(user: CurrentUser | null) {
  globalUser = user
  globalLoading = false
  listeners.forEach((l) => l())
}

async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' })
    const data = await res.json()
    return data.user || null
  } catch {
    return null
  }
}

let initialized = false
function initAuth() {
  if (initialized) return
  initialized = true
  fetchMe().then((u) => setUser(u))
}

export function useAuth() {
  const [, forceRender] = useState(0)
  const rerender = useCallback(() => forceRender((n) => n + 1), [])

  useEffect(() => {
    initAuth()
    listeners.add(rerender)
    return () => {
      listeners.delete(rerender)
    }
  }, [rerender])

  const refresh = useCallback(async () => {
    const u = await fetchMe()
    setUser(u)
  }, [])

  const signIn = useCallback(async (email: string, name?: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Sign-in failed' }))
      throw new Error(err.error || 'Sign-in failed')
    }
    const data = await res.json()
    setUser(data.user)
    return data.user as CurrentUser
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setUser(null)
  }, [])

  return { user: globalUser, loading: globalLoading, signIn, signOut, refresh }
}
