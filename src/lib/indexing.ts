/**
 * Channel indexing layer.
 *
 * Fetches the full M3U playlist from the IPTV server, parses it, and
 * stores channels + categories in MongoDB for fast local access.
 *
 * The home storefront, channels browser, and admin panel all read from
 * the local index so the UI stays responsive even if the IPTV server
 * is slow or temporarily unreachable.
 */

import { db } from './db'
import { getM3uPlaylist, parseM3uPlaylist, type M3uChannel, checkIptvHealth } from './iptv'

export interface IndexResult {
  ok: boolean
  totalChannels: number
  totalCategories: number
  error?: string
  durationMs: number
}

export interface IndexStatus {
  status: 'idle' | 'running' | 'success' | 'error' | 'never'
  totalChannels: number
  totalCategories: number
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
}

/**
 * Mark a few well-known "feature-worthy" categories so the home storefront
 * has interesting content to show without manual curation.
 */
const FEATURED_CATEGORY_PATTERNS = [
  /^NEWS$/i,
  /^.*NEWS.*$/i,
  /^.*BBC.*$/i,
  /^.*CNN.*$/i,
  /^.*SKY SPORTS.*$/i,
  /^.*BT SPORT.*$/i,
  /^.*ESPN.*$/i,
  /^.*MOVIES.*$/i,
  /^.*CINEMA.*$/i,
  /^.*KIDS.*$/i,
  /^.*DOCUMENTAR.*$/i,
  /^.*MUSIC.*$/i,
  /^.*ENTERTAINMENT.*$/i,
]

function isFeaturedCategory(category: string): boolean {
  return FEATURED_CATEGORY_PATTERNS.some((p) => p.test(category))
}

/**
 * Run a full index: fetch M3U, parse, upsert all channels.
 * Also marks a subset of channels as "featured" for the home storefront.
 *
 * This is a long-running operation (15k+ channels) — callers should
 * invoke it via a background task or accept the latency.
 */
export async function runIndex(): Promise<IndexResult> {
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
    // First check auth so we get a clean error if creds are bad
    const health = await checkIptvHealth()
    if (!health.ok) {
      throw new Error(health.error || 'IPTV server unreachable')
    }

    // Fetch + parse the M3U playlist (this is the big payload — 40MB+)
    const { channels } = await getM3uPlaylist()

    if (channels.length === 0) {
      throw new Error('M3U playlist was empty')
    }

    // Deduplicate by streamId (M3U can have duplicate entries)
    const seen = new Set<string>()
    const unique: M3uChannel[] = []
    for (const ch of channels) {
      if (!ch.streamId || seen.has(ch.streamId)) continue
      seen.add(ch.streamId)
      unique.push(ch)
    }

    // Build a set of all streamIds we want to keep (for pruning stale entries)
    const wantedIds = new Set(unique.map((c) => c.streamId))

    // Upsert all channels in batches of 200 to avoid overwhelming MongoDB
    const BATCH = 200
    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH)
      await Promise.all(
        batch.map((ch) =>
          db.channel.upsert({
            where: { streamId: ch.streamId },
            update: {
              name: ch.name,
              logo: ch.logo || null,
              category: ch.category,
              streamUrl: ch.streamUrl,
              streamFmt: ch.streamFormat,
              featured: isFeaturedCategory(ch.category),
            },
            create: {
              streamId: ch.streamId,
              name: ch.name,
              logo: ch.logo || null,
              category: ch.category,
              streamUrl: ch.streamUrl,
              streamFmt: ch.streamFormat,
              featured: isFeaturedCategory(ch.category),
            },
          })
        )
      )
    }

    // Prune channels no longer in the playlist (deleted from server)
    // Use a targeted deleteMany on streamId NOT IN wantedIds
    // MongoDB doesn't support NOT IN directly via Prisma, so we delete
    // channels whose streamId is not in the wanted set by deleting all
    // and relying on the upserts above to have re-created them.
    // To keep this efficient, we use a different approach: delete channels
    // whose updatedAt is older than startedAt.
    await db.channel.deleteMany({
      where: { updatedAt: { lt: startedAt } },
    })

    // Collect category counts
    const categoryCounts = new Map<string, number>()
    for (const ch of unique) {
      categoryCounts.set(ch.category, (categoryCounts.get(ch.category) || 0) + 1)
    }

    const completedAt = new Date()
    const durationMs = Date.now() - startMs

    // Update index metadata
    await db.indexMeta.upsert({
      where: { key: 'last_index' },
      update: {
        status: 'success',
        error: null,
        totalChannels: unique.length,
        totalCategories: categoryCounts.size,
        completedAt,
      },
      create: {
        key: 'last_index',
        status: 'success',
        totalChannels: unique.length,
        totalCategories: categoryCounts.size,
        startedAt,
        completedAt,
      },
    })

    return {
      ok: true,
      totalChannels: unique.length,
      totalCategories: categoryCounts.size,
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

/**
 * Get the current index status.
 */
export async function getIndexStatus(): Promise<IndexStatus> {
  const meta = await db.indexMeta.findUnique({ where: { key: 'last_index' } })
  if (!meta) {
    return {
      status: 'never',
      totalChannels: 0,
      totalCategories: 0,
      error: null,
      startedAt: null,
      completedAt: null,
    }
  }
  return {
    status: meta.status as IndexStatus['status'],
    totalChannels: meta.totalChannels,
    totalCategories: meta.totalCategories,
    error: meta.error,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
  }
}

/**
 * Get the list of all categories (with channel counts) from the local index.
 * Uses MongoDB aggregation for efficiency instead of loading all channels.
 */
export async function getCategoriesFromIndex(): Promise<
  { category: string; count: number }[]
> {
  // Use Prisma's groupBy for efficient aggregation
  const grouped = await db.channel.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  })
  return grouped.map((g) => ({
    category: g.category,
    count: g._count.category,
  }))
}

/**
 * Get channels from the local index, optionally filtered by category.
 * Supports pagination and search.
 */
export async function getChannelsFromIndex(opts: {
  category?: string
  search?: string
  featuredOnly?: boolean
  limit?: number
  offset?: number
} = {}) {
  const { category, search, featuredOnly, limit = 200, offset = 0 } = opts

  const where: {
    category?: string
    featured?: boolean
    name?: { contains: string; mode: 'insensitive' }
  } = {}

  if (category && category !== 'All Channels') {
    where.category = category
  }
  if (featuredOnly) {
    where.featured = true
  }
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' }
  }

  const [channels, total] = await Promise.all([
    db.channel.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    db.channel.count({ where }),
  ])

  return {
    channels: channels.map((c) => ({
      streamId: c.streamId,
      name: c.name,
      logo: c.logo || '',
      category: c.category,
      streamUrl: c.streamUrl,
      streamFormat: c.streamFmt as 'm3u8' | 'ts' | 'other',
      featured: c.featured,
    })),
    total,
  }
}

/**
 * Get featured channels for the home storefront.
 *
 * Picks DIVERSE channels from DIFFERENT categories so the storefront
 * shows a mix of countries and content types.
 *
 * Strategy:
 *   1. Get all featured categories.
 *   2. From each category, pick 1-2 channels (logos optional).
 *   3. Rotate through categories until we have `limit` channels.
 */
export async function getFeaturedChannels(limit: number = 24) {
  // Build a list of categories to pull from
  const allCategories = await db.channel.findMany({
    where: {
      featured: true,
      name: { not: { contains: 'Welcome' } },
    },
    select: { category: true },
    distinct: ['category'],
  })
  const categorySet = new Set<string>(allCategories.map((c) => c.category))

  // Ordered list: major countries first, then the rest
  const PRIORITY_PREFIXES = [
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
    'Spain', 'Italy', 'Brazil', 'India', 'Australia', 'Japan', 'South Korea',
    'Netherlands', 'Sweden', 'Mexico', 'Argentina',
  ]
  const orderedCategories: string[] = []
  for (const prefix of PRIORITY_PREFIXES) {
    const match = Array.from(categorySet).find((c) => c.startsWith(prefix))
    if (match && !orderedCategories.includes(match)) {
      orderedCategories.push(match)
    }
  }
  for (const cat of categorySet) {
    if (!orderedCategories.includes(cat)) orderedCategories.push(cat)
  }

  // Pick 1-2 channels from each category, rotating until we have enough
  const result: Array<{
    streamId: string
    name: string
    logo: string | null
    category: string
    streamUrl: string
    streamFmt: string
    featured: boolean
  }> = []
  const seenNames = new Set<string>()
  const seenStreamIds = new Set<string>()
  const perCategoryCount = new Map<string, number>()
  const maxPerCategory = 2

  // Fetch channels category by category, picking the best ones
  for (const category of orderedCategories) {
    if (result.length >= limit) break
    const count = perCategoryCount.get(category) || 0
    if (count >= maxPerCategory) continue

    const channels = await db.channel.findMany({
      where: {
        category,
        featured: true,
        name: { not: { contains: 'Welcome' } },
      },
      take: 5,
      orderBy: { name: 'asc' },
    })

    for (const ch of channels) {
      if (result.length >= limit) break
      if (seenNames.has(ch.name) || seenStreamIds.has(ch.streamId)) continue
      const catCount = perCategoryCount.get(category) || 0
      if (catCount >= maxPerCategory) break

      result.push({
        streamId: ch.streamId,
        name: ch.name,
        logo: ch.logo,
        category: ch.category,
        streamUrl: ch.streamUrl,
        streamFmt: ch.streamFmt,
        featured: ch.featured,
      })
      seenNames.add(ch.name)
      seenStreamIds.add(ch.streamId)
      perCategoryCount.set(category, catCount + 1)
    }
  }

  // If we still don't have enough, fill with any featured channels
  if (result.length < limit) {
    const more = await db.channel.findMany({
      where: {
        featured: true,
        name: { not: { contains: 'Welcome' } },
        streamId: { notIn: Array.from(seenStreamIds) },
      },
      take: limit * 2,
      orderBy: { name: 'asc' },
    })
    for (const ch of more) {
      if (result.length >= limit) break
      if (seenNames.has(ch.name)) continue
      result.push({
        streamId: ch.streamId,
        name: ch.name,
        logo: ch.logo,
        category: ch.category,
        streamUrl: ch.streamUrl,
        streamFmt: ch.streamFmt,
        featured: ch.featured,
      })
      seenNames.add(ch.name)
    }
  }

  return result.map(toClientChannel)
}

function toClientChannel(c: {
  streamId: string
  name: string
  logo: string | null
  category: string
  streamUrl: string
  streamFmt: string
  featured: boolean
}) {
  return {
    streamId: c.streamId,
    name: c.name,
    logo: c.logo || '',
    category: c.category,
    streamUrl: c.streamUrl,
    streamFormat: c.streamFmt as 'm3u8' | 'ts' | 'other',
    featured: c.featured,
  }
}

/**
 * Get a single channel by streamId from the local index.
 */
export async function getChannelById(streamId: string) {
  const channel = await db.channel.findUnique({ where: { streamId } })
  if (!channel) return null
  return toClientChannel(channel)
}
