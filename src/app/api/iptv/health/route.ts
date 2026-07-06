import { NextResponse } from 'next/server'
import { getIndexStatus } from '@/lib/indexing'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/iptv/health
 *
 * Returns the health of the iptv-org channel database.
 * The app uses the public iptv-org/iptv GitHub repository as its
 * channel source — no auth credentials needed.
 */
export async function GET() {
  const indexStatus = await getIndexStatus()
  const channelCount = await db.channel.count().catch(() => 0)

  const ok = indexStatus.status === 'success' && channelCount > 0

  return NextResponse.json({
    ok,
    source: 'iptv-org/iptv (GitHub)',
    totalChannels: channelCount,
    totalCategories: indexStatus.totalCategories,
    lastUpdated: indexStatus.completedAt,
    ageSeconds: indexStatus.completedAt
      ? Math.round((Date.now() - new Date(indexStatus.completedAt).getTime()) / 1000)
      : null,
    error: ok ? undefined : (indexStatus.error || 'No channels indexed'),
  })
}
