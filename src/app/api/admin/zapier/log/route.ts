import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/zapier/log — returns the last 20 broadcast messages
 */
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await db.zapierBroadcast.findMany({
    orderBy: { sentAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      message: l.message,
      status: l.status,
      response: l.response,
      sentAt: l.sentAt,
    })),
  })
}

/**
 * DELETE /api/admin/zapier/log — clears all broadcast logs
 */
export async function DELETE() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.zapierBroadcast.deleteMany({})
  return NextResponse.json({ ok: true })
}
