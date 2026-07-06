'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart, Play, Tv, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelLogo } from '@/components/channels/channel-logo'

interface FavoriteItem {
  id: string
  channelId: string
  channelName: string
  channelLogo: string | null
  category: string | null
}

export function FavoritesView() {
  const router = useRouter()
  const go = (path: string) => router.push(path)
  const { user, loading: authLoading } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', { cache: 'no-store' })
      const data = await res.json()
      setFavorites(data.favorites || [])
    } catch {
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadFavorites()
  }, [user, authLoading])

  const removeFavorite = async (channelId: string) => {
    try {
      await fetch(`/api/favorites?channelId=${channelId}`, { method: 'DELETE' })
      setFavorites((prev) => prev.filter((f) => f.channelId !== channelId))
      toast.success('Removed from favorites')
    } catch {
      toast.error('Failed to remove favorite')
    }
  }

  // Not signed in
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to save favorites</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Sign in with your email to save channels you love and access them quickly from any device.
            </p>
            <Button onClick={() => go('/channels')} className="gap-2">
              <Tv className="h-4 w-4" />
              Browse Channels
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your Favorites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? 'Loading…' : `${favorites.length} saved channel${favorites.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Tap the heart icon on any channel to add it to your favorites for quick access.
            </p>
            <Button onClick={() => go('/channels')} className="gap-2">
              <Tv className="h-4 w-4" />
              Browse Channels
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="group relative aspect-video overflow-hidden rounded-xl border border-border/40 bg-card hover:border-blue-500/40 transition-all cursor-pointer"
              onClick={() => {
                const params = new URLSearchParams({
                  id: fav.channelId,
                  name: fav.channelName,
                  logo: fav.channelLogo || '',
                  category: fav.category || '',
                })
                go(`/player?${params.toString()}`)
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <ChannelLogo
                  src={fav.channelLogo || null}
                  name={fav.channelName}
                  className="max-h-12 max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  iconClassName="h-10 w-10"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="text-xs font-medium text-white line-clamp-2">{fav.channelName}</div>
              </div>
              {/* Favorite heart (filled) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFavorite(fav.channelId)
                }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center"
                aria-label="Remove from favorites"
              >
                <Heart className="h-3.5 w-3.5 fill-white" />
              </button>
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
