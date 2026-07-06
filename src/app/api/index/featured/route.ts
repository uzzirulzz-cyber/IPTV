import { NextResponse } from 'next/server'
import { getFeaturedChannels } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '24', 10), 100)
  const channels = await getFeaturedChannels(limit)
  return NextResponse.json({ channels })
}
