'use client'

import { Suspense } from 'react'
import { AppHeader } from '@/components/layout/app-header'
import { VideoPlayer } from '@/components/player/video-player'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

function PlayerContent() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get('id')
  const channelName = searchParams.get('name')
  const channelLogo = searchParams.get('logo')
  const category = searchParams.get('category')

  const activeChannel = channelId && channelName
    ? {
        channelId,
        channelName,
        channelLogo: channelLogo || null,
        category: category || null,
      }
    : null

  return <VideoPlayer activeChannel={activeChannel} />
}

export default function PlayerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl px-4 py-12">
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                  <p className="text-sm text-muted-foreground mt-3">Loading player…</p>
                </CardContent>
              </Card>
            </div>
          }
        >
          <PlayerContent />
        </Suspense>
      </main>
      <footer className="border-t border-border/40 py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Playbeat Digital</span>
            <span>·</span>
            <span>Now Playing</span>
          </div>
          <div>Powered by MongoDB · HLS.js · Next.js</div>
        </div>
      </footer>
    </div>
  )
}
