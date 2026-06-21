import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runNightlyBatch } from '@/lib/batch'

export const dynamic = 'force-dynamic'
// Allow up to 5 minutes for the batch (report drafting can be the long pole).
export const maxDuration = 300

/**
 * Nightly batch endpoint. Schedule once a day (e.g. a Vercel Cron at 03:00). When
 * CRON_SECRET is set it must be supplied as `Authorization: Bearer <secret>`.
 * Rebuilds the search index, collects any ready report batches, drafts missing
 * term reports, and refreshes the morning brief.
 *
 * Query params:
 *   ?reports=0          skip report drafting (lighter daily run)
 *   ?transport=batch    submit reports via the Anthropic Batch API (~50% cost);
 *                       results are written on a later tick. Default: sync.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 })
  }
  const params = new URL(req.url).searchParams
  const reports = params.get('reports') !== '0'
  const transport = params.get('transport') === 'batch' ? 'batch' : 'sync'
  const result = await runNightlyBatch({ reports, transport })
  return NextResponse.json(result)
}

export const GET = run
export const POST = run
