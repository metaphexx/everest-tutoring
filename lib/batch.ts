import { buildSearchIndex } from '@/lib/search'
import { generateTermReports } from '@/lib/term-reports'
import { submitTermReportBatch, collectReportBatches } from '@/lib/ai-batch'
import { buildMorningBrief } from '@/lib/digest'

/**
 * Nightly batch. The cost-sensitive AI work that does NOT need to happen in real
 * time is gathered here and run once overnight (via /api/cron/nightly), rather
 * than on every page load:
 *
 *   - rebuild the semantic search index + embeddings
 *   - draft any missing end-of-term reports (unpublished, for review)
 *   - produce the morning brief the admin sees at the top of the overview
 *
 * Each step is independent and best-effort, so one failure never blocks the rest.
 *
 * COST - the report drafting can run via the Anthropic Batch API (lib/ai-batch.ts)
 * at ~50% of the synchronous price with a 24h SLA. Pass transport:'batch' to
 * submit the cohort as one batch; a later tick (collectAiBatches) writes the
 * results back. The default transport:'sync' drafts inline. Prompts are identical
 * either way - only the transport + timing differ.
 */

export type BatchResult = {
  search: { indexed: number; model: string } | { error: string }
  reports: { created?: number; skipped?: number; termName?: string; submitted?: number; transport: 'sync' | 'batch' } | { error: string }
  digest: { live: boolean } | { error: string }
  collected?: { applied: number; stillPending: number }
}

export async function runNightlyBatch(opts?: { reports?: boolean; transport?: 'sync' | 'batch' }): Promise<BatchResult> {
  const transport = opts?.transport ?? 'sync'
  const result: BatchResult = {
    search: { error: 'skipped' },
    reports: { error: 'skipped' },
    digest: { error: 'skipped' },
  }

  try {
    result.search = await buildSearchIndex()
  } catch (e) {
    result.search = { error: e instanceof Error ? e.message : 'failed' }
  }

  // Always try to collect any previously-submitted batches whose results are ready.
  try {
    const c = await collectReportBatches()
    result.collected = { applied: c.applied, stillPending: c.stillPending }
  } catch (e) {
    result.collected = { applied: 0, stillPending: -1 }
    void e
  }

  if (opts?.reports !== false) {
    try {
      if (transport === 'batch') {
        const s = await submitTermReportBatch()
        result.reports = { submitted: s.submitted ?? 0, transport: 'batch' }
      } else {
        const r = await generateTermReports()
        result.reports = { created: r.created, skipped: r.skipped, termName: r.termName, transport: 'sync' }
      }
    } catch (e) {
      result.reports = { error: e instanceof Error ? e.message : 'failed' }
    }
  }

  try {
    const d = await buildMorningBrief()
    result.digest = { live: d.live }
  } catch (e) {
    result.digest = { error: e instanceof Error ? e.message : 'failed' }
  }

  return result
}
