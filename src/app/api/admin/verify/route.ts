import { NextRequest, NextResponse } from 'next/server'
import { signInAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email || '').toString().trim()
    const password = (body.password || '').toString()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const ok = await signInAdmin(email, password)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Admin login failed' },
      { status: 500 }
    )
  }
}
