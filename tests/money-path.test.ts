import { describe, it, expect, afterAll } from 'vitest'
import { prisma, rawPrisma } from '@/lib/db'
import { grantStudentCredit, familyCreditCents, consumeFamilyCredit } from '@/lib/credits'
import { seatOrWaitlist } from '@/lib/enroll'

// Integration tests against the dev SQLite db. Each creates throwaway rows
// (unique emails) and tears them down in afterAll, so the db is left clean.
const userIds: string[] = []
const subjectIds: string[] = []

describe('money path (integration)', () => {
  it('credit: grant, partial consume, then exhaust', async () => {
    const p = await prisma.user.create({ data: { email: `t-credit-${Date.now()}@test.local`, role: 'parent' } })
    userIds.push(p.id)
    const s = await prisma.student.create({ data: { firstName: 'Test', lastName: 'Credit', yearLevel: 8, parentId: p.id } })

    await grantStudentCredit({ studentId: s.id, amountCents: 3500, reason: 'integration test' })
    expect(await familyCreditCents(p.id)).toBe(3500)

    expect(await consumeFamilyCredit(p.id, 2000)).toBe(2000)
    expect(await familyCreditCents(p.id)).toBe(1500)

    // Only $15 left, so consuming $99 applies $15 and exhausts the credit.
    expect(await consumeFamilyCredit(p.id, 9900)).toBe(1500)
    expect(await familyCreditCents(p.id)).toBe(0)
  })

  it('capacity: a full class waitlists instead of overbooking', async () => {
    const term = await prisma.term.findFirst({ where: { isActive: true } })
    expect(term).toBeTruthy()

    const tutor = await prisma.user.create({ data: { email: `t-tutor-${Date.now()}@test.local`, role: 'tutor' } })
    userIds.push(tutor.id)
    const subject = await prisma.subject.create({
      data: { name: 'Maths', yearLevel: 8, dayOfWeek: 1, startTime: '3:15pm', endTime: '4:15pm', capacity: 1, color: '#000000', termId: term!.id, tutorId: tutor.id },
    })
    subjectIds.push(subject.id)

    const parent = await prisma.user.create({ data: { email: `t-parent-${Date.now()}@test.local`, role: 'parent' } })
    userIds.push(parent.id)
    const a = await prisma.student.create({ data: { firstName: 'A', lastName: 'A', yearLevel: 8, parentId: parent.id } })
    const b = await prisma.student.create({ data: { firstName: 'B', lastName: 'B', yearLevel: 8, parentId: parent.id } })
    const booking = await prisma.booking.create({ data: { userId: parent.id, termId: term!.id, subjectsPerWeek: 1, weeksRemaining: 10, totalAmountCents: 1, paymentStatus: 'paid' } })

    const r1 = await seatOrWaitlist({ studentId: a.id, subjectId: subject.id, bookingId: booking.id, parentId: parent.id, parentName: null, studentName: 'A' })
    expect(r1.seated).toBe(true)

    const r2 = await seatOrWaitlist({ studentId: b.id, subjectId: subject.id, bookingId: booking.id, parentId: parent.id, parentName: null, studentName: 'B' })
    expect(r2.seated).toBe(false) // cap is 1 → second is waitlisted, never overbooked

    expect(await prisma.enrollment.count({ where: { subjectId: subject.id, status: 'active' } })).toBe(1)
  })
})

afterAll(async () => {
  // Use rawPrisma so these are real hard-deletes: the soft-delete extension would
  // otherwise convert deleteMany on Student/StudentCredit into deletedAt stamps,
  // leaving test fixtures sitting in the admin Trash.
  for (const sid of subjectIds) {
    await rawPrisma.enrollment.deleteMany({ where: { subjectId: sid } })
    await rawPrisma.waitlist.deleteMany({ where: { subjectId: sid } })
    await rawPrisma.subject.delete({ where: { id: sid } }).catch(() => {})
  }
  for (const uid of userIds) {
    const students = await prisma.student.findMany({ where: { parentId: uid }, select: { id: true } })
    const sids = students.map((s) => s.id)
    await rawPrisma.studentCredit.deleteMany({ where: { studentId: { in: sids } } })
    await rawPrisma.adminNotification.deleteMany({ where: { href: { in: sids.map((id) => `/admin/students/${id}`) } } }).catch(() => {})
    await rawPrisma.enrollment.deleteMany({ where: { studentId: { in: sids } } })
    await rawPrisma.booking.deleteMany({ where: { userId: uid } })
    await rawPrisma.student.deleteMany({ where: { parentId: uid } })
    await rawPrisma.user.delete({ where: { id: uid } }).catch(() => {})
  }
})
