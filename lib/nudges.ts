import { prisma } from '@/lib/db'
import { addDays } from 'date-fns'
import { notifyAdmin } from '@/lib/admin-notify'

/**
 * Proactive nudges from Elliot. Scans the CRM for things the admin should act on
 * and drops them into the notification centre. Deduped per issue per day (refKey
 * carries the date), so running this often is cheap and idempotent.
 *
 * Surfaced: referred parents who haven't booked, students with repeat absences,
 * unpaid bookings, and classes filling up.
 */
export async function generateNudges(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = addDays(new Date(), -7)
  let created = 0
  const fire = async (i: Parameters<typeof notifyAdmin>[0]) => { await notifyAdmin(i); created++ }

  // 1. Referrals not yet converted after a week.
  const staleReferrals = await prisma.referral.findMany({
    where: { status: { in: ['new', 'contacted'] }, createdAt: { lt: weekAgo } },
  })
  for (const r of staleReferrals) {
    await fire({
      type: 'referral',
      title: `Follow up: ${r.studentName} hasn't booked`,
      body: `Referred over a week ago and still ${r.status}. A nudge from Elliot might convert them.`,
      href: '/admin/partner',
      refKey: `nudge:referral:${r.id}:${today}`,
    })
  }

  // 2. Students with 2+ absences this term.
  const absences = await prisma.attendance.findMany({
    where: { status: 'absent' },
    select: { studentId: true, student: { select: { firstName: true, lastName: true } } },
  })
  const byStudent = new Map<string, { name: string; n: number }>()
  for (const a of absences) {
    const cur = byStudent.get(a.studentId)
    byStudent.set(a.studentId, { name: `${a.student.firstName} ${a.student.lastName}`, n: (cur?.n ?? 0) + 1 })
  }
  for (const [id, v] of byStudent) {
    if (v.n >= 2) {
      await fire({
        type: 'flag',
        title: `${v.name} has ${v.n} absences`,
        body: 'Worth a check-in with the family about attendance.',
        href: '/admin/students',
        refKey: `nudge:absence:${id}:${today}`,
      })
    }
  }

  // 3. Unpaid / pending bookings.
  const pending = await prisma.booking.findMany({ where: { paymentStatus: 'pending' }, include: { user: true } })
  for (const b of pending) {
    await fire({
      type: 'payment',
      title: `Unpaid booking: ${b.user?.name ?? 'a parent'}`,
      body: `${b.confirmationCode ?? b.id} is still pending payment.`,
      href: '/admin/bookings',
      refKey: `nudge:pending:${b.id}:${today}`,
    })
  }

  // 4. Classes filling up (>= 80% of capacity).
  const subjects = await prisma.subject.findMany({
    where: { term: { isActive: true } },
    include: { _count: { select: { enrollments: true } } },
  })
  for (const s of subjects) {
    const enrolled = s._count.enrollments
    if (s.capacity > 0 && enrolled >= Math.ceil(s.capacity * 0.8) && enrolled < s.capacity) {
      await fire({
        type: 'booking',
        title: `Y${s.yearLevel} ${s.name} is nearly full`,
        body: `${enrolled}/${s.capacity} enrolled - consider a waitlist or an extra class.`,
        href: '/admin/classes',
        refKey: `nudge:capacity:${s.id}:${today}`,
      })
    }
  }

  return created
}
