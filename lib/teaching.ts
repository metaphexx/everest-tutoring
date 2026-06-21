import { prisma } from '@/lib/db'
import { startOfDay } from 'date-fns'
import { parseTopics } from '@/lib/outline'
import { suggestMaterials, type MaterialSuggestion } from '@/lib/materials'

/**
 * Turns the scanned course outline + assessment calendar + materials drive into
 * a concrete "here's what to teach this week" plan for a tutor's class.
 */
export type TeachingPlan = {
  weekOfTerm: number | null
  topic: { week: number | null; topic: string; focus?: string } | null
  upcomingTopics: { week: number | null; topic: string }[]
  nextAssessment: { title: string; date: Date; notes: string | null } | null
  suggestedPrac: string | null
  materials: MaterialSuggestion[]
  hasOutline: boolean
}

export function weekOfTerm(termStart: Date, on: Date = new Date()): number {
  const ms = startOfDay(on).getTime() - startOfDay(termStart).getTime()
  return Math.max(1, Math.floor(ms / (7 * 24 * 3600 * 1000)) + 1)
}

export async function weeklyTeachingPlan(
  input: { yearLevel: number; subject: string },
  on: Date = new Date(),
): Promise<TeachingPlan> {
  const [term, outline, nextAssessment] = await Promise.all([
    prisma.term.findFirst({ where: { isActive: true } }),
    prisma.courseOutline.findFirst({
      where: { yearLevel: input.yearLevel, subject: input.subject, status: 'scanned' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.assessmentDate.findFirst({
      where: { yearLevel: input.yearLevel, subject: input.subject, date: { gte: startOfDay(on) } },
      orderBy: { date: 'asc' },
    }),
  ])

  const topics = parseTopics(outline?.topics ?? null)
  const wk = term ? weekOfTerm(term.startDate, on) : null

  let topic: TeachingPlan['topic'] = null
  if (topics.length) {
    if (wk != null) topic = topics.find((t) => t.week === wk) ?? null
    if (!topic) topic = topics.find((t) => t.week == null) ?? topics[0]
  }
  const upcomingTopics =
    wk != null ? topics.filter((t) => t.week != null && (t.week as number) > wk).slice(0, 3) : topics.slice(0, 3)

  const suggestedPrac = nextAssessment
    ? `Run a short ${input.subject} prac in the style of "${nextAssessment.title}" to prepare students - it's coming up on ${nextAssessment.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}.`
    : topic
      ? `Finish the session with a few exam-style questions on ${topic.topic.toLowerCase()}.`
      : null

  const materials = await suggestMaterials({
    yearLevel: input.yearLevel,
    subject: input.subject,
    topic: topic?.topic ?? null,
    weekOf: on,
  })

  return {
    weekOfTerm: wk,
    topic,
    upcomingTopics,
    nextAssessment: nextAssessment
      ? { title: nextAssessment.title, date: nextAssessment.date, notes: nextAssessment.notes }
      : null,
    suggestedPrac,
    materials,
    hasOutline: !!outline,
  }
}
