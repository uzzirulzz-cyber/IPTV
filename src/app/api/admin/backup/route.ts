import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/admin/backup
 *
 * Creates a backup snapshot of all current channels in MongoDB.
 * The backup is stored in the ChannelBackup collection as a JSON string.
 *
 * Body: { source?: string } — defaults to "opplex"
 */
export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const source = (body.source as string) || 'opplex'

  // Fetch all channels
  const channels = await db.channel.findMany({
    select: {
      streamId: true,
      name: true,
      logo: true,
      category: true,
      streamUrl: true,
      streamFmt: true,
      featured: true,
    },
    orderBy: { name: 'asc' },
  })

  if (channels.length === 0) {
    return NextResponse.json({ error: 'No channels to backup' }, { status: 400 })
  }

  // Count categories
  const catSet = new Set(channels.map((c) => c.category))

  // Build backup key with date
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const backupKey = `${source}_${dateStr}_${now.getTime()}`

  // Store as JSON string
  const channelsJson = JSON.stringify(channels)

  const backup = await db.channelBackup.create({
    data: {
      backupKey,
      source,
      totalChannels: channels.length,
      totalCategories: catSet.size,
      channels: channelsJson,
    },
  })

  return NextResponse.json({
    ok: true,
    id: backup.id,
    backupKey: backup.backupKey,
    source: backup.source,
    totalChannels: backup.totalChannels,
    totalCategories: backup.totalCategories,
    createdAt: backup.createdAt,
  })
}

/**
 * GET /api/admin/backup
 *
 * Lists all backups (without the full channel data).
 */
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const backups = await db.channelBackup.findMany({
    select: {
      id: true,
      backupKey: true,
      source: true,
      totalChannels: true,
      totalCategories: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ backups })
}

/**
 * DELETE /api/admin/backup?id=<id>
 *
 * Deletes a specific backup.
 */
export async function DELETE(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await db.channelBackup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
