import { NextRequest, NextResponse } from 'next/server'
import { signInUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email || '').toString().trim().toLowerCase()
    const name = (body.name || '').toString().trim() || undefined
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    const user = await signInUser(email, name)
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sign-in failed' },
      { status: 500 }
    )
  }
}
