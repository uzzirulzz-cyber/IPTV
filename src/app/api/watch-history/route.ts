import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ history: [] })
  const history = await db.watchHistory.findMany({
    where: { userId: user.id },
    orderBy: { watchedAt: 'desc' },
    take: 24,
  })
  return NextResponse.json({ history })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    // Silent no-op for anonymous users
    return NextResponse.json({ ok: true, anonymous: true })
  }
  try {
    const body = await req.json()
    const channelId = (body.channelId || '').toString()
    const channelName = (body.channelName || '').toString()
    if (!channelId || !channelName) {
      return NextResponse.json({ error: 'channelId and channelName are required' }, { status: 400 })
    }
    const record = await db.watchHistory.upsert({
      where: { userId_channelId: { userId: user.id, channelId } },
      update: {
        channelName,
        channelLogo: body.channelLogo || null,
        category: body.category || null,
        streamUrl: body.streamUrl || null,
        watchedAt: new Date(),
      },
      create: {
        userId: user.id,
        channelId,
        channelName,
        channelLogo: body.channelLogo || null,
        category: body.category || null,
        streamUrl: body.streamUrl || null,
      },
    })
    return NextResponse.json({ history: record })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record watch event' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to manage history' }, { status: 401 })
  }
  const searchParams = req.nextUrl.searchParams
  const channelId = searchParams.get('channelId')
  if (channelId) {
    await db.watchHistory.deleteMany({ where: { userId: user.id, channelId } })
  } else {
    await db.watchHistory.deleteMany({ where: { userId: user.id } })
  }
  return NextResponse.json({ ok: true })
}
