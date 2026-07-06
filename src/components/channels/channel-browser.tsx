'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tv, Search, Heart, Play, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  category_id: string
  category_name: string
  count?: number
}
interface Channel {
  stream_id: string | number
  name: string
  stream_icon?: string
  logo?: string
  category_id?: string
  category?: string
  stream_url?: string
}

const PAGE_SIZE = 200

export function ChannelBrowser() {
  const { selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, openChannel } = useAppStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'index' | 'live' | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  // Debounced search
  const [searchInput, setSearchInput] = useState(searchQuery)
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput, setSearchQuery])

  const loadCatalog = useCallback(async (categoryId?: string, search?: string, pageNum = 0, append = false) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (categoryId) params.set('category_id', categoryId)
      if (search) params.set('search', search)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(pageNum * PAGE_SIZE))
      const res = await fetch(`/api/iptv/catalog?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load channels')
      setCategories(data.categories || [])
      setSource(data.source || null)
      if (append) {
        setChannels((prev) => [...prev, ...(data.channels || [])])
      } else {
        setChannels(data.channels || [])
      }
      setTotal(data.total || (data.channels || []).length)
      if (data.error && (data.categories || []).length === 0 && (data.channels || []).length === 0) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels')
      if (!append) toast.error('Failed to load channels — check your IPTV credentials')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', { cache: 'no-store' })
      const data = await res.json()
      setFavorites(new Set((data.favorites || []).map((f: { channelId: string }) => f.channelId)))
    } catch {
      // ignore — anonymous users
    }
  }

  // Reload when category or search changes
  useEffect(() => {
    setPage(0)
    loadCatalog(selectedCategory || undefined, searchQuery || undefined, 0, false)
    loadFavorites()
  }, [selectedCategory, searchQuery, loadCatalog])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadCatalog(selectedCategory || undefined, searchQuery || undefined, nextPage, true)
  }

  const toggleFavorite = async (channel: Channel) => {
    const id = String(channel.stream_id)
    const isFav = favorites.has(id)
    try {
      if (isFav) {
        await fetch(`/api/favorites?channelId=${id}`, { method: 'DELETE' })
        setFavorites((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast.success('Removed from favorites')
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: id,
            channelName: channel.name,
            channelLogo: channel.stream_icon || channel.logo || null,
            category: channel.category_id || channel.category || selectedCategory || null,
          }),
        })
        setFavorites((prev) => new Set(prev).add(id))
        toast.success('Added to favorites')
      }
    } catch {
      toast.error('Sign in to save favorites')
    }
  }

  const getLogo = (ch: Channel) => ch.stream_icon || ch.logo || ''
  const getCategory = (ch: Channel) => ch.category_id || ch.category || ''

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Live Channels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading channels…' : (
              <>
                {total.toLocaleString()} channels available
                {source === 'index' && <Badge variant="outline" className="ml-2 text-[10px]">indexed</Badge>}
                {source === 'live' && <Badge variant="outline" className="ml-2 text-[10px]">live</Badge>}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadCatalog(selectedCategory || undefined, searchQuery || undefined, 0, false)}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-rose-500/30 bg-rose-500/5 mb-6">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-400">Unable to load channels</p>
              <p className="text-xs text-muted-foreground mt-1">
                The IPTV server may be offline, blocking this server&rsquo;s IP, or the credentials may be invalid.
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Visit the admin panel (Shield icon &rarr; Index) to index the catalog from the IPTV server.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        {/* Category sidebar */}
        <aside className="hidden md:block">
          <Card className="border-border/40 sticky top-20">
            <CardContent className="p-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories ({categories.length})
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
                    className="w-full justify-start mb-1 text-left truncate gap-2"
                    title={cat.category_name}
                  >
                    <span className="truncate flex-1">{cat.category_name}</span>
                    {typeof cat.count === 'number' && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{cat.count}</span>
                    )}
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
              {categories.slice(0, 30).map((cat) => (
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
          ) : channels.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Tv className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No channels match your search' : 'No channels available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {channels.map((channel) => {
                  const id = String(channel.stream_id)
                  const isFav = favorites.has(id)
                  const logo = getLogo(channel)
                  const category = getCategory(channel)
                  return (
                    <div
                      key={id}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-border/40 bg-card hover:border-rose-500/40 transition-all cursor-pointer"
                      onClick={() => openChannel({
                        channelId: id,
                        channelName: channel.name,
                        channelLogo: logo || null,
                        category: category || null,
                      })}
                    >
                      <div className="absolute inset-0 flex items-center justify-center p-3">
                        {logo ? (
                          <img
                            src={logo}
                            alt={channel.name}
                            className="max-h-12 max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
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
                        <div className="text-xs font-medium text-white line-clamp-2">{channel.name}</div>
                      </div>
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
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 shadow-lg">
                          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Load more */}
              {channels.length < total && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>Load more ({(total - channels.length).toLocaleString()} remaining)</>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
