import { prisma } from '@/lib/db'
import { aiEnabled } from '@/lib/ai'
import { cachedText } from '@/lib/ai-cache'
import { gatherContext } from '@/lib/elliot'
import { computeFamilyRisk } from '@/lib/retention-score'

/**
 * The proactive morning brief. A nightly job (lib/batch.ts via /api/cron/digest)
 * gathers the day's signals - all from SQL, zero AI - and Elliot writes them up
 * as a short brief the admin sees at the top of the overview. Token-cheap: the
 * signals are computed in code; the model only turns the bullet points into prose
 * (summary tier = Haiku, cached so re-rendering the overview costs nothing).
 */

export type DigestSignals = {
  students: number
  attendancePct: number | null
  repeatAbsentees: string[]
  pendingBookings: number
  unansweredQuestions: number
  flagged: number
  atRiskHigh: number
  upcomingAssessments: number
}

export async function gatherDigestSignals(): Promise<DigestSignals> {
  const weekAhead = new Date()
  weekAhead.setDate(weekAhead.getDate() + 7)
  const [ctx, risks, unanswered, flaggedMsgs, flaggedQs, upcoming] = await Promise.all([
    gatherContext(),
    computeFamilyRisk(),
    prisma.question.count({ where: { status: 'waiting_for_tutor', blocked: false } }),
    prisma.message.count({ where: { flagged: true } }).catch(() => 0),
    prisma.question.count({ where: { moderationStatus: 'flagged' } }).catch(() => 0),
    prisma.studentAssessment.count({ where: { dueDate: { gte: new Date(), lte: weekAhead } } }).catch(() => 0),
  ])
  return {
    students: ctx.students,
    attendancePct: ctx.attendancePct,
    repeatAbsentees: ctx.repeatAbsentees,
    pendingBookings: ctx.pendingBookings,
    unansweredQuestions: unanswered,
    flagged: flaggedMsgs + flaggedQs,
    atRiskHigh: risks.filter((r) => r.band === 'high').length,
    upcomingAssessments: upcoming,
  }
}

function signalsToLines(s: DigestSignals): string[] {
  const lines: string[] = []
  if (s.attendancePct !== null) lines.push(`Attendance is ${s.attendancePct}% this term.`)
  if (s.repeatAbsentees.length) lines.push(`Repeat absentees (2+): ${s.repeatAbsentees.join(', ')}.`)
  if (s.unansweredQuestions) lines.push(`${s.unansweredQuestions} student question${s.unansweredQuestions === 1 ? '' : 's'} waiting for a tutor.`)
  if (s.pendingBookings) lines.push(`${s.pendingBookings} booking${s.pendingBookings === 1 ? '' : 's'} still unpaid.`)
  if (s.atRiskHigh) lines.push(`${s.atRiskHigh} famil${s.atRiskHigh === 1 ? 'y' : 'ies'} at high churn risk - worth a personal call.`)
  if (s.flagged) lines.push(`${s.flagged} item${s.flagged === 1 ? '' : 's'} flagged by moderation need review.`)
  if (s.upcomingAssessments) lines.push(`${s.upcomingAssessments} school assessment${s.upcomingAssessments === 1 ? '' : 's'} due in the next week - good time to nudge revision.`)
  if (lines.length === 0) lines.push('Nothing urgent flagged. A good day to check in with a few families.')
  return lines
}

/** Build (and store) the morning brief. Safe to run repeatedly. */
export async function buildMorningBrief(): Promise<{ body: string; live: boolean }> {
  const signals = await gatherDigestSignals()
  const lines = signalsToLines(signals)

  let body = lines.map((l) => `- ${l}`).join('\n')
  let live = false
  if (aiEnabled) {
    try {
      const text = await cachedText({
        task: 'summary',
        maxTokens: 350,
        system: 'You are Elliot, the assistant for Everest Tutoring. Turn these overnight signals into a brief, friendly morning brief for the admin team (3-4 sentences, Australian English, no em dashes). Lead with what most needs attention. Do not invent anything beyond the signals.',
        messages: [{ role: 'user', content: `Today's signals:\n${lines.join('\n')}` }],
      })
      if (text) { body = text; live = true }
    } catch {
      /* keep the deterministic bullet list */
    }
  }

  await prisma.digest.create({ data: { kind: 'morning', body, live } }).catch(() => {})
  return { body, live }
}

/** The most recent stored brief, if any (for the overview). */
export async function latestDigest(kind = 'morning') {
  return prisma.digest.findFirst({ where: { kind }, orderBy: { createdAt: 'desc' } })
}
