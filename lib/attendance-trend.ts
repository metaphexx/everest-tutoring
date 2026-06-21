import { prisma } from '@/lib/db'
import { startOfWeek, differenceInCalendarDays } from 'date-fns'

/**
 * Attendance aggregated by (week of term, year level, subject) for the active
 * term. The client chart filters this client-side by subject and year level.
 */
export type TrendPoint = { week: number; year: number; subject: string; ok: number; total: number }
export type TrendData = { weeks: number[]; points: TrendPoint[]; subjects: string[]; years: number[] }

export async function getAttendanceTrend(): Promise<TrendData> {
  const attendance = await prisma.attendance.findMany({
    include: { subject: { select: { name: true, yearLevel: true } } },
  })
  if (attendance.length === 0) return { weeks: [], points: [], subjects: [], years: [] }

  // Anchor week 1 on the term start if attendance has begun, otherwise on the
  // earliest recorded class, so the x-axis always reads W1..Wn of real data.
  const term = await prisma.term.findFirst({ where: { isActive: true } })
  const earliest = attendance.reduce((m, a) => (a.classDate < m ? a.classDate : m), attendance[0].classDate)
  const anchorDate = term && term.startDate <= earliest ? term.startDate : earliest
  const termStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const map = new Map<string, TrendPoint>()
  const weekSet = new Set<number>()
  const subjSet = new Set<string>()
  const yearSet = new Set<number>()

  for (const a of attendance) {
    const week = Math.max(1, Math.floor(differenceInCalendarDays(startOfWeek(a.classDate, { weekStartsOn: 1 }), termStart) / 7) + 1)
    const year = a.subject.yearLevel
    const subject = a.subject.name
    weekSet.add(week)
    subjSet.add(subject)
    yearSet.add(year)
    const key = `${week}-${year}-${subject}`
    const p = map.get(key) ?? { week, year, subject, ok: 0, total: 0 }
    p.total++
    if (a.status === 'present' || a.status === 'late') p.ok++
    map.set(key, p)
  }

  return {
    weeks: [...weekSet].sort((a, b) => a - b),
    points: [...map.values()],
    subjects: [...subjSet].sort(),
    years: [...yearSet].sort((a, b) => a - b),
  }
}
