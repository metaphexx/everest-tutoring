import Anthropic from '@anthropic-ai/sdk'

/**
 * Central config for every AI feature in the CRM.
 *
 * The MODEL is the only thing that changes between deployments - every prompt and
 * instruction lives in the feature modules (moderation, summaries, copilot, …) and
 * stays byte-for-byte identical no matter which model runs it. To swap models
 * (e.g. drop to a cheaper one to cut cost) you change an env var; no code changes.
 *
 *   ANTHROPIC_API_KEY        the key - when unset/placeholder, AI runs in stub mode
 *   AI_MODEL                 global default model for every AI task
 *   AI_MODEL_<TASK>          override a single task, e.g. AI_MODEL_MODERATION
 *
 * Defaults to Claude Opus 4.8 (most capable). Cheaper drop-ins for cost: set
 * AI_MODEL or a per-task override to claude-sonnet-4-6 or claude-haiku-4-5.
 */

const apiKey = process.env.ANTHROPIC_API_KEY
const keyLooksReal = !!apiKey && apiKey.startsWith('sk-ant-') && !apiKey.includes('...')

/** True only when a real key is configured. Features fall back to a stub otherwise. */
export const aiEnabled = keyLooksReal

const FALLBACK_MODEL = 'claude-opus-4-8'

export type AiTask = 'moderation' | 'summary' | 'copilot' | 'report' | 'analytics' | 'support' | 'draft'

const TASK_ENV: Record<AiTask, string> = {
  moderation: 'AI_MODEL_MODERATION',
  summary: 'AI_MODEL_SUMMARY',
  copilot: 'AI_MODEL_COPILOT',
  report: 'AI_MODEL_REPORT',
  analytics: 'AI_MODEL_ANALYTICS',
  support: 'AI_MODEL_SUPPORT',
  draft: 'AI_MODEL_DRAFT',
}

// Cost-optimized default model per task: cheap+fast models for high-volume or
// simple work, stronger models for reasoning/writing. These apply out of the box
// to cut cost; override any single task with AI_MODEL_<TASK>, or set AI_MODEL to
// force one model across the board. Prompts never change - only the model does.
const TASK_DEFAULT: Record<AiTask, string> = {
  moderation: 'claude-haiku-4-5', // high volume, simple classification
  summary: 'claude-haiku-4-5', // short rolling summaries
  support: 'claude-sonnet-4-6', // triage + tags
  analytics: 'claude-sonnet-4-6', // outline scanning / structured extraction
  report: 'claude-sonnet-4-6', // parent-facing report comments
  draft: 'claude-haiku-4-5', // cheap low-stakes drafts (win-back nudges, suggested replies) - admin edits before sending
  copilot: 'claude-opus-4-8', // Elliot reasoning + drafting (most capable)
}

/**
 * Resolve the model for a task. Precedence:
 *   AI_MODEL_<TASK> (per-task override) → AI_MODEL (force all) →
 *   cost-optimized per-task default → fallback.
 */
export function modelFor(task: AiTask): string {
  return process.env[TASK_ENV[task]] || process.env.AI_MODEL || TASK_DEFAULT[task] || FALLBACK_MODEL
}

const client = aiEnabled ? new Anthropic({ apiKey }) : null

/** The shared Anthropic client. Throws if AI is disabled - guard with `aiEnabled`. */
export function getClient(): Anthropic {
  if (!client) throw new Error('AI is disabled - set ANTHROPIC_API_KEY to enable.')
  return client
}

type AiMessageOpts = {
  task: AiTask
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
  tools?: Anthropic.Tool[]
  toolChoice?: Anthropic.MessageCreateParams['tool_choice']
  /** JSON schema for structured output (maps to output_config.format). */
  jsonSchema?: Record<string, unknown>
}

/**
 * One call shape for every model. Intentionally omits model-gated params
 * (effort, thinking, temperature) so any model in the Claude family is a true
 * drop-in replacement. The model itself comes from env via modelFor(task).
 */
export async function aiMessage(opts: AiMessageOpts): Promise<Anthropic.Message> {
  const base: Anthropic.MessageCreateParamsNonStreaming = {
    model: modelFor(opts.task),
    max_tokens: opts.maxTokens ?? 1024,
    messages: opts.messages,
  }
  if (opts.system) base.system = opts.system
  if (opts.tools) base.tools = opts.tools
  if (opts.toolChoice) base.tool_choice = opts.toolChoice

  const params = opts.jsonSchema
    ? { ...base, output_config: { format: { type: 'json_schema', schema: opts.jsonSchema } } }
    : base

  return getClient().messages.create(params as Anthropic.MessageCreateParamsNonStreaming)
}

/** Convenience: the first text block of a response (for summaries/classification). */
export function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text')
  return block && block.type === 'text' ? block.text : ''
}
