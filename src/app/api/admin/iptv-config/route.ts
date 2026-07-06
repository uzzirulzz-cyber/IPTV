import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { checkIptvHealth, getLiveCategories } from '@/lib/iptv'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Run health check + categories fetch in parallel
  const [health, categories] = await Promise.all([
    checkIptvHealth(),
    getLiveCategories().catch(() => []),
  ])

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
    categories: categories.slice(0, 50),
    totalCategories: categories.length,
    iptv: {
      url: process.env.IPTV_URL || '',
      username: process.env.IPTV_USERNAME || '',
      // Never return the password to the client
      hasPassword: Boolean(process.env.IPTV_PASSWORD),
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
