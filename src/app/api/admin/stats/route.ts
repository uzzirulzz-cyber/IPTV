import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIndexStatus } from '@/lib/indexing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [userCount, favoriteCount, historyCount, recentUsers, indexStatus] = await Promise.all([
    db.user.count(),
    db.favorite.count(),
    db.watchHistory.count(),
    db.user.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
    getIndexStatus(),
  ])
  return NextResponse.json({
    stats: {
      userCount,
      favoriteCount,
      historyCount,
      indexedChannels: indexStatus.totalChannels,
      indexedCategories: indexStatus.totalCategories,
      indexStatus: indexStatus.status,
    },
    users: recentUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      createdAt: u.createdAt,
    })),
  })
}
