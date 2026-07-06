import { NextRequest, NextResponse } from 'next/server'
import { buildStreamUrl } from '@/lib/iptv'
import { getChannelById } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/iptv/stream?stream_id=<id>&format=m3u8|ts
 *
 * Returns the direct stream URL for a channel.
 *
 * Strategy:
 *   - We always build an Xtream Codes /live/<user>/<pass>/<id>.<format> URL
 *     because the browser needs a proper HLS (.m3u8) or TS (.ts) endpoint.
 *   - The indexed streamUrl is stored for reference but we don't serve it
 *     directly because raw /<user>/<pass>/<id> URLs without an extension
 *     are not playable by browsers.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const streamId = searchParams.get('stream_id')
  const requestedFormat = (searchParams.get('format') as 'm3u8' | 'ts') || 'm3u8'
  if (!streamId) {
    return NextResponse.json({ error: 'stream_id is required' }, { status: 400 })
  }

  // Look up the channel in the index (for metadata/logging)
  const indexed = await getChannelById(streamId).catch(() => null)

  // Always build a proper /live/ URL with the requested format
  const url = buildStreamUrl(streamId, requestedFormat)
  return NextResponse.json({
    url,
    format: requestedFormat,
    source: 'built',
    channelName: indexed?.name || null,
    category: indexed?.category || null,
  })
}
