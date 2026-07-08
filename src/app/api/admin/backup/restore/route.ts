import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/admin/backup/restore?id=<backupId>
 *
 * Restores channels from a backup snapshot.
 * Replaces all current channels with the backup data.
 */
export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const backup = await db.channelBackup.findUnique({ where: { id } })
  if (!backup) return NextResponse.json({ error: 'Backup not found' }, { status: 404 })

  // Parse the channels JSON
  let channels: Array<{
    streamId: string
    name: string
    logo: string | null
    category: string
    streamUrl: string
    streamFmt: string
    featured: boolean
  }>
  try {
    channels = JSON.parse(backup.channels)
  } catch {
    return NextResponse.json({ error: 'Backup data is corrupted' }, { status: 500 })
  }

  // Clear current channels and restore from backup
  await db.channel.deleteMany({})

  const INSERT_BATCH = 500
  for (let i = 0; i < channels.length; i += INSERT_BATCH) {
    const batch = channels.slice(i, i + INSERT_BATCH)
    await db.channel.createMany({
      data: batch.map((ch) => ({
        streamId: ch.streamId,
        name: ch.name,
        logo: ch.logo,
        category: ch.category,
        streamUrl: ch.streamUrl,
        streamFmt: ch.streamFmt,
        featured: ch.featured,
      })),
    })
  }

  return NextResponse.json({
    ok: true,
    restoredChannels: channels.length,
    source: backup.source,
    backupKey: backup.backupKey,
  })
}
