import { NextRequest, NextResponse } from 'next/server'
import { getCatalog, getLiveCategories } from '@/lib/iptv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const categoryId = searchParams.get('category_id') || undefined
  try {
    if (searchParams.get('categories_only') === '1') {
      const categories = await getLiveCategories()
      return NextResponse.json({ categories })
    }
    const { categories, channels, error } = await getCatalog(categoryId)
    return NextResponse.json({ categories, channels, error })
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch IPTV catalog',
      },
      { status: 502 }
    )
  }
}
