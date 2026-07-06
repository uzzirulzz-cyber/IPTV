'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useStorefrontRefresh } from '@/hooks/use-storefront-refresh'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Play, Radio, Tv, Heart, Clock, ArrowRight, Trash2, Flame, Zap, RefreshCw, Database } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelLogo } from '@/components/channels/channel-logo'
import { PlaybeatLogoLarge } from '@/components/layout/playbeat-logo'

const HERO_BG_IMAGES = [
  '/bg/bg1.jpg',
  '/bg/bg2.jpg',
  '/bg/bg3.jpg',
  '/bg/bg4.jpg',
  '/bg/bg5.jpg',
  '/bg/bg6.jpg',
]

interface WatchHistoryItem {
  id: string
  channelId: string
  channelName: string
  channelLogo: string | null
  category: string | null
  watchedAt: string
}

interface FeaturedChannel {
  streamId: string
  name: string
  logo: string
  category: string
  streamUrl: string
  streamFormat: string
  featured: boolean
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

function ChannelTile({ ch, onClick }: { ch: FeaturedChannel; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-video overflow-hidden rounded-xl border border-border/40 bg-card hover:border-blue-500/40 transition-all"
    >
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <ChannelLogo
          src={ch.logo || null}
          name={ch.name}
          className="max-h-12 max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
          iconClassName="h-10 w-10"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <div className="text-xs font-medium text-white line-clamp-1">{ch.name}</div>
        <div className="text-[10px] text-white/60 line-clamp-1">{ch.category}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <Play className="h-8 w-8 text-white fill-white" />
      </div>
    </button>
  )
}

export function HomeView({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const go = (path: string) => onNavigate ? onNavigate(path) : (window.location.href = path)
  const { user } = useAuth()
  const { data: storefront, loading: loadingStorefront, refresh: refreshStorefront } = useStorefrontRefresh(60000)
  const [history, setHistory] = useState<WatchHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [heroBg] = useState(() => HERO_BG_IMAGES[Math.floor(Math.random() * HERO_BG_IMAGES.length)])

  // Featured channels come from the auto-refresh hook (updates every 60s)
  const featured: FeaturedChannel[] = (storefront?.featured || []).map((c) => ({
    streamId: c.streamId,
    name: c.name,
    logo: c.logo,
    category: c.category,
    streamUrl: c.streamUrl,
    streamFormat: c.streamFormat,
    featured: c.featured,
  }))
  const loadingFeatured = loadingStorefront

  const loadHistory = async () => {
    if (!user) {
      setHistory([])
      setLoadingHistory(false)
      return
    }
    try {
      const res = await fetch('/api/watch-history', { cache: 'no-store' })
      const data = await res.json()
      setHistory(data.history || [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    setLoadingHistory(true)
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
      <section className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-14">
        {/* Random background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
          aria-hidden="true"
        />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 max-w-3xl">
          {/* Large branded Playbeat logo */}
          <div className="mb-6">
            <PlaybeatLogoLarge />
          </div>
          <Badge variant="outline" className="mb-4 gap-1.5 border-blue-500/30 bg-blue-500/10 text-blue-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            </span>
            Broadcasting active
          </Badge>
          {/* Auto-update indicator — always visible, shows loading state too */}
          <div className="mb-4 flex items-center gap-2 text-xs text-white/60">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              {storefront?.status
                ? <>
                    {storefront.status.totalChannels.toLocaleString()} channels ·
                    Auto-updated {storefront.status.ageSeconds !== null
                      ? storefront.status.ageSeconds < 60
                        ? `${storefront.status.ageSeconds}s ago`
                        : `${Math.round(storefront.status.ageSeconds / 60)}m ago`
                      : 'never'}
                  </>
                : 'Loading database…'}
            </span>
            <button
              onClick={() => refreshStorefront()}
              className="ml-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Stream the world, <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
              one beat at a time.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl">
            Playbeat Digital brings you a premium live TV experience with thousands of channels across news, sports, movies, entertainment, and more — all in stunning quality with rock-solid stability.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => go('/channels')} className="gap-2">
              <Tv className="h-4 w-4" />
              Browse Channels
            </Button>
            <Button size="lg" variant="outline" onClick={() => go('/favorites')} className="gap-2">
              <Heart className="h-4 w-4" />
              My Favorites
            </Button>
          </div>
          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Tv className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">
                  {storefront?.status?.totalChannels
                    ? storefront.status.totalChannels.toLocaleString()
                    : '11,000+'}
                </div>
                <div className="text-xs text-muted-foreground">Live channels</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">
                  {storefront?.status?.totalCategories
                    ? storefront.status.totalCategories.toLocaleString()
                    : '127+'}
                </div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">24/7</div>
                <div className="text-xs text-muted-foreground">Auto-refresh</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Channels (storefront) */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl md:text-2xl font-semibold">Featured Channels</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => go('/channels')} className="gap-2">
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {loadingFeatured ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-xl" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Tv className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No featured channels yet. An admin needs to index the catalog first.
              </p>
              <Button className="mt-4 gap-2" onClick={() => go('/admin')}>
                <Radio className="h-4 w-4" /> Go to Admin
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {featured.map((ch) => (
              <ChannelTile
                key={ch.streamId}
                ch={ch}
                onClick={() => {
                  const params = new URLSearchParams({
                    id: ch.streamId,
                    name: ch.name,
                    logo: ch.logo || '',
                    category: ch.category,
                  })
                  go(`/player?${params.toString()}`)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Continue Watching */}
      {user && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl md:text-2xl font-semibold">Continue Watching</h2>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-2 text-muted-foreground">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          {loadingHistory ? (
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
                <Button className="mt-4 gap-2" onClick={() => go('/channels')}>
                  <Radio className="h-4 w-4" /> Browse Channels
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {history.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const params = new URLSearchParams({
                      id: item.channelId,
                      name: item.channelName,
                      logo: item.channelLogo || '',
                      category: item.category || '',
                    })
                    go(`/player?${params.toString()}`)
                  }}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-border/40 bg-card hover:border-blue-500/40 transition-all"
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
        <Card className="border-border/40 hover:border-blue-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Tv className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Live Channels</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Browse thousands of live channels organized by category. Search by name, tap to play, and switch instantly without distortion.
            </p>
            <Button variant="link" className="px-0 mt-3 text-blue-400" onClick={() => go('/channels')}>
              Browse now <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/40 hover:border-blue-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Favorites</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Save your favorite channels with a single tap and access them quickly from anywhere. Synced across sessions when signed in.
            </p>
            <Button variant="link" className="px-0 mt-3 text-blue-400" onClick={() => go('/favorites')}>
              View favorites <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/40 hover:border-blue-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
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
