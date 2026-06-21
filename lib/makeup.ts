import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'
import { grantStudentCredit } from '@/lib/credits'
import { getActiveTerm } from '@/lib/term'
import { weeklyRateFor } from '@/lib/proration'

// One missed session is worth one week of one subject.
export const MISSED_SESSION_CREDIT_CENTS = weeklyRateFor(1) * 100 // $35

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

/** Classes this student could drop into as a make-up: other subjects at their
 * year level, in the active term, with a spare seat (and not one they're in). */
export async function availableMakeupClasses(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { yearLevel: true, enrollments: { where: { status: 'active' }, select: { subjectId: true } } } })
  if (!student) return []
  const enrolledIds = new Set(student.enrollments.map((e) => e.subjectId))
  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true }, yearLevel: student.yearLevel },
    include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
    orderBy: { dayOfWeek: 'asc' },
  })
  return subjects
    .filter((s) => !enrolledIds.has(s.id) && s._count.enrollments < s.capacity)
    .map((s) => ({ id: s.id, name: s.name, day: DAY_NAMES[s.dayOfWeek] ?? '', startTime: s.startTime, endTime: s.endTime }))
}

/** Parent reports, in advance, that their child will miss a session. */
export async function reportMissedSession(input: { parentId: string; studentId: string; missedSubject: string; missedDateLabel: string; note?: string }) {
  const student = await prisma.student.findFirst({ where: { id: input.studentId, parentId: input.parentId, status: 'active' }, select: { firstName: true, lastName: true } })
  if (!student) return { ok: false as const, reason: 'Student not found.' }
  if (!input.missedSubject.trim() || !input.missedDateLabel.trim()) return { ok: false as const, reason: 'Tell us which class and when.' }
  const term = await getActiveTerm()
  if (!term) return { ok: false as const, reason: 'No active term.' }

  await prisma.missedSession.create({
    data: { studentId: input.studentId, parentId: input.parentId, termId: term.id, missedSubject: input.missedSubject.trim(), missedDateLabel: input.missedDateLabel.trim(), note: input.note?.trim() || null },
  })
  await notifyAdmin({
    type: 'request',
    title: `Heads-up: ${student.firstName} ${student.lastName} will miss a session`,
    body: `${input.missedSubject.trim()} (${input.missedDateLabel.trim()}). They can book a make-up or it becomes credit next term.`,
    href: '/admin/requests',
    refKey: `miss:${input.studentId}:${Date.now()}`,
  })
  return { ok: true as const }
}

/** Book a make-up into another class this term. */
export async function bookMakeup(input: { parentId: string; missedSessionId: string; makeupSubjectId: string; makeupDateLabel: string }) {
  const miss = await prisma.missedSession.findFirst({ where: { id: input.missedSessionId, parentId: input.parentId, status: 'open' } })
  if (!miss) return { ok: false as const, reason: 'This make-up is no longer available.' }
  const subject = await prisma.subject.findUnique({ where: { id: input.makeupSubjectId }, include: { _count: { select: { enrollments: { where: { status: 'active' } } } } } })
  if (!subject) return { ok: false as const, reason: 'Class not found.' }
  if (subject._count.enrollments >= subject.capacity) return { ok: false as const, reason: 'That class is now full - pick another.' }
  if (!input.makeupDateLabel.trim()) return { ok: false as const, reason: 'Choose a date.' }

  const label = `Y${subject.yearLevel} ${subject.name}`
  await prisma.$transaction([
    prisma.missedSession.update({ where: { id: miss.id }, data: { status: 'booked', makeupSubject: label, makeupDateLabel: input.makeupDateLabel.trim(), resolvedAt: new Date() } }),
    prisma.makeupBooking.create({ data: { studentId: miss.studentId, subjectName: subject.name, yearLevel: subject.yearLevel, makeupDate: new Date(), status: 'scheduled', notes: `Make-up for missed ${miss.missedSubject} (${miss.missedDateLabel}) - attending ${input.makeupDateLabel.trim()}` } }),
  ])
  await notifyAdmin({ type: 'booking', title: `Make-up booked: ${label}`, body: `A make-up was booked into ${label} for ${input.makeupDateLabel.trim()}. Let the tutor know to expect a drop-in.`, href: '/admin/classes', refKey: `makeup:${miss.id}` })
  return { ok: true as const }
}

/**
 * Cron sweep: once a term has ended, any make-up the family never booked
 * auto-converts to account credit for next term (the credit ledger then applies
 * it to the re-enrolment charge). Wired into the nudges cron.
 */
export async function sweepMissedSessions() {
  const now = new Date()
  const open = await prisma.missedSession.findMany({ where: { status: 'open' }, include: { student: { select: { firstName: true, lastName: true } } } })
  let credited = 0
  for (const m of open) {
    const term = await prisma.term.findUnique({ where: { id: m.termId }, select: { endDate: true } })
    if (!term || term.endDate >= now) continue // term still running - they can still book
    const grant = await grantStudentCredit({ studentId: m.studentId, amountCents: MISSED_SESSION_CREDIT_CENTS, reason: `Unused make-up: ${m.missedSubject} (${m.missedDateLabel})` })
    if (grant.ok) {
      await prisma.missedSession.update({ where: { id: m.id }, data: { status: 'credited', resolvedAt: now } })
      credited++
    }
  }
  return { credited }
}
