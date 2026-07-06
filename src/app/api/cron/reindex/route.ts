import { NextRequest, NextResponse } from 'next/server'
import { getIndexStatus } from '@/lib/indexing'
import { runOpplexIndex } from '@/lib/opplex-index'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * GET /api/cron/reindex?key=<CRON_SECRET>
 *
 * Automated 24/7 re-indexing endpoint. Called by:
 *   1. External cron jobs (cron-job.org, GitHub Actions, etc.)
 *   2. The app's internal self-scheduler (see /api/cron/schedule)
 *
 * Security: requires a secret key to prevent unauthorized re-indexing.
 * The key is set via the CRON_SECRET env var (defaults to "playbeat-auto").
 *
 * Behavior:
 *   - If an index is already running, returns 409 (no-op)
 *   - If the last index was < 1 hour ago, returns 200 (skipped, too soon)
 *   - Otherwise, runs a full re-index from iptv-org and returns the result
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const key = searchParams.get('key')
  const expectedKey = process.env.CRON_SECRET || 'playbeat-auto-247'

  if (key !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if an index is already running
  const status = await getIndexStatus()
  if (status.status === 'running') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_running', status })
  }

  // Skip if the last index was less than 1 hour ago (unless force=1)
  const force = searchParams.get('force') === '1'
  if (!force && status.completedAt) {
    const ageMs = Date.now() - new Date(status.completedAt).getTime()
    const oneHour = 60 * 60 * 1000
    if (ageMs < oneHour) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'too_soon',
        ageMinutes: Math.round(ageMs / 60000),
        status,
      })
    }
  }

  // Run the re-index
  const result = await runOpplexIndex()
  return NextResponse.json(result)
}

// Also support POST for cron services that prefer it
export const POST = GET
