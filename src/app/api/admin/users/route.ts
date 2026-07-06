import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      createdAt: u.createdAt,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const searchParams = req.nextUrl.searchParams
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  // Cascade: delete favorites + history + user
  await Promise.all([
    db.favorite.deleteMany({ where: { userId } }),
    db.watchHistory.deleteMany({ where: { userId } }),
  ])
  await db.user.delete({ where: { id: userId } })
  return NextResponse.json({ ok: true })
}
