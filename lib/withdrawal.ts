import { prisma } from '@/lib/db'
import { offerNextSeat } from '@/lib/waitlist'
import { notifyAdmin } from '@/lib/admin-notify'

/**
 * Process a withdrawal (admin-only, never automatic). Ends the student's active
 * enrollments, turns off auto-enrol, frees each vacated seat (auto-advancing the
 * waitlist), and moves the family to `alumni` once they have no students left -
 * which is what feeds the win-back marketing list.
 *
 * Pass `studentId` to withdraw one child, or omit it to withdraw the whole
 * family. Auth lives in the calling server action.
 */
export async function processWithdrawal(input: { requestId?: string; parentId: string; studentId?: string; reason?: string; adminNote?: string }) {
  const now = new Date()

  // Which students are leaving?
  const targets = await prisma.student.findMany({
    where: input.studentId
      ? { id: input.studentId, parentId: input.parentId }
      : { parentId: input.parentId, status: 'active' },
    include: { enrollments: { where: { status: 'active' }, include: { subject: { select: { id: true, name: true, yearLevel: true } } } } },
  })

  const vacated = new Set<string>()
  const studentLabels: string[] = []

  for (const s of targets) {
    await prisma.enrollment.updateMany({ where: { studentId: s.id, status: 'active' }, data: { status: 'withdrawn' } })
    await prisma.student.update({ where: { id: s.id }, data: { status: 'withdrawn', withdrawnAt: now, exitReason: input.reason ?? null } })
    for (const e of s.enrollments) vacated.add(e.subject.id)
    studentLabels.push(`${s.firstName} ${s.lastName}`)
  }

  // Stop next-term auto-enrolment for this family.
  await prisma.booking.updateMany({ where: { userId: input.parentId, paymentStatus: 'paid' }, data: { autoReenrol: false } })

  // Free each vacated seat - roll it to the next waiting family.
  let reoffered = 0
  for (const subjectId of vacated) {
    const r = await offerNextSeat(subjectId)
    if (r.offered) reoffered++
  }

  // If no active students remain, the family becomes alumni (win-back list).
  const remaining = await prisma.student.count({ where: { parentId: input.parentId, status: 'active' } })
  let becameAlumni = false
  if (remaining === 0) {
    await prisma.user.update({ where: { id: input.parentId }, data: { lifecycleStage: 'alumni', alumniSince: now } })
    becameAlumni = true
  }

  if (input.requestId) {
    await prisma.withdrawalRequest.update({ where: { id: input.requestId }, data: { status: 'processed', resolvedAt: now, adminNote: input.adminNote ?? null } })
  }

  await notifyAdmin({
    type: 'system',
    title: `Withdrawal processed: ${studentLabels.join(', ') || 'family'}`,
    body: `${vacated.size} seat${vacated.size === 1 ? '' : 's'} freed${reoffered ? `, ${reoffered} offered to waitlisted famil${reoffered === 1 ? 'y' : 'ies'}` : ''}.${becameAlumni ? ' Family moved to alumni / win-back list.' : ''}`,
    href: '/admin/alumni',
    refKey: `withdrawal:${input.requestId ?? input.parentId}:${now.getTime()}`,
  })

  return { withdrawn: studentLabels, seatsFreed: vacated.size, reoffered, becameAlumni }
}

/** Family lifetime value: sum of all paid bookings for a parent, in cents. */
export async function familyLifetimeCents(parentId: string): Promise<number> {
  const agg = await prisma.booking.aggregate({ where: { userId: parentId, paymentStatus: { in: ['paid', 'disputed'] } }, _sum: { totalAmountCents: true } })
  return agg._sum.totalAmountCents ?? 0
}
