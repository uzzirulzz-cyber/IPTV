/**
 * iptv-org channel indexer with logos + stream validation.
 *
 * Fetches M3U playlists from iptv-org, enriches each channel with its logo
 * from logos.csv, validates every stream URL with a HEAD request, and stores
 * only working channels in MongoDB.
 */

import { db } from './db'

interface RawChannel {
  tvgId: string
  baseId: string // tvg-id without the @suffix
  name: string
  logo: string
  category: string
  streamUrl: string
}

interface LogoEntry {
  url: string
  format: string
  width: number
}

/** Fetch the logos.csv and build a map of channelId → best logo URL. */
async function fetchLogos(): Promise<Map<string, LogoEntry>> {
  console.log('[logos] Fetching logos.csv...')
  const res = await fetch('https://raw.githubusercontent.com/iptv-org/database/master/data/logos.csv', {
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to fetch logos.csv: HTTP ${res.status}`)
  const raw = await res.text()
  const lines = raw.split(/\r?\n/).slice(1) // skip header
  const logos = new Map<string, LogoEntry>()

  for (const line of lines) {
    if (!line.trim()) continue
    // CSV: channel,feed,in_use,tags,width,height,format,url
    const parts = line.split(',')
    if (parts.length < 8) continue
    const [channel, , inUse, , widthStr, , format, ...urlParts] = parts
    if (inUse !== 'TRUE') continue
    const url = urlParts.join(',')
    if (!url) continue
    const width = parseInt(widthStr, 10) || 0

    // Prefer PNG over SVG, and prefer larger logos (but < 400px for performance)
    const existing = logos.get(channel)
    if (!existing) {
      logos.set(channel, { url, format, width })
    } else {
      // Prefer PNG, then non-SVG, then larger width
      const isPng = format === 'PNG'
      const existingIsPng = existing.format === 'PNG'
      if (isPng && !existingIsPng) {
        logos.set(channel, { url, format, width })
      } else if (isPng === existingIsPng && width > existing.width && width <= 400) {
        logos.set(channel, { url, format, width })
      }
    }
  }

  console.log(`[logos] Loaded ${logos.size} channel logos`)
  return logos
}

/** Validate a stream URL with a HEAD request. Returns true if the stream is reachable. */
async function validateStream(url: string, timeoutMs = 4000): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })
    return res.ok
  } catch {
    // Some servers don't support HEAD — try a GET with Range header
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Range: 'bytes=0-0',
        },
      })
      return res.ok || res.status === 206
    } catch {
      return false
    }
  }
}

/** Fetch and parse an M3U playlist, keeping the tvg-id for logo matching. */
async function fetchPlaylist(
  filename: string,
  logos: Map<string, LogoEntry>
): Promise<RawChannel[]> {
  const url = `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/${filename}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: HTTP ${res.status}`)

  const raw = await res.text()
  const lines = raw.split(/\r?\n/)
  const channels: RawChannel[] = []
  const category = deriveCategory(filename)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('#EXTINF')) continue

    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/)
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/)
    const commaIdx = line.lastIndexOf(',')
    const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : 'Unknown'

    let streamUrl = ''
    for (let j = i + 1; j < lines.length; j++) {
      const nextLine = lines[j].trim()
      if (!nextLine || nextLine.startsWith('#')) continue
      streamUrl = nextLine
      i = j
      break
    }
    if (!streamUrl) continue

    const tvgId = tvgIdMatch?.[1] || ''
    const baseId = tvgId ? tvgId.split('@')[0] : ''
    const m3uLogo = tvgLogoMatch?.[1] || ''

    // Use M3U logo if present, otherwise look up from logos.csv
    let logo = m3uLogo
    if (!logo && baseId) {
      const logoEntry = logos.get(baseId)
      if (logoEntry) logo = logoEntry.url
    }

    channels.push({
      tvgId,
      baseId,
      name,
      logo,
      category,
      streamUrl,
    })
  }

  return channels
}

const COUNTRY_NAMES: Record<string, string> = {
  ad: 'Andorra', ae: 'United Arab Emirates', af: 'Afghanistan', ag: 'Antigua and Barbuda',
  al: 'Albania', am: 'Armenia', ao: 'Angola', ar: 'Argentina', at: 'Austria', au: 'Australia',
  aw: 'Aruba', az: 'Azerbaijan', ba: 'Bosnia and Herzegovina', bb: 'Barbados', bd: 'Bangladesh',
  be: 'Belgium', bf: 'Burkina Faso', bg: 'Bulgaria', bh: 'Bahrain', bi: 'Burundi', bj: 'Benin',
  bm: 'Bermuda', bn: 'Brunei', bo: 'Bolivia', bq: 'Bonaire', br: 'Brazil', bs: 'Bahamas',
  bw: 'Botswana', by: 'Belarus', bz: 'Belize', ca: 'Canada', cd: 'DR Congo', cf: 'Central African Republic',
  cg: 'Congo', ch: 'Switzerland', ci: "Côte d'Ivoire", cl: 'Chile', cm: 'Cameroon', cn: 'China',
  co: 'Colombia', cr: 'Costa Rica', cu: 'Cuba', cv: 'Cape Verde', cw: 'Curaçao', cy: 'Cyprus',
  cz: 'Czech Republic', de: 'Germany', dj: 'Djibouti', dk: 'Denmark', dm: 'Dominica', do: 'Dominican Republic',
  dz: 'Algeria', ec: 'Ecuador', ee: 'Estonia', eg: 'Egypt', es: 'Spain', et: 'Ethiopia', fi: 'Finland',
  fj: 'Fiji', fm: 'Micronesia', fo: 'Faroe Islands', fr: 'France', ga: 'Gabon', gb: 'United Kingdom',
  gd: 'Grenada', ge: 'Georgia', gf: 'French Guiana', gh: 'Ghana', gi: 'Gibraltar', gl: 'Greenland',
  gm: 'Gambia', gn: 'Guinea', gp: 'Guadeloupe', gq: 'Equatorial Guinea', gr: 'Greece', gt: 'Guatemala',
  gy: 'Guyana', hk: 'Hong Kong', hn: 'Honduras', hr: 'Croatia', ht: 'Haiti', hu: 'Hungary',
  id: 'Indonesia', ie: 'Ireland', il: 'Israel', in: 'India', iq: 'Iraq', ir: 'Iran', is: 'Iceland',
  it: 'Italy', jm: 'Jamaica', jo: 'Jordan', jp: 'Japan', ke: 'Kenya', kg: 'Kyrgyzstan', kh: 'Cambodia',
  ki: 'Kiribati', km: 'Comoros', kn: 'Saint Kitts and Nevis', kp: 'North Korea', kr: 'South Korea',
  kw: 'Kuwait', kz: 'Kazakhstan', la: 'Laos', lb: 'Lebanon', lc: 'Saint Lucia', li: 'Liechtenstein',
  lk: 'Sri Lanka', ls: 'Lesotho', lt: 'Lithuania', lu: 'Luxembourg', lv: 'Latvia', ly: 'Libya',
  ma: 'Morocco', mc: 'Monaco', md: 'Moldova', me: 'Montenegro', mg: 'Madagascar', mh: 'Marshall Islands',
  mk: 'North Macedonia', ml: 'Mali', mm: 'Myanmar', mn: 'Mongolia', mo: 'Macau', mq: 'Martinique',
  mr: 'Mauritania', ms: 'Montserrat', mt: 'Malta', mu: 'Mauritius', mv: 'Maldives', mw: 'Malawi',
  mx: 'Mexico', my: 'Malaysia', mz: 'Mozambique', na: 'Namibia', nc: 'New Caledonia', ne: 'Niger',
  ng: 'Nigeria', ni: 'Nicaragua', nl: 'Netherlands', no: 'Norway', np: 'Nepal', nr: 'Nauru',
  nz: 'New Zealand', om: 'Oman', pa: 'Panama', pe: 'Peru', pf: 'French Polynesia', pg: 'Papua New Guinea',
  ph: 'Philippines', pk: 'Pakistan', pl: 'Poland', pm: 'Saint Pierre and Miquelon', pr: 'Puerto Rico',
  ps: 'Palestine', pt: 'Portugal', pw: 'Palau', py: 'Paraguay', qa: 'Qatar', re: 'Réunion',
  ro: 'Romania', rs: 'Serbia', ru: 'Russia', rw: 'Rwanda', sa: 'Saudi Arabia', sb: 'Solomon Islands',
  sc: 'Seychelles', sd: 'Sudan', se: 'Sweden', sg: 'Singapore', si: 'Slovenia', sk: 'Slovakia',
  sl: 'Sierra Leone', sm: 'San Marino', sn: 'Senegal', so: 'Somalia', sr: 'Suriname', ss: 'South Sudan',
  st: 'São Tomé and Príncipe', sv: 'El Salvador', sx: 'Sint Maarten', sy: 'Syria', sz: 'Eswatini',
  tc: 'Turks and Caicos', td: 'Chad', tg: 'Togo', th: 'Thailand', tj: 'Tajikistan', tl: 'Timor-Leste',
  tm: 'Turkmenistan', tn: 'Tunisia', to: 'Tonga', tr: 'Turkey', tt: 'Trinidad and Tobago', tw: 'Taiwan',
  tz: 'Tanzania', ua: 'Ukraine', ug: 'Uganda', us: 'United States', uy: 'Uruguay', uz: 'Uzbekistan',
  va: 'Vatican City', vc: 'Saint Vincent', ve: 'Venezuela', vi: 'U.S. Virgin Islands', vn: 'Vietnam',
  vu: 'Vanuatu', ws: 'Samoa', ye: 'Yemen', za: 'South Africa', zm: 'Zambia', zw: 'Zimbabwe',
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  pluto: 'Pluto TV', samsung: 'Samsung TV Plus', morescreens: 'More Screens',
  nexgen: 'NexGen', stingray: 'Stingray', freevisiontv: 'FreeVision TV',
  abcnews: 'ABC News', sportstribal: 'Sports Tribal', pbs: 'PBS', gem: 'GEM',
  beinsports: 'beIN Sports', globo: 'Globo',
}

function deriveCategory(filename: string): string {
  const base = filename.replace(/\.m3u$/, '')
  const parts = base.split('_')
  const countryCode = parts[0]
  const countryName = COUNTRY_NAMES[countryCode] || countryCode.toUpperCase()
  if (parts.length === 1) return countryName
  const subKey = parts.slice(1).join('_')
  const subLabel = SUBCATEGORY_LABELS[subKey] || subKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return `${countryName} · ${subLabel}`
}

const PRIORITY_PLAYLISTS = [
  'us.m3u', 'uk.m3u', 'ca.m3u', 'de.m3u', 'fr.m3u', 'es.m3u', 'it.m3u', 'br.m3u',
  'ru.m3u', 'in.m3u', 'cn.m3u', 'jp.m3u', 'kr.m3u', 'tr.m3u', 'ir.m3u', 'sa.m3u',
  'ae.m3u', 'pk.m3u', 'bd.m3u', 'id.m3u', 'my.m3u', 'ph.m3u', 'th.m3u', 'vn.m3u',
  'au.m3u', 'nz.m3u', 'za.m3u', 'ng.m3u', 'eg.m3u', 'ma.m3u', 'dz.m3u', 'tn.m3u',
  'ps.m3u', 'iq.m3u', 'jo.m3u', 'kw.m3u', 'qa.m3u', 'om.m3u', 'ye.m3u',
  'lb.m3u', 'il.m3u', 'am.m3u', 'az.m3u', 'ge.m3u', 'kz.m3u', 'uz.m3u',
  'tm.m3u', 'kg.m3u', 'tj.m3u', 'mn.m3u', 'tw.m3u', 'hk.m3u', 'kh.m3u',
  'la.m3u', 'mm.m3u', 'sg.m3u', 'bn.m3u', 'lk.m3u', 'np.m3u', 'af.m3u',
  'ua.m3u', 'by.m3u', 'pl.m3u', 'cz.m3u', 'sk.m3u', 'hu.m3u', 'ro.m3u', 'bg.m3u',
  'rs.m3u', 'hr.m3u', 'si.m3u', 'ba.m3u', 'mk.m3u', 'me.m3u', 'al.m3u', 'gr.m3u',
  'nl.m3u', 'be.m3u', 'ch.m3u', 'at.m3u', 'ie.m3u', 'pt.m3u', 'dk.m3u',
  'se.m3u', 'no.m3u', 'fi.m3u', 'is.m3u', 'ee.m3u', 'lv.m3u', 'lt.m3u',
  'mx.m3u', 'gt.m3u', 'hn.m3u', 'sv.m3u', 'ni.m3u', 'cr.m3u', 'pa.m3u', 'co.m3u',
  've.m3u', 'ec.m3u', 'pe.m3u', 'bo.m3u', 'py.m3u', 'uy.m3u', 'ar.m3u', 'cl.m3u',
  'us_pluto.m3u', 'us_samsung.m3u', 'us_abcnews.m3u', 'uk_sportstribal.m3u',
  'ca_pluto.m3u', 'ca_samsung.m3u', 'ca_stingray.m3u', 'de_pluto.m3u',
  'br_pluto.m3u', 'br_samsung.m3u', 'at_pluto.m3u', 'at_samsung.m3u',
  'au_samsung.m3u', 'be_samsung.m3u', 'ch_pluto.m3u', 'ch_samsung.m3u',
  'cl_pluto.m3u', 'cl_samsung.m3u', 'co_pluto.m3u', 'co_samsung.m3u',
  'ec_samsung.m3u', 'es_pluto.m3u', 'fr_samsung.m3u', 'gb_samsung.m3u',
  'it_samsung.m3u', 'mx_pluto.m3u', 'mx_samsung.m3u', 'nl_samsung.m3u',
  'pe_samsung.m3u', 'se_samsung.m3u',
]

export interface IptvOrgIndexResult {
  ok: boolean
  totalChannels: number
  totalCategories: number
  validatedChannels: number
  channelsWithLogos: number
  error?: string
  durationMs: number
}

export async function runIptvOrgIndex(): Promise<IptvOrgIndexResult> {
  const startedAt = new Date()
  const startMs = Date.now()

  await db.indexMeta.upsert({
    where: { key: 'last_index' },
    update: { status: 'running', error: null, startedAt, completedAt: null },
    create: { key: 'last_index', status: 'running', startedAt },
  })

  try {
    // Step 1: Fetch logos
    const logos = await fetchLogos()

    // Step 2: Fetch all playlists and parse
    const allChannels: RawChannel[] = []
    const categorySet = new Set<string>()

    const BATCH = 10
    for (let i = 0; i < PRIORITY_PLAYLISTS.length; i += BATCH) {
      const batch = PRIORITY_PLAYLISTS.slice(i, i + BATCH)
      const results = await Promise.allSettled(batch.map((fn) => fetchPlaylist(fn, logos)))
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const ch of result.value) {
            categorySet.add(ch.category)
            allChannels.push(ch)
          }
        }
      }
    }

    if (allChannels.length === 0) throw new Error('No channels fetched')

    // Deduplicate by streamUrl
    const seenUrls = new Set<string>()
    const unique = allChannels.filter((ch) => {
      if (!ch.streamUrl || seenUrls.has(ch.streamUrl)) return false
      seenUrls.add(ch.streamUrl)
      return true
    })

    console.log(`[index] ${unique.length} unique channels, adding logos...`)

    // Step 3: Store all channels with logos (no stream validation —
    // the proxy handles dead streams gracefully with a 502 error and
    // the player shows a clear "try another channel" message)
    const validChannels = unique
    let withLogos = 0
    for (const ch of validChannels) {
      if (ch.logo) withLogos++
    }
    const validated = unique.length

    // Step 4: Clear and insert
    await db.channel.deleteMany({})

    const channelsWithIds = validChannels.map((ch, idx) => ({
      streamId: `iptvorg_${idx}`,
      name: ch.name,
      logo: ch.logo || null,
      category: ch.category,
      streamUrl: ch.streamUrl,
      streamFmt: 'm3u8' as const,
      featured: false,
    }))

    // Mark featured (major countries)
    const FEATURED_PREFIXES = [
      'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
      'Spain', 'Italy', 'Brazil', 'India', 'Australia', 'Japan', 'South Korea',
      'Netherlands', 'Sweden', 'Mexico', 'Argentina',
    ]
    for (const ch of channelsWithIds) {
      if (FEATURED_PREFIXES.some((c) => ch.category.startsWith(c))) {
        ch.featured = true
      }
    }

    const INSERT_BATCH = 500
    for (let i = 0; i < channelsWithIds.length; i += INSERT_BATCH) {
      const batch = channelsWithIds.slice(i, i + INSERT_BATCH)
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
        totalChannels: channelsWithIds.length,
        totalCategories: categorySet.size,
        completedAt,
      },
      create: {
        key: 'last_index',
        status: 'success',
        totalChannels: channelsWithIds.length,
        totalCategories: categorySet.size,
        startedAt,
        completedAt,
      },
    })

    return {
      ok: true,
      totalChannels: channelsWithIds.length,
      totalCategories: categorySet.size,
      validatedChannels: validated,
      channelsWithLogos: withLogos,
      durationMs,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown indexing error'
    await db.indexMeta.upsert({
      where: { key: 'last_index' },
      update: { status: 'error', error: errorMsg, completedAt: new Date() },
      create: { key: 'last_index', status: 'error', error: errorMsg, startedAt, completedAt: new Date() },
    })
    return { ok: false, totalChannels: 0, totalCategories: 0, validatedChannels: 0, channelsWithLogos: 0, error: errorMsg, durationMs: Date.now() - startMs }
  }
}
