import { NextResponse } from 'next/server'
import { getIndexStatus, getFeaturedChannels } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/init
 *
 * Returns the initial storefront data for server-side rendering.
 * Unlike /api/storefront/refresh (which rotates channels), this returns
 * a stable set of featured channels + status so the home page renders
 * with content immediately (no empty state on first load).
 */
export async function GET() {
  const [status, featured] = await Promise.all([
    getIndexStatus(),
    getFeaturedChannels(12),
  ])

  return NextResponse.json({
    featured,
    status: {
      state: status.status,
      totalChannels: status.totalChannels,
      totalCategories: status.totalCategories,
      lastUpdated: status.completedAt,
      ageSeconds: status.completedAt
        ? Math.round((Date.now() - new Date(status.completedAt).getTime()) / 1000)
        : null,
    },
    loadedAt: new Date().toISOString(),
  })
}
