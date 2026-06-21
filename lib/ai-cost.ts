import { prisma } from '@/lib/db'
import type { AiTask } from '@/lib/ai'

/**
 * AI cost governance: a usage ledger + per-task monthly budgets.
 *
 * Every model call records its token usage and an estimated cost (lib/ai-cache.ts
 * calls recordUsage). Budgets are set per task via env - AI_BUDGET_<TASK>_CENTS
 * (e.g. AI_BUDGET_COPILOT_CENTS=2000 for $20/month on Elliot) or a global
 * AI_BUDGET_CENTS. When a task is over budget, the AI helper falls back to its
 * deterministic path instead of spending more - the CRM keeps working, just
 * without the live model, and admins see the spend on /admin/ai-usage.
 */

// Approximate list prices in cents per 1,000,000 tokens (input / output). Matched
// by model-name prefix so future point releases inherit the right tier. Tune to
// your contract; only used for the budget estimate, never billed from here.
const PRICE: { prefix: string; inPerM: number; outPerM: number }[] = [
  { prefix: 'claude-opus', inPerM: 1500, outPerM: 7500 },
  { prefix: 'claude-sonnet', inPerM: 300, outPerM: 1500 },
  { prefix: 'claude-haiku', inPerM: 100, outPerM: 500 },
  { prefix: 'claude-fable', inPerM: 300, outPerM: 1500 },
]

export function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE.find((x) => model.startsWith(x.prefix)) ?? PRICE[1]
  return (inputTokens * p.inPerM + outputTokens * p.outPerM) / 1_000_000
}

const TASK_BUDGET_ENV: Record<AiTask, string> = {
  moderation: 'AI_BUDGET_MODERATION_CENTS',
  summary: 'AI_BUDGET_SUMMARY_CENTS',
  copilot: 'AI_BUDGET_COPILOT_CENTS',
  report: 'AI_BUDGET_REPORT_CENTS',
  analytics: 'AI_BUDGET_ANALYTICS_CENTS',
  support: 'AI_BUDGET_SUPPORT_CENTS',
  draft: 'AI_BUDGET_DRAFT_CENTS',
}

/** Monthly budget in cents for a task, or null when uncapped. */
export function budgetCents(task: AiTask): number | null {
  const raw = process.env[TASK_BUDGET_ENV[task]] ?? process.env.AI_BUDGET_CENTS
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function monthStart(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Total spend this calendar month, optionally for one task. */
export async function monthlyCostCents(task?: AiTask): Promise<number> {
  const agg = await prisma.aiUsage.aggregate({
    where: { createdAt: { gte: monthStart() }, ...(task ? { task } : {}) },
    _sum: { costCents: true },
  })
  return agg._sum.costCents ?? 0
}

/** True when the task still has budget left this month (or is uncapped). */
export async function withinBudget(task: AiTask): Promise<boolean> {
  const budget = budgetCents(task)
  if (budget === null) return true
  return (await monthlyCostCents(task)) < budget
}

export async function recordUsage(input: {
  task: string
  model: string
  inputTokens: number
  outputTokens: number
  cached?: boolean
}): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        task: input.task,
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costCents: input.cached ? 0 : estimateCostCents(input.model, input.inputTokens, input.outputTokens),
        cached: input.cached ?? false,
      },
    })
  } catch {
    /* usage logging is best-effort */
  }
}

export type UsageSummaryRow = { task: string; calls: number; cached: number; inputTokens: number; outputTokens: number; costCents: number }

/** Per-task rollup for the current month, for the admin usage view. */
export async function usageSummary(): Promise<{ rows: UsageSummaryRow[]; totalCents: number }> {
  const rows = await prisma.aiUsage.groupBy({
    by: ['task'],
    where: { createdAt: { gte: monthStart() } },
    _count: { _all: true },
    _sum: { inputTokens: true, outputTokens: true, costCents: true },
  })
  const cachedCounts = await prisma.aiUsage.groupBy({
    by: ['task'],
    where: { createdAt: { gte: monthStart() }, cached: true },
    _count: { _all: true },
  })
  const cachedByTask = new Map(cachedCounts.map((c) => [c.task, c._count._all]))
  const out: UsageSummaryRow[] = rows.map((r) => ({
    task: r.task,
    calls: r._count._all,
    cached: cachedByTask.get(r.task) ?? 0,
    inputTokens: r._sum.inputTokens ?? 0,
    outputTokens: r._sum.outputTokens ?? 0,
    costCents: r._sum.costCents ?? 0,
  }))
  const totalCents = out.reduce((s, r) => s + r.costCents, 0)
  return { rows: out.sort((a, b) => b.costCents - a.costCents), totalCents }
}
