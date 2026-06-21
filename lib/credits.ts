import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'

/**
 * Student account credit. Issued (e.g. for a missed session) and applied to
 * reduce future charges. Credit is granted per-student but spent at the family
 * level, so a family's whole balance can offset any of their bookings.
 */

/** Total unused credit (cents) across a family's students. */
export async function familyCreditCents(parentId: string): Promise<number> {
  const agg = await prisma.studentCredit.aggregate({
    where: { parentId, status: 'active' },
    _sum: { amountCents: true },
  })
  return agg._sum.amountCents ?? 0
}

/** Unused credit (cents) for a single student. */
export async function studentCreditCents(studentId: string): Promise<number> {
  const agg = await prisma.studentCredit.aggregate({
    where: { studentId, status: 'active' },
    _sum: { amountCents: true },
  })
  return agg._sum.amountCents ?? 0
}

/** Issue credit to a student (e.g. a missed session). */
export async function grantStudentCredit(input: { studentId: string; amountCents: number; reason: string; createdById?: string }) {
  if (input.amountCents <= 0 || !input.reason.trim()) return { ok: false as const, reason: 'Add an amount and a reason.' }
  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { parentId: true, firstName: true, lastName: true } })
  if (!student) return { ok: false as const, reason: 'Student not found.' }
  await prisma.studentCredit.create({
    data: {
      studentId: input.studentId,
      parentId: student.parentId,
      amountCents: input.amountCents,
      originalCents: input.amountCents,
      reason: input.reason.trim(),
      createdById: input.createdById ?? null,
    },
  })
  await notifyAdmin({
    type: 'system',
    title: `Credit issued: ${student.firstName} ${student.lastName}`,
    body: `$${(input.amountCents / 100).toFixed(2)} - ${input.reason.trim()}. Applies to their next charge.`,
    href: `/admin/students/${input.studentId}`,
    refKey: `credit:${input.studentId}:${Date.now()}`,
  })
  return { ok: true as const }
}

/** Void an unused credit. */
export async function voidStudentCredit(creditId: string) {
  await prisma.studentCredit.update({ where: { id: creditId }, data: { status: 'void', amountCents: 0, appliedAt: new Date() } })
  return { ok: true as const }
}

/**
 * Consume up to `maxCents` of a family's active credit (oldest first), partially
 * drawing down the last one if needed. Returns the total cents applied. Call this
 * at the moment money is actually taken (off-session charge, or payment webhook).
 */
export async function consumeFamilyCredit(parentId: string, maxCents: number): Promise<number> {
  if (maxCents <= 0) return 0
  const credits = await prisma.studentCredit.findMany({
    where: { parentId, status: 'active' },
    orderBy: { createdAt: 'asc' },
  })
  let remaining = maxCents
  let applied = 0
  for (const c of credits) {
    if (remaining <= 0) break
    const take = Math.min(c.amountCents, remaining)
    const left = c.amountCents - take
    await prisma.studentCredit.update({
      where: { id: c.id },
      data: left <= 0 ? { amountCents: 0, status: 'applied', appliedAt: new Date() } : { amountCents: left },
    })
    applied += take
    remaining -= take
  }
  return applied
}
