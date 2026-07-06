'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Play, Radio, Tv, Heart, Clock, ArrowRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface WatchHistoryItem {
  id: string
  channelId: string
  channelName: string
  channelLogo: string | null
  category: string | null
  watchedAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function HomeView() {
  const { setView, openChannel } = useAppStore()
  const { user } = useAuth()
  const [history, setHistory] = useState<WatchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistory = async () => {
    if (!user) {
      setHistory([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/watch-history', { cache: 'no-store' })
      const data = await res.json()
      setHistory(data.history || [])
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadHistory()
  }, [user])

  const clearHistory = async () => {
    try {
      await fetch('/api/watch-history', { method: 'DELETE' })
      setHistory([])
      toast.success('Watch history cleared')
    } catch {
      toast.error('Failed to clear history')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-background via-background to-rose-500/5 p-8 md:p-14">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <Badge variant="outline" className="mb-4 gap-1.5 border-rose-500/30 bg-rose-500/10 text-rose-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
            Live broadcasting
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Stream the world, <br />
            <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
              one beat at a time.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl">
            Playbeat Digital brings you a premium live TV experience with hundreds of channels across news, sports, entertainment, and more — all in stunning quality with rock-solid stability.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setView('channels')} className="gap-2">
              <Tv className="h-4 w-4" />
              Browse Channels
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView('favorites')} className="gap-2">
              <Heart className="h-4 w-4" />
              My Favorites
            </Button>
          </div>
        </div>
      </section>

      {/* Continue Watching */}
      {user && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-rose-400" />
              <h2 className="text-xl md:text-2xl font-semibold">Continue Watching</h2>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-2 text-muted-foreground">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No watch history yet. Start watching to see your recent channels here.</p>
                <Button className="mt-4 gap-2" onClick={() => setView('channels')}>
                  <Radio className="h-4 w-4" /> Browse Channels
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {history.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  onClick={() => openChannel({
                    channelId: item.channelId,
                    channelName: item.channelName,
                    channelLogo: item.channelLogo,
                    category: item.category,
                  })}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-border/40 bg-card hover:border-rose-500/40 transition-all"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.channelLogo ? (
                      <img
                        src={item.channelLogo}
                        alt={item.channelName}
                        className="h-12 w-12 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <Tv className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="text-xs font-medium text-white line-clamp-1">{item.channelName}</div>
                    <div className="text-[10px] text-white/60">{timeAgo(item.watchedAt)}</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Feature cards */}
      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 hover:border-rose-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <Tv className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Live Channels</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Browse hundreds of live channels organized by category. Search by name, tap to play, and switch instantly without distortion.
            </p>
            <Button variant="link" className="px-0 mt-3 text-rose-400" onClick={() => setView('channels')}>
              Browse now <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/40 hover:border-rose-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Favorites</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Save your favorite channels with a single tap and access them quickly from anywhere. Synced across sessions when signed in.
            </p>
            <Button variant="link" className="px-0 mt-3 text-rose-400" onClick={() => setView('favorites')}>
              View favorites <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/40 hover:border-rose-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <Radio className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Premium Streaming</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by HLS.js with auto-recovery from network errors, low-latency mode, and smooth buffering. Channels hold strong, no distortions.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
