import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { getIndexStatus } from '@/lib/indexing'
import { runOpplexIndex } from '@/lib/opplex-index'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getIndexStatus()
  if (status.status === 'running') {
    return NextResponse.json(
      { error: 'Indexing is already in progress', status },
      { status: 409 }
    )
  }

  const result = await runOpplexIndex()
  return NextResponse.json(result)
}

export async function GET() {
  const status = await getIndexStatus()
  return NextResponse.json(status)
}
