/**
 * Xtream Codes IPTV API client.
 * Connects to an Xtream Codes server to fetch live categories,
 * live channels (streams), and server info.
 *
 * All requests are server-side only — never expose IPTV_PASSWORD to the client.
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
  tv_archive: number
  direct_source: string
  tv_archive_duration: number
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

function getCredentials() {
  const url = process.env.IPTV_URL || ''
  const username = process.env.IPTV_USERNAME || ''
  const password = process.env.IPTV_PASSWORD || ''
  return { url: url.replace(/\/$/, ''), username, password }
}

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    // Server-side fetch with a generous timeout for slow IPTV servers
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
 * Get both categories and channels (with optional category filter).
 * Returns them grouped together for the channel browser.
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
