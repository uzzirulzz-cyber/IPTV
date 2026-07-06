import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { runIndex, getIndexStatus } from '@/lib/indexing'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — indexing 15k channels takes time

export async function POST() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if an index is already running
  const status = await getIndexStatus()
  if (status.status === 'running') {
    return NextResponse.json(
      { error: 'Indexing is already in progress', status },
      { status: 409 }
    )
  }

  // Run the index synchronously — this may take 30-90 seconds for 15k channels
  const result = await runIndex()
  return NextResponse.json(result)
}

export async function GET() {
  const status = await getIndexStatus()
  return NextResponse.json(status)
}
