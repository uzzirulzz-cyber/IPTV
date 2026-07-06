'use client'

import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { AdminView } from '@/components/admin/admin-view'

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <AdminView />
      </main>
      <AppFooter label="Admin Panel" />
    </div>
  )
}
