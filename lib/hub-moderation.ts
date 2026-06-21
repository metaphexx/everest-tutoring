import { moderateMessage, type ModerationResult } from '@/lib/moderation'

export type HubModeration = {
  status: 'clear' | 'flagged' | 'needs_review'
  blocked: boolean
  result: ModerationResult
}

/**
 * Run Learning Hub content (questions, replies, announcements, file descriptions)
 * through the same classifier the parent<->tutor chat uses, and map the result to
 * a moderation status. A high-severity abuse or poaching hit is held for admin
 * review (blocked from the class/recipient); anything else is delivered but
 * flagged for admin oversight. Reuses lib/moderation.ts so behaviour stays
 * consistent across the platform.
 */
export async function moderateContent(text: string): Promise<HubModeration> {
  const result = await moderateMessage(text)
  if (!result.flagged) return { status: 'clear', blocked: false, result }
  const high = result.severity === 'high'
  const malicious = high && (result.category === 'abuse' || result.category === 'poaching')
  return {
    status: malicious ? 'needs_review' : 'flagged',
    blocked: malicious,
    result,
  }
}
