'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import Hls from 'hls.js'

export function VideoPlayer() {
  const { activeChannel, setView } = useAppStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const recoveryAttempts = useRef(0)
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [loadStartTime, setLoadStartTime] = useState<number>(Date.now())
  const [quality, setQuality] = useState<'auto' | number>('auto')
  const [availableLevels, setAvailableLevels] = useState<{ height: number; index: number }[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch the stream URL
  useEffect(() => {
    if (!activeChannel) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setLoadStartTime(Date.now())
    ;(async () => {
      try {
        const res = await fetch(`/api/iptv/stream?stream_id=${activeChannel.channelId}&format=m3u8`, { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'Failed to get stream URL')
        setStreamUrl(data.url)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load stream')
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeChannel])

  // Record watch history
  useEffect(() => {
    if (!activeChannel) return
    fetch('/api/watch-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: activeChannel.channelId,
        channelName: activeChannel.channelName,
        channelLogo: activeChannel.channelLogo || null,
        category: activeChannel.category || null,
      }),
    }).catch(() => {})
  }, [activeChannel])

  // Initialize HLS.js
  const initHls = useCallback((url: string) => {
    const video = videoRef.current
    if (!video) return

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Native HLS (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {})
      }, { once: true })
      return
    }

    if (!Hls.isSupported()) {
      setError('HLS not supported in this browser')
      setLoading(false)
      return
    }

    const hls = new Hls({
      // Tuned for stability and low latency
      lowLatencyMode: true,
      backBufferLength: 60,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      enableWorker: true,
      // Auto-recovery from errors
      manifestLoadingTimeOut: 15000,
      manifestLoadingMaxRetry: 4,
      levelLoadingTimeOut: 15000,
      levelLoadingMaxRetry: 4,
      fragLoadingTimeOut: 30000,
      fragLoadingMaxRetry: 6,
      // ABR settings
      startLevel: -1,
      abrEwmaDefaultEstimate: 1000000,
      abrBandWidthFactor: 0.95,
      abrBandWidthUpFactor: 0.7,
    })
    hlsRef.current = hls

    hls.loadSource(url)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      setLoading(false)
      setError(null)
      setAvailableLevels(
        data.levels.map((lvl, i) => ({ height: lvl.height || 0, index: i }))
      )
      video.play().catch((err) => {
        console.warn('Auto-play blocked:', err)
      })
    })

    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      if (quality === 'auto') return
      // no-op
    })

    // Auto-recovery from fatal errors
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return
      console.warn('HLS fatal error:', data.type, data.details)

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          // Try to recover network errors
          if (recoveryAttempts.current < 5) {
            recoveryAttempts.current++
            toast.info(`Network error — retrying (${recoveryAttempts.current}/5)`)
            setTimeout(() => hls.startLoad(), 1000)
          } else {
            setError('Network error — unable to recover after 5 attempts')
            setLoading(false)
          }
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          // Try to recover media errors
          if (recoveryAttempts.current < 5) {
            recoveryAttempts.current++
            toast.info(`Media error — recovering (${recoveryAttempts.current}/5)`)
            hls.recoverMediaError()
          } else {
            setError('Media error — unable to recover after 5 attempts')
            setLoading(false)
          }
          break
        default:
          setError(`Fatal error: ${data.details}`)
          setLoading(false)
          hls.destroy()
          break
      }
    })
  }, [quality])

  // Apply quality level
  useEffect(() => {
    const hls = hlsRef.current
    if (!hls || availableLevels.length === 0) return
    if (quality === 'auto') {
      hls.currentLevel = -1
    } else {
      // Find level matching the requested height
      const match = availableLevels.find((l) => l.height === quality)
      hls.currentLevel = match ? match.index : -1
    }
  }, [quality, availableLevels])

  // Initialize when stream URL is ready
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return
    recoveryAttempts.current = 0
    setLoading(true)
    initHls(streamUrl)

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current)
      }
    }
  }, [streamUrl, initHls])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => {
      setBuffering(false)
      setLoading(false)
      // Report load time on first play
      const elapsed = Date.now() - loadStartTime
      if (elapsed > 0 && elapsed < 60000) {
        console.log(`Stream loaded in ${elapsed}ms`)
      }
    }
    const onError = () => {
      setError('Video playback error — try refreshing')
      setLoading(false)
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('error', onError)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('error', onError)
    }
  }, [loadStartTime])

  // Volume control
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = muted
  }, [volume, muted])

  // Fullscreen tracking
  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Auto-hide controls
  const scheduleHideControls = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  const handleMouseMove = () => {
    setShowControls(true)
    scheduleHideControls()
  }

  // Toggle play/pause
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  // Toggle mute
  const toggleMute = () => setMuted((m) => !m)

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await containerRef.current.requestFullscreen()
      }
    } catch (err) {
      toast.error('Fullscreen not available')
    }
  }

  // Retry loading
  const retry = () => {
    setError(null)
    setLoading(true)
    recoveryAttempts.current = 0
    if (streamUrl) initHls(streamUrl)
  }

  if (!activeChannel) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No channel selected</p>
            <Button className="mt-4" onClick={() => setView('channels')}>
              Browse Channels
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6">
      {/* Back button + channel info */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <Button variant="ghost" size="sm" onClick={() => setView('channels')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          {activeChannel.channelLogo && (
            <img
              src={activeChannel.channelLogo}
              alt=""
              className="h-8 w-8 object-contain rounded"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold truncate">{activeChannel.channelName}</h1>
            {activeChannel.category && (
              <p className="text-xs text-muted-foreground truncate">{activeChannel.category}</p>
            )}
          </div>
        </div>
      </div>

      {/* Player */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => playing && setShowControls(false)}
        style={{ cursor: showControls ? 'default' : 'none' }}
      >
        <video
          ref={videoRef}
          className="h-full w-full"
          playsInline
          onClick={togglePlay}
        />

        {/* Loading spinner */}
        {(loading || buffering) && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
              <p className="text-sm text-white/80">{loading ? 'Loading stream…' : 'Buffering…'}</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="max-w-md text-center">
              <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Playback Error</p>
              <p className="text-sm text-white/60 mb-4">{error}</p>
              <Button onClick={retry} variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* LIVE badge */}
        {!error && !loading && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-rose-500 text-white gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              LIVE
            </Badge>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && !error && (
          <div className="absolute bottom-20 right-4 w-48 rounded-lg bg-black/80 backdrop-blur-md p-2 text-white">
            <div className="text-xs font-semibold uppercase tracking-wider px-2 py-1 mb-1">Quality</div>
            <button
              onClick={() => { setQuality('auto'); setShowSettings(false) }}
              className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-white/10 ${quality === 'auto' ? 'text-rose-400' : ''}`}
            >
              Auto
            </button>
            {availableLevels.map((lvl) => (
              <button
                key={lvl.index}
                onClick={() => { setQuality(lvl.height); setShowSettings(false) }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-white/10 ${quality === lvl.height ? 'text-rose-400' : ''}`}
              >
                {lvl.height}p
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        {showControls && !error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-rose-400 transition-colors"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>

              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-rose-400 transition-colors"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <Slider
                  value={[muted ? 0 : volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setVolume(v[0] / 100)
                    if (v[0] > 0) setMuted(false)
                  }}
                  className="flex-1"
                />
              </div>

              <div className="flex-1" />

              {availableLevels.length > 0 && (
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="text-white hover:text-rose-400 transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-rose-400 transition-colors"
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel details */}
      <Card className="mt-6 border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
              {activeChannel.channelLogo ? (
                <img
                  src={activeChannel.channelLogo}
                  alt={activeChannel.channelName}
                  className="h-12 w-12 object-contain"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <Play className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">{activeChannel.channelName}</h2>
              {activeChannel.category && (
                <Badge variant="outline" className="mt-1">{activeChannel.category}</Badge>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Streaming live via Playbeat Digital. The player automatically recovers from network and media errors for uninterrupted viewing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
