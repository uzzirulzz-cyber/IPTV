import { NextRequest, NextResponse } from 'next/server'
import { getChannelsFromIndex, getCategoriesFromIndex } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const category = searchParams.get('category') || undefined
  const search = searchParams.get('search') || undefined
  const featuredOnly = searchParams.get('featured') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const categoriesOnly = searchParams.get('categories_only') === '1'

  if (categoriesOnly) {
    const categories = await getCategoriesFromIndex()
    return NextResponse.json({ categories })
  }

  const { channels, total } = await getChannelsFromIndex({
    category,
    search,
    featuredOnly,
    limit,
    offset,
  })

  return NextResponse.json({ channels, total })
}
