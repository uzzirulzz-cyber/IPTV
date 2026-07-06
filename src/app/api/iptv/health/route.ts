import { NextResponse } from 'next/server'
import { checkIptvHealth } from '@/lib/iptv'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await checkIptvHealth()
  return NextResponse.json(result)
}
