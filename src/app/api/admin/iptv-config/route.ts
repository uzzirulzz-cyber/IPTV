import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { getIndexStatus, getCategoriesFromIndex } from '@/lib/indexing'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check the iptv-org database health (not the old opplex.ch server)
  const [indexStatus, indexCategories, channelCount] = await Promise.all([
    getIndexStatus(),
    getCategoriesFromIndex(),
    db.channel.count(),
  ])

  // Health is "ok" if we have indexed channels in MongoDB
  const health = {
    ok: indexStatus.status === 'success' && channelCount > 0,
    error: indexStatus.error,
    source: 'iptv-org/iptv (GitHub)',
    totalChannels: channelCount,
    totalCategories: indexCategories.length,
    lastUpdated: indexStatus.completedAt,
    ageSeconds: indexStatus.completedAt
      ? Math.round((Date.now() - new Date(indexStatus.completedAt).getTime()) / 1000)
      : null,
  }

  // Mask the MongoDB URI for display (show host only, hide credentials)
  const mongoUri = process.env.MONGODB_URL || process.env.DATABASE_URL || ''
  let mongoDisplay: {
    full: string
    masked: string
    protocol: string
    cluster: string
    appName: string
    database: string
  } | null = null
  if (mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      const match = mongoUri.match(/^(mongodb\+srv:\/\/)([^@]+)@([^/?]+)(?:\/([^?]+))?\??(.*)$/)
      if (match) {
        const [, protocol, , cluster, dbName, qs] = match
        const appName = new URLSearchParams(qs || '').get('appName') || 'playbeat'
        mongoDisplay = {
          full: mongoUri,
          masked: `${protocol}*****@${cluster}/${dbName || ''}?appName=${appName}`,
          protocol: 'mongodb+srv (TLS encrypted)',
          cluster,
          appName,
          database: dbName || 'playbeat',
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return NextResponse.json({
    health,
    categories: indexCategories.slice(0, 50).map((c) => ({
      category_id: c.category,
      category_name: c.category,
      count: c.count,
    })),
    totalCategories: indexCategories.length,
    iptv: {
      url: 'https://github.com/iptv-org/iptv',
      username: '(not required — public database)',
      hasPassword: false,
      source: 'iptv-org community database',
    },
    mongo: mongoDisplay,
    streaming: {
      format: 'HLS (m3u8)',
      lowLatency: true,
      bufferSize: 30,
      hlsVersion: '1.6.16',
      recovery: 'Auto-recovery on network/media errors',
    },
  })
}
