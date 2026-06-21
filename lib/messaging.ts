import { aiEnabled, aiMessage, firstText } from '@/lib/ai'

/** Rolling AI summary of a thread for admin oversight (stub until a key is set). */
export async function summarizeConversation(turns: { sender: string; body: string }[]): Promise<string> {
  if (turns.length === 0) return ''
  if (aiEnabled) {
    try {
      const transcript = turns.map((t) => `${t.sender}: ${t.body}`).join('\n')
      const msg = await aiMessage({
        task: 'summary',
        maxTokens: 220,
        system:
          'You summarise a parent-tutor chat for an admin who is monitoring it. One or two neutral sentences. Note anything that needs attention (a complaint, a scheduling issue, or a flagged message).',
        messages: [{ role: 'user', content: transcript }],
      })
      return firstText(msg)
    } catch {
      // fall through
    }
  }
  const last = turns[turns.length - 1]
  const snip = last.body.length > 70 ? `${last.body.slice(0, 70)}…` : last.body
  return `${turns.length} message${turns.length === 1 ? '' : 's'}. Latest from ${last.sender}: "${snip}"`
}

/** Lightweight topic tags for support triage (stub heuristic). */
export function supportTags(text: string): string {
  const t = text.toLowerCase()
  const tags: string[] = []
  if (/(invoice|payment|refund|charge|paid|cost|price|fee)/.test(t)) tags.push('billing')
  if (/(time|reschedul|swap|day|cancel|miss|absent|makeup|make-up)/.test(t)) tags.push('scheduling')
  if (/(unhappy|complain|disappoint|refund|wrong|bad)/.test(t)) tags.push('complaint')
  if (tags.length === 0) tags.push('general')
  return tags.join(',')
}
