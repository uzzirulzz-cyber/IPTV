/**
 * Xtream Codes IPTV API client.
 * Connects to an Xtream Codes server to fetch live categories,
 * live channels (streams), and server info.
 *
 * All requests are server-side only — never expose IPTV_PASSWORD to the client.
 *
 * NOTE: Some IPTV servers (e.g. those behind Cloudflare) block requests
 * with default Node/fetch User-Agent strings. We use a VLC User-Agent
 * which is whitelisted by most IPTV providers.
 */

export interface IptvCategory {
  category_id: string
  category_name: string
  parent_id: number
}

export interface IptvChannel {
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
  direct_source_url?: string
}

export interface IptvServerInfo {
  url: string
  port: string
  https_port: string
  server_protocol: string
  rtmp_port: string
  timezone: string
  timestamp_now: number
  time_now: string
}

export interface IptvUserInfo {
  username: string
  password: string
  message: string
  auth: number
  status: string
  exp_date: string | null
  is_trial: string
  active_cons: string
  created_at: string
  max_connections: string
  allowed_output_formats: string[]
}

export interface IptvAuthResult {
  user_info: IptvUserInfo
  server_info: IptvServerInfo
}

/** A channel parsed from the M3U playlist. */
export interface M3uChannel {
  streamId: string
  name: string
  logo: string
  category: string
  streamUrl: string
  streamFormat: 'm3u8' | 'ts' | 'other'
}

function getCredentials() {
  const url = process.env.IPTV_URL || ''
  const username = process.env.IPTV_USERNAME || ''
  const password = process.env.IPTV_PASSWORD || ''
  return { url: url.replace(/\/$/, ''), username, password }
}

/**
 * VLC User-Agent — most IPTV servers whitelist this.
 * Default Node/fetch UA is blocked by Cloudflare on many providers.
 */
const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
}

function buildAuthUrl(action: string, params: Record<string, string | number> = {}) {
  const { url, username, password } = getCredentials()
  const query = new URLSearchParams({
    username,
    password,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  })
  return `${url}/player_api.php?action=${action}&${query.toString()}`
}

/**
 * Build the direct stream URL for a channel.
 * Xtream Codes stream format: <host>/live/<user>/<pass>/<stream_id>.m3u8
 * (or .ts for MPEG-TS)
 */
export function buildStreamUrl(streamId: number | string, format: 'm3u8' | 'ts' = 'm3u8') {
  const { url, username, password } = getCredentials()
  return `${url}/live/${username}/${password}/${streamId}.${format}`
}

/**
 * Verify credentials and return auth info (user_info + server_info).
 */
export async function getAuthInfo(): Promise<IptvAuthResult | null> {
  const { url, username, password } = getCredentials()
  if (!url || !username || !password) return null
  const query = new URLSearchParams({ username, password })
  const endpoint = `${url}/player_api.php?${query.toString()}`
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`IPTV auth failed: HTTP ${res.status}`)
  }
  const data = (await res.json()) as IptvAuthResult
  if (!data?.user_info || data.user_info.auth === 0) {
    return null
  }
  return data
}

/**
 * Get all live stream categories.
 */
export async function getLiveCategories(): Promise<IptvCategory[]> {
  const endpoint = buildAuthUrl('get_live_categories')
  const res = await fetch(endpoint, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to fetch categories: HTTP ${res.status}`)
  const data = (await res.json()) as IptvCategory[]
  return Array.isArray(data) ? data : []
}

/**
 * Get all live streams (channels), optionally filtered by category.
 */
export async function getLiveStreams(categoryId?: string): Promise<IptvChannel[]> {
  const params: Record<string, string> = categoryId ? { category_id: categoryId } : {}
  const endpoint = buildAuthUrl('get_live_streams', params)
  const res = await fetch(endpoint, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to fetch streams: HTTP ${res.status}`)
  const data = (await res.json()) as IptvChannel[]
  return Array.isArray(data) ? data : []
}

/**
 * Fetch the full M3U playlist from get.php.
 * This endpoint is more reliable than player_api.php for some providers
 * and returns ALL channels (live + VOD + series) in M3U format.
 *
 * We filter to only live channels (URLs containing /live/ or non-/movie/ paths).
 */
export async function getM3uPlaylist(): Promise<{ channels: M3uChannel[]; raw: string }> {
  const { url, username, password } = getCredentials()
  const endpoint = `${url}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`
  const res = await fetch(endpoint, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(60000),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch M3U playlist: HTTP ${res.status}`)
  }
  const raw = await res.text()
  const channels = parseM3uPlaylist(raw)
  return { channels, raw }
}

/**
 * Parse an M3U playlist into a list of channels.
 *
 * Format:
 *   #EXTM3U
 *   #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",Channel Name
 *   http://server/user/pass/streamId
 */
export function parseM3uPlaylist(raw: string): M3uChannel[] {
  const lines = raw.split(/\r?\n/)
  const channels: M3uChannel[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('#EXTINF')) continue

    // Parse attributes from the EXTINF line
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/)
    const groupTitleMatch = line.match(/group-title="([^"]*)"/)
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/)

    // Channel name is everything after the last comma
    const commaIdx = line.lastIndexOf(',')
    const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : (tvgNameMatch?.[1] || 'Unknown')

    // Stream URL is the next non-empty, non-# line
    let streamUrl = ''
    for (let j = i + 1; j < lines.length; j++) {
      const nextLine = lines[j].trim()
      if (!nextLine) continue
      if (nextLine.startsWith('#')) continue
      streamUrl = nextLine
      i = j
      break
    }
    if (!streamUrl) continue

    // Extract stream ID from URL (last path segment)
    const urlMatch = streamUrl.match(/\/([^/]+)(?:\.\w+)?$/)
    const streamId = urlMatch ? urlMatch[1] : ''

    // Determine format and whether this is a live channel
    // Live: /live/user/pass/id.m3u8 OR plain /user/pass/id (no /movie/ or /series/)
    const isMovie = streamUrl.includes('/movie/')
    const isSeries = streamUrl.includes('/series/')
    if (isMovie || isSeries) continue // skip VOD

    let streamFormat: 'm3u8' | 'ts' | 'other' = 'other'
    if (streamUrl.endsWith('.m3u8')) streamFormat = 'm3u8'
    else if (streamUrl.endsWith('.ts')) streamFormat = 'ts'

    channels.push({
      streamId,
      name,
      logo: tvgLogoMatch?.[1] || '',
      category: groupTitleMatch?.[1] || 'Uncategorized',
      streamUrl,
      streamFormat,
    })
  }

  return channels
}

/**
 * Get both categories and channels (with optional category filter).
 * Also returns an `error` field if the IPTV service is unreachable.
 */
export async function getCatalog(categoryId?: string) {
  const errors: string[] = []
  const [categories, channels] = await Promise.all([
    getLiveCategories().catch((e) => {
      errors.push(e instanceof Error ? e.message : 'Failed to fetch categories')
      return [] as IptvCategory[]
    }),
    getLiveStreams(categoryId).catch((e) => {
      errors.push(e instanceof Error ? e.message : 'Failed to fetch streams')
      return [] as IptvChannel[]
    }),
  ])
  return { categories, channels, error: errors[0] || null }
}

/**
 * Determine if the IPTV service is reachable and credentials are valid.
 */
export async function checkIptvHealth() {
  try {
    const auth = await getAuthInfo()
    if (!auth) {
      return { ok: false, error: 'Invalid credentials or unreachable server' }
    }
    return {
      ok: true,
      user_info: auth.user_info,
      server_info: auth.server_info,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
