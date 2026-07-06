import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { getIndexStatus } from '@/lib/indexing'
import { runIptvOrgIndex } from '@/lib/iptv-org-index'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

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

  // Run the iptv-org index (fetches from GitHub, parses, stores in MongoDB)
  const result = await runIptvOrgIndex()
  return NextResponse.json(result)
}

export async function GET() {
  const status = await getIndexStatus()
  return NextResponse.json(status)
}
