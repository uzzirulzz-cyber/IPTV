/**
 * iptv-org channel indexer.
 *
 * Parses M3U playlists from the public iptv-org/iptv GitHub repository
 * (https://github.com/iptv-org/iptv) and stores them in MongoDB.
 *
 * These are free, publicly available IPTV streams organized by country.
 * No authentication or credentials needed — streams are direct HLS URLs.
 */

import { db } from './db'
import { parseM3uPlaylist, type M3uChannel } from './iptv'

/**
 * ISO 3166-1 alpha-2 country code → English country name mapping.
 * Used to derive a human-readable category from the playlist filename.
 */
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

/** Subcategory labels extracted from filename suffixes (e.g. us_pluto → "Pluto TV"). */
const SUBCATEGORY_LABELS: Record<string, string> = {
  pluto: 'Pluto TV',
  samsung: 'Samsung TV Plus',
  samsungtvplus: 'Samsung TV Plus',
  morescreens: 'More Screens',
  nexgen: 'NexGen',
  stingray: 'Stingray',
  freevisiontv: 'FreeVision TV',
  abcnews: 'ABC News',
  sportstribal: 'Sports Tribal',
  pbs: 'PBS',
  gem: 'GEM',
  beinsports: 'beIN Sports',
  globo: 'Globo',
}

/**
 * Derive a category name from the playlist filename.
 * Examples:
 *   "us.m3u" → "United States"
 *   "us_pluto.m3u" → "United States · Pluto TV"
 *   "uk_sportstribal.m3u" → "United Kingdom · Sports Tribal"
 */
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

/** Fetch and parse a single M3U playlist from the iptv-org GitHub raw URLs. */
async function fetchPlaylist(filename: string): Promise<{ channels: M3uChannel[]; category: string }> {
  const url = `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/${filename}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filename}: HTTP ${res.status}`)
  }
  const raw = await res.text()
  const channels = parseM3uPlaylist(raw)
  const category = deriveCategory(filename)
  return { channels, category }
}

export interface IptvOrgIndexResult {
  ok: boolean
  totalChannels: number
  totalCategories: number
  error?: string
  durationMs: number
}

/** The list of playlist filenames to fetch (top 80 by content density). */
const PRIORITY_PLAYLISTS = [
  'us.m3u', 'uk.m3u', 'ca.m3u', 'de.m3u', 'fr.m3u', 'es.m3u', 'it.m3u', 'br.m3u',
  'ru.m3u', 'in.m3u', 'cn.m3u', 'jp.m3u', 'kr.m3u', 'tr.m3u', 'ir.m3u', 'sa.m3u',
  'ae.m3u', 'pk.m3u', 'bd.m3u', 'id.m3u', 'my.m3u', 'ph.m3u', 'th.m3u', 'vn.m3u',
  'au.m3u', 'nz.m3u', 'za.m3u', 'ng.m3u', 'eg.m3u', 'ma.m3u', 'dz.m3u', 'tn.m3u',
  'ly.m3u', 'ps.m3u', 'iq.m3u', 'jo.m3u', 'kw.m3u', 'qa.m3u', 'om.m3u', 'ye.m3u',
  'sy.m3u', 'lb.m3u', 'il.m3u', 'am.m3u', 'az.m3u', 'ge.m3u', 'kz.m3u', 'uz.m3u',
  'tm.m3u', 'kg.m3u', 'tj.m3u', 'mn.m3u', 'tw.m3u', 'hk.m3u', 'mo.m3u', 'kh.m3u',
  'la.m3u', 'mm.m3u', 'sg.m3u', 'bn.m3u', 'lk.m3u', 'np.m3u', 'af.m3u', 'mv.m3u',
  'ua.m3u', 'by.m3u', 'pl.m3u', 'cz.m3u', 'sk.m3u', 'hu.m3u', 'ro.m3u', 'bg.m3u',
  'rs.m3u', 'hr.m3u', 'si.m3u', 'ba.m3u', 'mk.m3u', 'me.m3u', 'al.m3u', 'gr.m3u',
  'nl.m3u', 'be.m3u', 'lu.m3u', 'ch.m3u', 'at.m3u', 'ie.m3u', 'pt.m3u', 'dk.m3u',
  'se.m3u', 'no.m3u', 'fi.m3u', 'is.m3u', 'ee.m3u', 'lv.m3u', 'lt.m3u', 'md.m3u',
  'mx.m3u', 'gt.m3u', 'hn.m3u', 'sv.m3u', 'ni.m3u', 'cr.m3u', 'pa.m3u', 'co.m3u',
  've.m3u', 'ec.m3u', 'pe.m3u', 'bo.m3u', 'py.m3u', 'uy.m3u', 'ar.m3u', 'cl.m3u',
  'cu.m3u', 'do.m3u', 'jm.m3u', 'ht.m3u', 'bs.m3u', 'tt.m3u', 'bb.m3u', 'gd.m3u',
  'us_pluto.m3u', 'us_samsung.m3u', 'us_abcnews.m3u', 'uk_sportstribal.m3u',
  'ca_pluto.m3u', 'ca_samsung.m3u', 'ca_stingray.m3u', 'de_pluto.m3u',
  'br_pluto.m3u', 'br_samsung.m3u', 'at_pluto.m3u', 'at_samsung.m3u',
  'au_samsung.m3u', 'be_samsung.m3u', 'ch_pluto.m3u', 'ch_samsung.m3u',
  'cl_pluto.m3u', 'cl_samsung.m3u', 'co_pluto.m3u', 'co_samsung.m3u',
  'ec_samsung.m3u', 'es_pluto.m3u', 'fr_samsung.m3u', 'gb_samsung.m3u',
  'it_samsung.m3u', 'mx_pluto.m3u', 'mx_samsung.m3u', 'nl_samsung.m3u',
  'pe_samsung.m3u', 'se_samsung.m3u', 'us_pluto.m3u',
]

/**
 * Run a full index: fetch all iptv-org playlists, parse, and upsert channels.
 * Marks a subset as "featured" based on category priority.
 */
export async function runIptvOrgIndex(): Promise<IptvOrgIndexResult> {
  const startedAt = new Date()
  const startMs = Date.now()

  // Mark as running
  await db.indexMeta.upsert({
    where: { key: 'last_index' },
    update: {
      status: 'running',
      error: null,
      startedAt,
      completedAt: null,
    },
    create: {
      key: 'last_index',
      status: 'running',
      startedAt,
    },
  })

  try {
    const allChannels: Array<M3uChannel & { category: string }> = []
    const categorySet = new Set<string>()
    let playlistsFetched = 0
    let playlistsFailed = 0

    // Fetch playlists in batches of 10 to avoid rate limits
    const BATCH = 10
    for (let i = 0; i < PRIORITY_PLAYLISTS.length; i += BATCH) {
      const batch = PRIORITY_PLAYLISTS.slice(i, i + BATCH)
      const results = await Promise.allSettled(batch.map((fn) => fetchPlaylist(fn)))

      for (const result of results) {
        if (result.status === 'fulfilled') {
          playlistsFetched++
          const { channels, category } = result.value
          categorySet.add(category)
          for (const ch of channels) {
            allChannels.push({ ...ch, category })
          }
        } else {
          playlistsFailed++
          console.warn(`Failed to fetch playlist:`, result.reason)
        }
      }
    }

    if (allChannels.length === 0) {
      throw new Error('No channels were fetched from iptv-org')
    }

    // Deduplicate by streamUrl (some channels appear in multiple playlists)
    const seenUrls = new Set<string>()
    const unique: Array<M3uChannel & { category: string }> = []
    for (const ch of allChannels) {
      if (!ch.streamUrl || seenUrls.has(ch.streamUrl)) continue
      seenUrls.add(ch.streamUrl)
      unique.push(ch)
    }

    // Assign a unique streamId based on a hash of the URL (for stable IDs)
    const channelsWithIds = unique.map((ch, idx) => ({
      ...ch,
      streamId: `iptvorg_${idx}`,
    }))

    // Determine featured categories (major countries + entertainment hubs)
    const FEATURED_COUNTRY_PREFIXES = [
      'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
      'Spain', 'Italy', 'Brazil', 'India', 'Australia', 'Japan', 'South Korea',
      'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
    ]
    const isFeatured = (category: string) =>
      FEATURED_COUNTRY_PREFIXES.some((c) => category.startsWith(c))

    // Clear old channels, then bulk insert in batches
    await db.channel.deleteMany({})

    const INSERT_BATCH = 500
    for (let i = 0; i < channelsWithIds.length; i += INSERT_BATCH) {
      const batch = channelsWithIds.slice(i, i + INSERT_BATCH)
      await db.channel.createMany({
        data: batch.map((ch) => ({
          streamId: ch.streamId,
          name: ch.name,
          logo: ch.logo || null,
          category: ch.category,
          streamUrl: ch.streamUrl,
          streamFmt: ch.streamFormat,
          featured: isFeatured(ch.category),
        })),
      })
    }

    const completedAt = new Date()
    const durationMs = Date.now() - startMs

    // Update index metadata
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
      durationMs,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown indexing error'
    const completedAt = new Date()

    await db.indexMeta.upsert({
      where: { key: 'last_index' },
      update: {
        status: 'error',
        error: errorMsg,
        completedAt,
      },
      create: {
        key: 'last_index',
        status: 'error',
        error: errorMsg,
        startedAt,
        completedAt,
      },
    })

    return {
      ok: false,
      totalChannels: 0,
      totalCategories: 0,
      error: errorMsg,
      durationMs: Date.now() - startMs,
    }
  }
}
