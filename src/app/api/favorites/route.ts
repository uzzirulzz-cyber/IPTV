import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ favorites: [] })
  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ favorites })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to save favorites' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const channelId = (body.channelId || '').toString()
    const channelName = (body.channelName || '').toString()
    if (!channelId || !channelName) {
      return NextResponse.json({ error: 'channelId and channelName are required' }, { status: 400 })
    }
    const favorite = await db.favorite.upsert({
      where: { userId_channelId: { userId: user.id, channelId } },
      update: { channelName, channelLogo: body.channelLogo || null, category: body.category || null, streamUrl: body.streamUrl || null },
      create: {
        userId: user.id,
        channelId,
        channelName,
        channelLogo: body.channelLogo || null,
        category: body.category || null,
        streamUrl: body.streamUrl || null,
      },
    })
    return NextResponse.json({ favorite })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save favorite' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to manage favorites' }, { status: 401 })
  }
  const searchParams = req.nextUrl.searchParams
  const channelId = searchParams.get('channelId')
  if (channelId) {
    await db.favorite.deleteMany({ where: { userId: user.id, channelId } })
  } else {
    await db.favorite.deleteMany({ where: { userId: user.id } })
  }
  return NextResponse.json({ ok: true })
}
