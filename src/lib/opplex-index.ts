/**
 * Opplex.ch (Xtream Codes) channel indexer.
 *
 * Fetches all live channels from the opplex.ch IPTV server using the
 * Xtream Codes player_api.php endpoint with VLC User-Agent (bypasses
 * Cloudflare blocking).
 *
 * Credentials are read from env vars:
 *   IPTV_URL, IPTV_USERNAME, IPTV_PASSWORD
 */

import { db } from './db'

interface XtreamCategory {
  category_id: string
  category_name: string
}

interface XtreamStream {
  num: number
  name: string
  stream_type: string
  stream_id: number
  stream_icon: string
  epg_channel_id: string | null
  added: string
  is_adult: string
  category_id: string
  custom_sid: string
  direct_source: string
  tv_archive: number
}

function getCredentials() {
  const url = process.env.IPTV_URL || ''
  const username = process.env.IPTV_USERNAME || ''
  const password = process.env.IPTV_PASSWORD || ''
  return { url: url.replace(/\/$/, ''), username, password }
}

const VLC_UA = 'VLC/3.0.18 LibVLC/3.0.18'

async function fetchXtream(action: string, params: Record<string, string> = {}) {
  const { url, username, password } = getCredentials()
  const query = new URLSearchParams({ username, password, ...params })
  const endpoint = `${url}/player_api.php?action=${action}&${query.toString()}`
  const res = await fetch(endpoint, {
    headers: { 'User-Agent': VLC_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${action}`)
  return res.json()
}

export interface OpplexIndexResult {
  ok: boolean
  totalChannels: number
  totalCategories: number
  error?: string
  durationMs: number
}

export async function runOpplexIndex(): Promise<OpplexIndexResult> {
  const startedAt = new Date()
  const startMs = Date.now()

  await db.indexMeta.upsert({
    where: { key: 'last_index' },
    update: { status: 'running', error: null, startedAt, completedAt: null },
    create: { key: 'last_index', status: 'running', startedAt },
  })

  try {
    const { url, username, password } = getCredentials()
    if (!url || !username || !password) {
      throw new Error('IPTV credentials not configured (IPTV_URL, IPTV_USERNAME, IPTV_PASSWORD)')
    }

    // Step 1: Fetch all categories
    const categories = (await fetchXtream('get_live_categories')) as XtreamCategory[]
    if (!Array.isArray(categories)) throw new Error('Failed to fetch categories')

    // Step 2: Fetch all live streams (all categories at once)
    const streams = (await fetchXtream('get_live_streams')) as XtreamStream[]
    if (!Array.isArray(streams)) throw new Error('Failed to fetch streams')

    // Step 3: Build channel list with categories
    const catMap = new Map(categories.map((c) => [c.category_id, c.category_name]))
    const channels = streams.map((s) => ({
      streamId: `opplex_${s.stream_id}`,
      name: s.name,
      logo: s.stream_icon || null,
      category: catMap.get(s.category_id) || 'Uncategorized',
      streamUrl: `${url}/live/${username}/${password}/${s.stream_id}.m3u8`,
      streamFmt: 'm3u8' as const,
      featured: false,
    }))

    // Mark featured categories
    const FEATURED_PATTERNS = [
      /NEWS/i, /SPORTS/i, /SKY SPORTS/i, /BT SPORT/i, /ESPN/i, /beIN/i,
      /MOVIES/i, /HOLLYWOOD/i, /BOLLYWOOD/i, /KIDS/i, /MUSIC/i,
      /ENTERTAINMENT/i, /BBC/i, /CNN/i, /FOX/i, /PAKISTAN/i, /INDIAN/i,
    ]
    for (const ch of channels) {
      if (FEATURED_PATTERNS.some((p) => p.test(ch.category))) {
        ch.featured = true
      }
    }

    // Step 4: Clear old channels and insert
    await db.channel.deleteMany({})

    const INSERT_BATCH = 500
    for (let i = 0; i < channels.length; i += INSERT_BATCH) {
      const batch = channels.slice(i, i + INSERT_BATCH)
      await db.channel.createMany({
        data: batch.map((ch) => ({
          streamId: ch.streamId,
          name: ch.name,
          logo: ch.logo,
          category: ch.category,
          streamUrl: ch.streamUrl,
          streamFmt: ch.streamFmt,
          featured: ch.featured,
        })),
      })
    }

    const completedAt = new Date()
    const durationMs = Date.now() - startMs

    await db.indexMeta.upsert({
      where: { key: 'last_index' },
      update: {
        status: 'success',
        error: null,
        totalChannels: channels.length,
        totalCategories: categories.length,
        completedAt,
      },
      create: {
        key: 'last_index',
        status: 'success',
        totalChannels: channels.length,
        totalCategories: categories.length,
        startedAt,
        completedAt,
      },
    })

    return {
      ok: true,
      totalChannels: channels.length,
      totalCategories: categories.length,
      durationMs,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown indexing error'
    await db.indexMeta.upsert({
      where: { key: 'last_index' },
      update: { status: 'error', error: errorMsg, completedAt: new Date() },
      create: { key: 'last_index', status: 'error', error: errorMsg, startedAt, completedAt: new Date() },
    })
    return { ok: false, totalChannels: 0, totalCategories: 0, error: errorMsg, durationMs: Date.now() - startMs }
  }
}
