'use client'

import { useEffect, useState } from 'react'
import { AdminLogin } from './admin-login'
import { AdminDashboard } from './admin-dashboard'

export function AdminView() {
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' })
        if (!cancelled) setAuthed(res.ok)
      } catch {
        if (!cancelled) setAuthed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (authed === null) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  return <AdminDashboard />
}
