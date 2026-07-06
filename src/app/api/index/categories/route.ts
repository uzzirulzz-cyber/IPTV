import { NextResponse } from 'next/server'
import { getCategoriesFromIndex } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const categories = await getCategoriesFromIndex()
  return NextResponse.json({ categories })
}
