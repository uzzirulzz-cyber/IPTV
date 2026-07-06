import { NextRequest, NextResponse } from 'next/server'
import { getCatalog, getLiveCategories } from '@/lib/iptv'
import { getChannelsFromIndex, getCategoriesFromIndex, getIndexStatus } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/iptv/catalog
 *
 * Returns channels + categories. Strategy:
 *   1. If a local index exists (admin ran "Index Now"), read from MongoDB
 *      for instant response.
 *   2. Otherwise, fall back to a live fetch from the IPTV server.
 *
 * Query params:
 *   - category_id: filter by category (live) or category name (index)
 *   - search: search by channel name (index only)
 *   - categories_only: 1 = return only the category list
 *   - source: "live" | "index" | "auto" (default: auto)
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const categoryId = searchParams.get('category_id') || undefined
  const search = searchParams.get('search') || undefined
  const categoriesOnly = searchParams.get('categories_only') === '1'
  const source = (searchParams.get('source') || 'auto') as 'live' | 'index' | 'auto'
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)

  // Check if we have a populated local index
  const indexStatus = await getIndexStatus()
  const hasIndex = indexStatus.status === 'success' && indexStatus.totalChannels > 0

  // If caller explicitly wants live, or no index, use live fetch
  if (source === 'live' || (source === 'auto' && !hasIndex)) {
    try {
      if (categoriesOnly) {
        const categories = await getLiveCategories()
        return NextResponse.json({ categories, source: 'live' })
      }
      const { categories, channels, error } = await getCatalog(categoryId)
      return NextResponse.json({ categories, channels, error, source: 'live' })
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : 'Failed to fetch IPTV catalog',
          source: 'live',
        },
        { status: 502 }
      )
    }
  }

  // Otherwise, read from the local index
  try {
    if (categoriesOnly) {
      const categories = await getCategoriesFromIndex()
      return NextResponse.json({
        categories: categories.map((c) => ({
          category_id: c.category,
          category_name: c.category,
          count: c.count,
        })),
        source: 'index',
      })
    }

    const { channels, total } = await getChannelsFromIndex({
      category: categoryId,
      search,
      limit,
    })

    // Also return the full category list for the sidebar
    const categories = await getCategoriesFromIndex()

    return NextResponse.json({
      categories: categories.map((c) => ({
        category_id: c.category,
        category_name: c.category,
        count: c.count,
      })),
      channels: channels.map((c) => ({
        stream_id: c.streamId,
        name: c.name,
        stream_icon: c.logo,
        category_id: c.category,
        stream_url: c.streamUrl,
        stream_format: c.streamFormat,
        featured: c.featured,
      })),
      total,
      source: 'index',
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to read from index',
        source: 'index',
      },
      { status: 500 }
    )
  }
}
