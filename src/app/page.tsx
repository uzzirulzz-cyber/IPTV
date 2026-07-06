'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { AppHeader } from '@/components/layout/app-header'
import { HomeView } from '@/components/home/home-view'
import { ChannelBrowser } from '@/components/channels/channel-browser'
import { VideoPlayer } from '@/components/player/video-player'
import { FavoritesView } from '@/components/favorites/favorites-view'
import { AdminView } from '@/components/admin/admin-view'

export default function Home() {
  const { view } = useAppStore()

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        {view === 'home' && <HomeView />}
        {view === 'channels' && <ChannelBrowser />}
        {view === 'player' && <VideoPlayer />}
        {view === 'favorites' && <FavoritesView />}
        {view === 'admin' && <AdminView />}
      </main>
      <footer className="border-t border-border/40 py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Playbeat Digital</span>
            <span>·</span>
            <span>Live IPTV streaming</span>
          </div>
          <div>Powered by MongoDB · HLS.js · Next.js</div>
        </div>
      </footer>
    </div>
  )
}
