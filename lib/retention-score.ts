import { prisma } from '@/lib/db'

export type FamilyRisk = {
  parentId: string
  parentName: string
  email: string | null
  phone: string | null
  students: string[]
  score: number // 0-100
  band: 'high' | 'medium' | 'low'
  reasons: string[]
  ltvCents: number
}

function band(score: number): FamilyRisk['band'] {
  if (score >= 45) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}

/**
 * Churn risk per family, computed entirely from CRM signals - no AI tokens. The
 * AI is only used afterwards (and on demand) to draft a win-back message. Signals
 * are additive so the reasons explain the score.
 */
export async function computeFamilyRisk(): Promise<FamilyRisk[]> {
  const [parents, absenceRows, questionRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'parent', students: { some: { status: 'active' } } },
      select: {
        id: true, name: true, email: true, phone: true, emailOptOut: true, marketingOptOut: true,
        students: { where: { status: 'active' }, select: { id: true, firstName: true } },
        bookings: { orderBy: { createdAt: 'desc' }, select: { paymentStatus: true, autoReenrol: true, totalAmountCents: true, createdAt: true } },
        withdrawalRequests: { where: { status: { in: ['requested', 'discussing'] } }, select: { id: true } },
      },
    }),
    prisma.attendance.groupBy({ by: ['studentId'], where: { status: 'absent' }, _count: { _all: true } }),
    prisma.question.groupBy({ by: ['studentId'], where: { blocked: false }, _count: { _all: true } }),
  ])

  const absentBy = new Map(absenceRows.map((r) => [r.studentId, r._count._all]))
  const questionsBy = new Map(questionRows.map((r) => [r.studentId, r._count._all]))

  const out: FamilyRisk[] = []
  for (const p of parents) {
    const studentIds = p.students.map((s) => s.id)
    const reasons: string[] = []
    let score = 0

    if (p.withdrawalRequests.length > 0) { score += 45; reasons.push('Raised a withdrawal request') }

    const latestPaid = p.bookings.find((b) => b.paymentStatus === 'paid')
    if (latestPaid && !latestPaid.autoReenrol) { score += 20; reasons.push('Turned off auto-enrolment') }

    if (p.bookings.some((b) => b.paymentStatus === 'pending')) { score += 15; reasons.push('Has an unpaid booking') }

    const absences = studentIds.reduce((s, id) => s + (absentBy.get(id) ?? 0), 0)
    if (absences >= 2) { score += 15; reasons.push(`${absences} recent absences`) }

    const totalQuestions = studentIds.reduce((s, id) => s + (questionsBy.get(id) ?? 0), 0)
    if (totalQuestions === 0) { score += 10; reasons.push('Low engagement (no questions asked)') }

    if (p.emailOptOut || p.marketingOptOut) { score += 5; reasons.push('Opted out of emails') }

    if (score <= 0) continue
    score = Math.min(100, score)
    out.push({
      parentId: p.id,
      parentName: p.name ?? 'Family',
      email: p.email,
      phone: p.phone,
      students: p.students.map((s) => s.firstName),
      score,
      band: band(score),
      reasons,
      ltvCents: p.bookings.filter((b) => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalAmountCents, 0),
    })
  }

  return out.sort((a, b) => b.score - a.score)
}
