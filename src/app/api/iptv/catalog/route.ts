import { NextRequest, NextResponse } from 'next/server'
import { getChannelsFromIndex, getCategoriesFromIndex, getIndexStatus } from '@/lib/indexing'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/iptv/catalog
 *
 * Returns channels + categories from the LOCAL MongoDB index ONLY.
 * Never falls back to the live IPTV server — that was causing
 * "Unexpected end of JSON input" errors when the server was slow.
 *
 * Query params:
 *   - category_id: filter by category name
 *   - search: search by channel name
 *   - categories_only: 1 = return only the category list
 *   - limit: max channels to return (default 200, max 500)
 *   - offset: pagination offset
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const categoryId = searchParams.get('category_id') || undefined
  const search = searchParams.get('search') || undefined
  const categoriesOnly = searchParams.get('categories_only') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    // Quick check: do we have any channels at all?
    const channelCount = await db.channel.count()
    if (channelCount === 0) {
      return NextResponse.json({
        categories: [],
        channels: [],
        total: 0,
        source: 'index',
        error: 'No channels indexed. Visit /admin → Index tab to index channels.',
      })
    }

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
      offset,
    })

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
        channels: [],
        categories: [],
        total: 0,
      },
      { status: 500 }
    )
  }
}
