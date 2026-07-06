'use client'

import { AppHeader } from '@/components/layout/app-header'
import { AdminView } from '@/components/admin/admin-view'

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <AdminView />
      </main>
      <footer className="border-t border-border/40 py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Playbeat Digital</span>
            <span>·</span>
            <span>Admin Panel</span>
          </div>
          <div>Powered by MongoDB · HLS.js · Next.js</div>
        </div>
      </footer>
    </div>
  )
}
