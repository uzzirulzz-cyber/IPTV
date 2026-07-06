import { NextResponse } from 'next/server'
import { signOutAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  await signOutAdmin()
  return NextResponse.json({ ok: true })
}
