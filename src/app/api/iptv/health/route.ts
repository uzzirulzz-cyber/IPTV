import { NextResponse } from 'next/server'
import { getIndexStatus } from '@/lib/indexing'
import { db } from '@/lib/db'
import { checkIptvHealth } from '@/lib/iptv'

export const dynamic = 'force-dynamic'

/**
 * GET /api/iptv/health
 *
 * Returns the health of both:
 *   1. The opplex.ch IPTV server (Xtream Codes API)
 *   2. The local MongoDB channel index
 */
export async function GET() {
  const indexStatus = await getIndexStatus()
  const channelCount = await db.channel.count().catch(() => 0)

  // Check opplex.ch server health
  const opplexHealth = await checkIptvHealth()

  const ok = indexStatus.status === 'success' && channelCount > 0

  return NextResponse.json({
    ok,
    opplex: {
      ok: opplexHealth.ok,
      error: opplexHealth.error,
      source: 'opplex.ch (Xtream Codes)',
      server: opplexHealth.server_info?.url || 'opplex.ch',
      status: opplexHealth.user_info?.status || 'Unknown',
      activeConnections: opplexHealth.user_info?.active_cons || '0',
      maxConnections: opplexHealth.user_info?.max_connections || '—',
      expires: opplexHealth.user_info?.exp_date || null,
    },
    index: {
      totalChannels: channelCount,
      totalCategories: indexStatus.totalCategories,
      lastUpdated: indexStatus.completedAt,
      ageSeconds: indexStatus.completedAt
        ? Math.round((Date.now() - new Date(indexStatus.completedAt).getTime()) / 1000)
        : null,
    },
    error: ok ? undefined : (indexStatus.error || 'No channels indexed'),
  })
}
