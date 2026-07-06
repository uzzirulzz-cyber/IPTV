import { NextRequest, NextResponse } from 'next/server'
import { buildStreamUrl } from '@/lib/iptv'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/iptv/proxy?stream_id=<id>&format=m3u8
 *
 * Fetches the m3u8 playlist from the IPTV server (following redirects)
 * and rewrites all relative segment URLs to absolute URLs so HLS.js
 * can load them directly from the browser.
 *
 * Without this proxy, HLS.js gets a 302 redirect to a backend server,
 * but the segment URLs in the playlist are relative (e.g. "/hls/abc/123.ts")
 * and HLS.js can't resolve them because it doesn't know the final base URL.
 *
 * The proxy also adds CORS-friendly headers and a proper Content-Type.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const streamId = searchParams.get('stream_id')
  const format = (searchParams.get('format') as 'm3u8' | 'ts') || 'm3u8'

  if (!streamId) {
    return NextResponse.json({ error: 'stream_id is required' }, { status: 400 })
  }

  const upstreamUrl = buildStreamUrl(streamId, format)

  try {
    // Fetch the m3u8 with VLC User-Agent (bypasses Cloudflare)
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
        { error: `IPTV server returned HTTP ${res.status}` },
        { status: 502 }
      )
    }

    const raw = await res.text()

    // Check for IPTV server-side errors (some channels return JSON errors
    // or plain-text "Cannot read" errors)
    if (raw.includes('"error"') || raw.includes('"status":false')) {
      return NextResponse.json(
        { error: 'This channel is not available on the IPTV server' },
        { status: 502 }
      )
    }

    // "Cannot read /home/nxt/storage/streams/..." means the channel file
    // doesn't exist on the IPTV server's backend
    if (raw.includes('Cannot read') || !raw.includes('#EXTM3U')) {
      return NextResponse.json(
        { error: 'This channel is not available on the IPTV server' },
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
            : 'Failed to fetch stream from IPTV server',
      },
      { status: 502 }
    )
  }
}

/**
 * Rewrite all relative URLs in an M3U8 playlist to absolute URLs.
 *
 * M3U8 lines that are NOT comments (don't start with #) are URLs.
 * Also rewrite #EXT-X-KEY URI attributes if present.
 */
function rewriteM3u8Urls(raw: string, baseUrl: string): string {
  const lines = raw.split(/\r?\n/)
  const base = new URL(baseUrl)

  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      // Comment line — may contain URI="..." attributes
      if (trimmed.startsWith('#')) {
        return rewriteUriAttributes(trimmed, base)
      }

      // Non-comment line = segment URL
      return resolveUrl(trimmed, base)
    })
    .join('\n')
}

/**
 * Resolve a possibly-relative URL against the base URL.
 * If the URL is already absolute, return it unchanged.
 */
function resolveUrl(url: string, base: URL): string {
  try {
    return new URL(url, base).href
  } catch {
    return url
  }
}

/**
 * Rewrite URI="..." attributes inside #EXT-X-KEY and #EXT-X-MAP lines.
 */
function rewriteUriAttributes(line: string, base: URL): string {
  return line.replace(/URI="([^"]+)"/g, (_match, url) => {
    const resolved = resolveUrl(url, base)
    return `URI="${resolved}"`
  })
}
