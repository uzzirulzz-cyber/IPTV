import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIndexStatus } from '@/lib/indexing'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/admin/zapier/broadcast
 *
 * Sends a broadcast message to the configured Zapier webhook.
 * The payload includes the message plus live database stats so the
 * Zapier automation has full context.
 *
 * Body: { message: string, data?: any }
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const message = (body.message || '').toString().trim()
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Load the Zapier config
  const config = await db.zapierConfig.findUnique({ where: { key: 'zapier' } })
  if (!config?.webhookUrl || !config.isActive) {
    return NextResponse.json(
      { error: 'Zapier webhook is not configured or inactive. Set it up in the Zapier tab.' },
      { status: 400 }
    )
  }

  // Build the payload — include the message + live stats
  const indexStatus = await getIndexStatus()
  const payload = {
    message,
    data: body.data || {},
    source: 'Playbeat Digital',
    timestamp: new Date().toISOString(),
    stats: {
      totalChannels: indexStatus.totalChannels,
      totalCategories: indexStatus.totalCategories,
      indexStatus: indexStatus.status,
      lastUpdated: indexStatus.completedAt,
    },
  }

  const payloadJson = JSON.stringify(payload)

  // Log the broadcast as pending
  const log = await db.zapierBroadcast.create({
    data: {
      message,
      payload: payloadJson,
      status: 'pending',
    },
  })

  // Send the POST request to Zapier
  try {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadJson,
      signal: AbortSignal.timeout(15000),
    })

    const responseText = await res.text()
    const responseSnippet = responseText.substring(0, 500)

    if (res.ok) {
      await db.zapierBroadcast.update({
        where: { id: log.id },
        data: { status: 'sent', response: responseSnippet || `HTTP ${res.status}` },
      })
      return NextResponse.json({
        ok: true,
        status: 'sent',
        httpStatus: res.status,
        response: responseSnippet,
      })
    } else {
      await db.zapierBroadcast.update({
        where: { id: log.id },
        data: { status: 'failed', response: `HTTP ${res.status}: ${responseSnippet}` },
      })
      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: `Zapier returned HTTP ${res.status}`,
        response: responseSnippet,
      }, { status: 502 })
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    await db.zapierBroadcast.update({
      where: { id: log.id },
      data: { status: 'failed', response: errorMsg },
    })
    return NextResponse.json({
      ok: false,
      status: 'failed',
      error: errorMsg,
    }, { status: 502 })
  }
}
