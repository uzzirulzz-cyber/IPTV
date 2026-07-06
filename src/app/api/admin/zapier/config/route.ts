import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/zapier/config — returns the current Zapier webhook config
 * POST /api/admin/zapier/config — updates the webhook URL + active state
 */
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await db.zapierConfig.findUnique({ where: { key: 'zapier' } })
  return NextResponse.json({
    webhookUrl: config?.webhookUrl || '',
    isActive: config?.isActive || false,
  })
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const webhookUrl = (body.webhookUrl || '').toString().trim()
  const isActive = Boolean(body.isActive)

  // Validate URL if provided
  if (webhookUrl) {
    try {
      const parsed = new URL(webhookUrl)
      if (!parsed.hostname.includes('zapier.com') && !parsed.hostname.includes('hooks.zapier.com')) {
        return NextResponse.json({ error: 'URL must be a Zapier webhook URL (hooks.zapier.com)' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
  }

  const config = await db.zapierConfig.upsert({
    where: { key: 'zapier' },
    update: { webhookUrl: webhookUrl || null, isActive },
    create: { key: 'zapier', webhookUrl: webhookUrl || null, isActive },
  })

  return NextResponse.json({
    webhookUrl: config.webhookUrl || '',
    isActive: config.isActive,
  })
}
