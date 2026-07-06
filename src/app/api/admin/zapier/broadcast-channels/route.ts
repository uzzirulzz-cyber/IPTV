import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIndexStatus } from '@/lib/indexing'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/zapier/broadcast-channels
 *
 * Sends the full channel broadcasting list to the configured Zapier webhook.
 *
 * The payload is formatted to work with the user's Zapier Code step which
 * expects `raw_body` — a JSON string that gets POSTed to the opplex.ch API
 * with basic auth.
 *
 * Body options:
 *   - category: string (optional) — filter by category
 *   - limit: number (optional, default 500, max 2000) — channels to send
 *   - format: "xtream" | "m3u" | "json" (default "json") — output format
 */
export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const category = body.category as string | undefined
  const limit = Math.min(parseInt(body.limit || '500', 10), 2000)
  const format = (body.format as 'xtream' | 'm3u' | 'json') || 'json'

  // Load the Zapier config
  const config = await db.zapierConfig.findUnique({ where: { key: 'zapier' } })
  if (!config?.webhookUrl || !config.isActive) {
    return NextResponse.json(
      { error: 'Zapier webhook is not configured or inactive. Set it up in the Zapier tab first.' },
      { status: 400 }
    )
  }

  // Fetch channels from MongoDB
  const where: { category?: string } = {}
  if (category && category !== 'All') {
    where.category = category
  }

  const [channels, total] = await Promise.all([
    db.channel.findMany({
      where,
      select: {
        streamId: true,
        name: true,
        logo: true,
        category: true,
        streamUrl: true,
        streamFmt: true,
        featured: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    }),
    db.channel.count({ where }),
  ])

  if (channels.length === 0) {
    return NextResponse.json({ error: 'No channels found to broadcast' }, { status: 400 })
  }

  // Build the raw_body based on the requested format
  let rawBody: string

  if (format === 'm3u') {
    // M3U playlist format
    const lines = ['#EXTM3U']
    for (const ch of channels) {
      lines.push(
        `#EXTINF:-1 tvg-id="${ch.streamId}" tvg-name="${ch.name}" tvg-logo="${ch.logo || ''}" group-title="${ch.category}",${ch.name}`
      )
      lines.push(ch.streamUrl)
    }
    rawBody = lines.join('\n')
  } else if (format === 'xtream') {
    // Xtream Codes API format — array of stream objects
    rawBody = JSON.stringify(
      channels.map((ch) => ({
        num: ch.streamId,
        name: ch.name,
        stream_type: 'live',
        stream_id: ch.streamId,
        stream_icon: ch.logo || '',
        epg_channel_id: null,
        added: Math.floor(Date.now() / 1000).toString(),
        is_adult: '0',
        category_id: ch.category,
        custom_sid: '',
        direct_source: '',
        tv_archive: 0,
        stream_url: ch.streamUrl,
      })),
      null,
      2
    )
  } else {
    // JSON format — clean array of channel objects
    rawBody = JSON.stringify(
      channels.map((ch) => ({
        id: ch.streamId,
        name: ch.name,
        logo: ch.logo || '',
        category: ch.category,
        url: ch.streamUrl,
        format: ch.streamFmt,
        featured: ch.featured,
      })),
      null,
      2
    )
  }

  // Build the full payload for Zapier
  const indexStatus = await getIndexStatus()
  const payload = {
    raw_body: rawBody,
    message: `Channel broadcasting list — ${channels.length} channels`,
    source: 'Playbeat Digital',
    timestamp: new Date().toISOString(),
    format,
    stats: {
      totalChannels: indexStatus.totalChannels,
      totalCategories: indexStatus.totalCategories,
      sentChannels: channels.length,
      filteredTotal: total,
      category: category || 'All',
    },
  }

  const payloadJson = JSON.stringify(payload)

  // Log the broadcast
  const log = await db.zapierBroadcast.create({
    data: {
      message: `Channel list broadcast — ${channels.length} channels (${format})`,
      payload: payloadJson,
      status: 'pending',
    },
  })

  // Send to Zapier
  try {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadJson,
      signal: AbortSignal.timeout(30000),
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
        channelsSent: channels.length,
        format,
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
