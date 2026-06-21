import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { prisma } from '@/lib/db'

// Term dates are the single source of truth for billing. They live on the Term
// row (admin-editable at /admin/terms) so each term's dates + billable weeks can
// be set without code changes.

export function nextMonday(from: Date): Date {
  const day = from.getDay() // 0 = Sun, 1 = Mon
  if (day === 1) return new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const daysUntil = day === 0 ? 1 : 8 - day
  return addDays(from, daysUntil)
}

/** Total class weeks a term spans (its first Monday through the end date). */
export function totalWeeks(startDate: Date, endDate: Date): number {
  const firstMon = nextMonday(startDate)
  const d = differenceInCalendarDays(endDate, firstMon)
  return d < 0 ? 0 : Math.floor(d / 7) + 1
}

/**
 * Weeks left to bill if a family enrols `from` now: the full term before it
 * starts, the remaining class weeks once it's running, capped at the term's
 * billable `weeks`, and 0 after it ends.
 */
export function weeksRemaining(term: { startDate: Date; endDate: Date; weeks: number }, from: Date = new Date()): number {
  if (from <= term.startDate) return term.weeks
  const startMon = nextMonday(from)
  const d = differenceInCalendarDays(term.endDate, startMon)
  if (d < 0) return 0
  return Math.min(term.weeks, Math.floor(d / 7) + 1)
}

export async function getActiveTerm() {
  return prisma.term.findFirst({ where: { isActive: true } })
}

/** Convenience for client/display: active term + computed remaining weeks. */
export async function activeTermInfo() {
  const t = await getActiveTerm()
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    startISO: t.startDate.toISOString(),
    endISO: t.endDate.toISOString(),
    startLabel: format(t.startDate, 'd MMMM yyyy'),
    endLabel: format(t.endDate, 'd MMMM yyyy'),
    weeks: t.weeks,
    weeksRemaining: weeksRemaining(t),
  }
}
