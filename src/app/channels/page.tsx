'use client'

import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { ChannelBrowser } from '@/components/channels/channel-browser'

export default function ChannelsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <ChannelBrowser />
      </main>
      <AppFooter label="Live Channels" />
    </div>
  )
}
