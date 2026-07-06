import { NextRequest, NextResponse } from 'next/server'
import { buildStreamUrl } from '@/lib/iptv'
import { getChannelById } from '@/lib/indexing'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/iptv/proxy?stream_id=<id>
 *
 * Fetches the m3u8 playlist and rewrites all relative segment URLs to
 * absolute URLs so HLS.js can load them directly from the browser.
 *
 * Two sources:
 *   1. iptv-org channels (streamId starts with "iptvorg_") — the streamUrl
 *      is already an absolute HLS URL, we just fetch and rewrite.
 *   2. Xtream Codes channels — we build a /live/<user>/<pass>/<id>.m3u8 URL
 *      and follow redirects to get the final backend URL.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const streamId = searchParams.get('stream_id')

  if (!streamId) {
    return NextResponse.json({ error: 'stream_id is required' }, { status: 400 })
  }

  let upstreamUrl: string

  // Look up the channel in the local index
  const indexed = await getChannelById(streamId).catch(() => null)

  if (indexed && indexed.streamUrl) {
    // Use the stored stream URL directly (iptv-org channels have absolute URLs)
    upstreamUrl = indexed.streamUrl
  } else {
    // Fall back to building an Xtream Codes URL
    const format = (searchParams.get('format') as 'm3u8' | 'ts') || 'm3u8'
    upstreamUrl = buildStreamUrl(streamId, format)
  }

  try {
    // Fetch the m3u8 with VLC User-Agent (bypasses Cloudflare on opplex.ch)
    const res = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        Accept: '*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Stream server returned HTTP ${res.status}` },
        { status: 502 }
      )
    }

    const raw = await res.text()

    // Validate that we got an actual M3U8 playlist
    if (!raw.includes('#EXTM3U')) {
      return NextResponse.json(
        { error: 'This channel is not available' },
        { status: 502 }
      )
    }

    // Get the final URL after all redirects — this is the base for relative URLs
    const finalUrl = res.url || upstreamUrl

    // Rewrite all relative URLs in the playlist to absolute
    const rewritten = rewriteM3u8Urls(raw, finalUrl)

    // Return with proper HLS content type
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch stream',
      },
      { status: 502 }
    )
  }
}

/**
 * Rewrite all relative URLs in an M3U8 playlist to absolute URLs.
 */
function rewriteM3u8Urls(raw: string, baseUrl: string): string {
  const lines = raw.split(/\r?\n/)
  const base = new URL(baseUrl)

  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (trimmed.startsWith('#')) {
        return rewriteUriAttributes(trimmed, base)
      }

      return resolveUrl(trimmed, base)
    })
    .join('\n')
}

function resolveUrl(url: string, base: URL): string {
  try {
    return new URL(url, base).href
  } catch {
    return url
  }
}

function rewriteUriAttributes(line: string, base: URL): string {
  return line.replace(/URI="([^"]+)"/g, (_match, url) => {
    const resolved = resolveUrl(url, base)
    return `URI="${resolved}"`
  })
}
