import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { aiMessage, firstText, modelFor, type AiTask } from '@/lib/ai'
import { recordUsage, withinBudget } from '@/lib/ai-cost'
import type Anthropic from '@anthropic-ai/sdk'

/**
 * Cost-aware text generation. One entry point that the AI features call instead
 * of aiMessage directly, layering two savings on top of the per-task model
 * routing in lib/ai.ts:
 *
 *   1. Content-addressed cache - identical (task + system + messages) inputs
 *      reuse a stored answer instead of paying for the model again. Ideal for
 *      deterministic drafts (a win-back note for the same signals, a report from
 *      the same inputs) that are regenerated on every page view.
 *   2. Per-task monthly budgets - when a task is over its budget, this throws
 *      BudgetExceededError so the caller falls back to its deterministic path.
 *
 * Callers already wrap this in try/catch with a non-AI fallback, so a cache miss,
 * a budget stop or a model error all degrade gracefully.
 */

export class BudgetExceededError extends Error {
  constructor(task: string) {
    super(`AI budget exceeded for task "${task}"`)
    this.name = 'BudgetExceededError'
  }
}

type Opts = {
  task: AiTask
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
  jsonSchema?: Record<string, unknown>
  /** Set false for conversational/one-off calls that should not be cached. */
  cacheable?: boolean
}

function cacheKey(o: Opts): string {
  const h = createHash('sha256')
  h.update(JSON.stringify({ task: o.task, system: o.system ?? '', messages: o.messages, jsonSchema: o.jsonSchema ?? null }))
  return h.digest('hex')
}

/** Generate text with caching + budget guard. Returns the first text block. */
export async function cachedText(opts: Opts): Promise<string> {
  const cacheable = opts.cacheable !== false
  const model = modelFor(opts.task)

  if (cacheable) {
    const key = cacheKey(opts)
    const hit = await prisma.aiCache.findUnique({ where: { key } }).catch(() => null)
    if (hit) {
      await prisma.aiCache.update({ where: { key }, data: { hits: { increment: 1 }, lastUsed: new Date() } }).catch(() => {})
      await recordUsage({ task: opts.task, model: hit.model, inputTokens: 0, outputTokens: 0, cached: true })
      return hit.output
    }
  }

  if (!(await withinBudget(opts.task))) throw new BudgetExceededError(opts.task)

  const msg = await aiMessage({
    task: opts.task,
    system: opts.system,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
    jsonSchema: opts.jsonSchema,
  })
  const text = firstText(msg).trim()
  await recordUsage({
    task: opts.task,
    model,
    inputTokens: msg.usage?.input_tokens ?? 0,
    outputTokens: msg.usage?.output_tokens ?? 0,
  })

  if (cacheable && text) {
    const key = cacheKey(opts)
    await prisma.aiCache.upsert({
      where: { key },
      create: { key, task: opts.task, model, output: text },
      update: { hits: { increment: 1 }, lastUsed: new Date() },
    }).catch(() => {})
  }
  return text
}
