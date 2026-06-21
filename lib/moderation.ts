import { aiEnabled, aiMessage, firstText } from '@/lib/ai'

export type ModerationResult = {
  flagged: boolean
  category?: string // poaching | abuse | safeguarding | principle
  severity?: string // low | medium | high
  reason?: string
}

// Preview-mode keyword heuristics (used until ANTHROPIC_API_KEY is set).
const POACHING = [
  /pay (me|us) directly/i, /off the books/i, /cash in hand/i, /outside (of )?everest/i,
  /my (personal |own )?(number|mobile|whatsapp|cell)/i, /skip everest/i, /don'?t tell everest/i,
  /book me direct/i, /privately/i, /cut out everest/i, /go private/i,
]
const ABUSE = [/\b(idiot|stupid|useless|moron|pathetic)\b/i, /\bshut up\b/i, /\bf+u+c+k/i, /\bsh+i+t/i]
const SAFEGUARD = [/self[- ]?harm/i, /hurt (myself|himself|herself|themsel)/i, /unsafe at home/i, /\babuse\b/i, /not safe/i]

export async function moderateMessage(body: string): Promise<ModerationResult> {
  if (aiEnabled) {
    try {
      const msg = await aiMessage({
        task: 'moderation',
        maxTokens: 300,
        system:
          `You are a trust-and-safety classifier for a tutoring platform's parent-to-tutor chat (Everest Tutoring). ` +
          `Flag a message when it: solicits off-platform or direct payment, or tries to take the student away from Everest (category "poaching"); ` +
          `contains abuse or harassment ("abuse"); raises a child-safeguarding concern ("safeguarding"); ` +
          `or otherwise breaches professional conduct/our principles ("principle"). Otherwise it is not flagged. ` +
          `Respond with JSON only.`,
        jsonSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            flagged: { type: 'boolean' },
            category: { type: 'string', enum: ['poaching', 'abuse', 'safeguarding', 'principle', 'none'] },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'none'] },
            reason: { type: 'string' },
          },
          required: ['flagged', 'category', 'severity', 'reason'],
        },
        messages: [{ role: 'user', content: body }],
      })
      const j = JSON.parse(firstText(msg)) as { flagged: boolean; category: string; severity: string; reason: string }
      return {
        flagged: !!j.flagged,
        category: j.category === 'none' ? undefined : j.category,
        severity: j.severity === 'none' ? undefined : j.severity,
        reason: j.reason,
      }
    } catch {
      // fall through to heuristic
    }
  }

  const checks: { patterns: RegExp[]; category: string; severity: string }[] = [
    { patterns: POACHING, category: 'poaching', severity: 'high' },
    { patterns: SAFEGUARD, category: 'safeguarding', severity: 'high' },
    { patterns: ABUSE, category: 'abuse', severity: 'medium' },
  ]
  for (const c of checks) {
    if (c.patterns.some((p) => p.test(body))) {
      return { flagged: true, category: c.category, severity: c.severity, reason: `Possible ${c.category} (keyword match)` }
    }
  }
  return { flagged: false }
}
