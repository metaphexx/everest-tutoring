import { prisma } from '@/lib/db'
import { aiEnabled, getClient, modelFor, firstText } from '@/lib/ai'
import { recordUsage } from '@/lib/ai-cost'
import { gatherTermReportInputs, reportPrompt, deterministicComment, writeReport, type ReportInput } from '@/lib/term-reports'

/**
 * Anthropic Message Batches transport for the nightly term-report drafting.
 *
 * The Batch API processes the same requests at ~50% of the synchronous price with
 * a 24h SLA - ideal for an overnight cohort run. Because results aren't ready
 * immediately, the flow is two-phase across cron ticks:
 *   1. submitTermReportBatch() - gather inputs, post one batch, persist an AiBatch
 *      row with a request->record mapping + a deterministic fallback per request.
 *   2. collectReportBatches() - on a later tick, retrieve any ended batch, write
 *      each comment back (model output, or the fallback on error), mark applied.
 *
 * The prompts are identical to the synchronous path (reportPrompt), so the only
 * difference is transport + timing. Without a live key it writes the deterministic
 * drafts immediately (no batch).
 */

type MapEntry = { studentId: string; subjectId: string; pct: number | null; fallback: string; existingReportId: string | null }
type Mapping = Record<string, MapEntry>

const customId = (i: ReportInput) => `${i.studentId}__${i.subjectId}`
const toReportInput = (m: MapEntry): ReportInput => ({
  studentId: m.studentId, subjectId: m.subjectId, pct: m.pct, existingReportId: m.existingReportId,
  studentName: '', subjectName: '', late: 0, absent: 0, topics: [],
})

export type SubmitResult = { ok: boolean; submitted?: number; wroteFallback?: number; providerBatchId?: string; live?: boolean; reason?: string }

export async function submitTermReportBatch(opts?: { termId?: string; regenerate?: boolean }): Promise<SubmitResult> {
  const { term, inputs } = await gatherTermReportInputs(opts)
  if (!term) return { ok: false, reason: 'No active term' }
  if (inputs.length === 0) return { ok: true, submitted: 0 }

  // No live key: write the deterministic drafts now - a batch would buy nothing.
  if (!aiEnabled) {
    for (const i of inputs) await writeReport(term.id, i, deterministicComment(i))
    return { ok: true, submitted: 0, wroteFallback: inputs.length, live: false }
  }

  const model = modelFor('report')
  const mapping: Mapping = {}
  const requests = inputs.map((i) => {
    const { system, user } = reportPrompt(i)
    mapping[customId(i)] = { studentId: i.studentId, subjectId: i.subjectId, pct: i.pct, fallback: deterministicComment(i), existingReportId: i.existingReportId }
    return { custom_id: customId(i), params: { model, max_tokens: 300, system, messages: [{ role: 'user' as const, content: user }] } }
  })

  const batch = await getClient().messages.batches.create({ requests })
  await prisma.aiBatch.create({
    data: { providerBatchId: batch.id, kind: 'term-reports', termId: term.id, status: 'submitted', requestCount: requests.length, mapping: JSON.stringify(mapping) },
  })
  return { ok: true, submitted: requests.length, providerBatchId: batch.id, live: true }
}

export type CollectResult = { applied: number; stillPending: number; batches: number }

export async function collectReportBatches(): Promise<CollectResult> {
  if (!aiEnabled) return { applied: 0, stillPending: 0, batches: 0 }
  const pending = await prisma.aiBatch.findMany({ where: { status: 'submitted' } })
  let applied = 0
  let stillPending = 0

  for (const row of pending) {
    try {
      const batch = await getClient().messages.batches.retrieve(row.providerBatchId)
      if (batch.processing_status !== 'ended') { stillPending++; continue }

      const mapping = JSON.parse(row.mapping) as Mapping
      let n = 0
      let inTok = 0
      let outTok = 0
      const stream = await getClient().messages.batches.results(row.providerBatchId)
      for await (const entry of stream) {
        const m = mapping[entry.custom_id]
        if (!m || !row.termId) continue
        let comment = m.fallback
        if (entry.result.type === 'succeeded') {
          const msg = entry.result.message
          const text = firstText(msg).trim()
          if (text) comment = text
          inTok += msg.usage?.input_tokens ?? 0
          outTok += msg.usage?.output_tokens ?? 0
        }
        await writeReport(row.termId, toReportInput(m), comment)
        n++
      }
      // Batch API is ~50% of sync price; meter at half to keep /admin/ai-usage honest.
      if (inTok || outTok) await recordUsage({ task: 'report', model: modelFor('report'), inputTokens: Math.round(inTok / 2), outputTokens: Math.round(outTok / 2) })
      await prisma.aiBatch.update({ where: { id: row.id }, data: { status: 'applied', appliedCount: n, appliedAt: new Date() } })
      applied += n
    } catch {
      stillPending++ // transient - next tick retries
    }
  }
  return { applied, stillPending, batches: pending.length }
}
