'use client'

import { Suspense } from 'react'
import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { VideoPlayer } from '@/components/player/video-player'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

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
      <AppFooter label="Now Playing" />
    </div>
  )
}
