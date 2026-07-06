'use client'

import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { HomeView } from '@/components/home/home-view'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <HomeView onNavigate={(path) => router.push(path)} />
      </main>
      <AppFooter label="Live IPTV streaming" />
    </div>
  )
}
