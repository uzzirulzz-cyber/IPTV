import { NextResponse } from 'next/server'
import { signOutUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  await signOutUser()
  return NextResponse.json({ ok: true })
}
