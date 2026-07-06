'use client'

import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { FavoritesView } from '@/components/favorites/favorites-view'

export default function FavoritesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <FavoritesView />
      </main>
      <AppFooter label="Your Favorites" />
    </div>
  )
}
