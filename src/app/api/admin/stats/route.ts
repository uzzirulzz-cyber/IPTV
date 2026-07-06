import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [userCount, favoriteCount, historyCount, categories] = await Promise.all([
    db.user.count(),
    db.favorite.count(),
    db.watchHistory.count(),
    db.user.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
  ])
  return NextResponse.json({
    stats: { userCount, favoriteCount, historyCount },
    users: categories.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      createdAt: u.createdAt,
    })),
  })
}
