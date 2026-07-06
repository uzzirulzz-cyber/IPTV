'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tv, Search, Heart, Play, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface IptvCategory {
  category_id: string
  category_name: string
}
interface IptvChannel {
  num: number
  name: string
  stream_id: number
  stream_icon: string
  category_id: string
}

export function ChannelBrowser() {
  const { selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, openChannel } = useAppStore()
  const [categories, setCategories] = useState<IptvCategory[]>([])
  const [channels, setChannels] = useState<IptvChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const loadCatalog = async (categoryId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = categoryId
        ? `/api/iptv/catalog?category_id=${encodeURIComponent(categoryId)}`
        : '/api/iptv/catalog'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load channels')
      setCategories(data.categories || [])
      setChannels(data.channels || [])
      if (data.error && (data.categories || []).length === 0 && (data.channels || []).length === 0) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels')
      toast.error('Failed to load channels — check your IPTV credentials')
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', { cache: 'no-store' })
      const data = await res.json()
      setFavorites(new Set((data.favorites || []).map((f: { channelId: string }) => f.channelId)))
    } catch {
      // ignore — anonymous users
    }
  }

  useEffect(() => {
    loadCatalog(selectedCategory || undefined)
    loadFavorites()
  }, [selectedCategory])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return channels
    const q = searchQuery.toLowerCase()
    return channels.filter((c) => c.name.toLowerCase().includes(q))
  }, [channels, searchQuery])

  const toggleFavorite = async (channel: IptvChannel) => {
    const isFav = favorites.has(String(channel.stream_id))
    try {
      if (isFav) {
        await fetch(`/api/favorites?channelId=${channel.stream_id}`, { method: 'DELETE' })
        setFavorites((prev) => {
          const next = new Set(prev)
          next.delete(String(channel.stream_id))
          return next
        })
        toast.success('Removed from favorites')
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: String(channel.stream_id),
            channelName: channel.name,
            channelLogo: channel.stream_icon || null,
            category: selectedCategory || null,
          }),
        })
        setFavorites((prev) => new Set(prev).add(String(channel.stream_id)))
        toast.success('Added to favorites')
      }
    } catch {
      toast.error('Sign in to save favorites')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Live Channels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading channels…' : `${filtered.length} channels available`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => loadCatalog(selectedCategory || undefined)} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-rose-500/30 bg-rose-500/5 mb-6">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-400">Unable to connect to the IPTV service</p>
              <p className="text-xs text-muted-foreground mt-1">
                The IPTV server may be offline, blocking this server&rsquo;s IP, or the credentials may be invalid.
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Check the admin panel (Shield icon &rarr; IPTV Config) to verify the server status.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Category sidebar */}
        <aside className="hidden md:block">
          <Card className="border-border/40 sticky top-20">
            <CardContent className="p-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </div>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <Button
                  variant={!selectedCategory ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="w-full justify-start mb-1"
                >
                  All Channels
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.category_id}
                    variant={selectedCategory === cat.category_id ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.category_id)}
                    className="w-full justify-start mb-1 text-left truncate"
                    title={cat.category_name}
                  >
                    {cat.category_name}
                  </Button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* Mobile category select */}
        <div className="md:hidden">
          <ScrollArea className="whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.slice(0, 20).map((cat) => (
                <Button
                  key={cat.category_id}
                  variant={selectedCategory === cat.category_id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.category_id)}
                  className="shrink-0 max-w-[160px] truncate"
                >
                  {cat.category_name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Channel grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Tv className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No channels match your search' : 'No channels available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.slice(0, 200).map((channel) => {
                const isFav = favorites.has(String(channel.stream_id))
                return (
                  <div
                    key={channel.stream_id}
                    className="group relative aspect-video overflow-hidden rounded-xl border border-border/40 bg-card hover:border-rose-500/40 transition-all cursor-pointer"
                    onClick={() => openChannel({
                      channelId: String(channel.stream_id),
                      channelName: channel.name,
                      channelLogo: channel.stream_icon || null,
                      category: selectedCategory || null,
                    })}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt={channel.name}
                          className="max-h-12 max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.parentElement?.classList.add('show-fallback')
                          }}
                        />
                      ) : (
                        <Tv className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="text-xs font-medium text-white line-clamp-2">{channel.name}</div>
                    </div>
                    {/* Favorite heart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(channel)
                      }}
                      className={`absolute top-2 right-2 h-7 w-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                        isFav
                          ? 'bg-rose-500 text-white opacity-100'
                          : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-white' : ''}`} />
                    </button>
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 shadow-lg">
                        <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {filtered.length > 200 && (
            <div className="mt-4 text-center text-xs text-muted-foreground">
              Showing first 200 of {filtered.length} channels. Use search to narrow down.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
