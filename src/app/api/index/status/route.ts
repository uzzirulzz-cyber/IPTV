import { NextResponse } from 'next/server'
import { getIndexStatus } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status = await getIndexStatus()
  return NextResponse.json(status)
}
