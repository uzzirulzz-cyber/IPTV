import { NextResponse } from 'next/server'
import { getIndexStatus, getFeaturedChannels, getCategoriesFromIndex } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/refresh
 *
 * Called by the home storefront every 60 seconds to get fresh content.
 * Returns:
 *   - A new batch of featured channels (rotated each call for variety)
 *   - Current index status (last updated, channel count)
 *   - Top categories with counts
 *
 * This makes the storefront feel "alive" — content continuously updates
 * without requiring a page refresh.
 */
export async function GET() {
  const [status, featured, categories] = await Promise.all([
    getIndexStatus(),
    getFeaturedChannels(12),
    getCategoriesFromIndex(),
  ])

  // Rotate featured channels by slicing at a random offset
  // so each refresh shows a different subset
  const offset = status.totalChannels > 0
    ? Math.floor(Math.random() * Math.max(1, featured.length - 6))
    : 0
  const rotated = featured.slice(offset).concat(featured.slice(0, offset))

  return NextResponse.json({
    featured: rotated,
    status: {
      state: status.status,
      totalChannels: status.totalChannels,
      totalCategories: status.totalCategories,
      lastUpdated: status.completedAt,
      ageSeconds: status.completedAt
        ? Math.round((Date.now() - new Date(status.completedAt).getTime()) / 1000)
        : null,
    },
    topCategories: categories.slice(0, 8),
    refreshedAt: new Date().toISOString(),
  })
}
