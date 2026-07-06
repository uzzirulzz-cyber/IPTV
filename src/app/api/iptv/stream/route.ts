import { NextRequest, NextResponse } from 'next/server'
import { buildStreamUrl } from '@/lib/iptv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const streamId = searchParams.get('stream_id')
  const format = (searchParams.get('format') as 'm3u8' | 'ts') || 'm3u8'
  if (!streamId) {
    return NextResponse.json({ error: 'stream_id is required' }, { status: 400 })
  }
  const url = buildStreamUrl(streamId, format)
  return NextResponse.json({ url, format })
}
