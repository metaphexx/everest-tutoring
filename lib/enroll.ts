import { prisma } from '@/lib/db'

export type SeatResult = { seated: boolean; subjectId: string; clash?: boolean }

/**
 * Seat a student into a class if there's room, otherwise waitlist them.
 *
 * This is the single enrollment write-path at payment time, so capacity is
 * enforced HERE - a class can never exceed its cap even if it filled while the
 * family was in Stripe checkout. The count + create run in one transaction;
 * SQLite serialises writes so this is race-safe in dev. On Postgres, add a
 * SELECT ... FOR UPDATE on the subject row (or a partial unique index) to close
 * the read-committed window - see DEV_NOTES.md.
 *
 * An overflow (paid but no seat) is recorded on the waitlist with the bookingId
 * so admin can see it was a paid family owed a seat (no-refund policy).
 */
export async function seatOrWaitlist(input: {
  studentId: string
  subjectId: string
  bookingId: string
  parentId: string
  parentName: string | null
  studentName: string | null
}): Promise<SeatResult> {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.findUnique({ where: { id: input.subjectId }, select: { capacity: true, dayOfWeek: true, startTime: true } })

    // Already actively enrolled in this exact subject? A student can only be in
    // each class once, so treat a repeat as a no-op rather than a duplicate row.
    const already = await tx.enrollment.findFirst({
      where: { studentId: input.studentId, subjectId: input.subjectId, status: 'active' },
      select: { id: true },
    })
    if (already) return { seated: true, subjectId: input.subjectId }

    // Timetable clash: don't seat a student into two classes in the same slot.
    if (subject) {
      const clash = await tx.enrollment.findFirst({
        where: {
          studentId: input.studentId,
          status: 'active',
          subjectId: { not: input.subjectId },
          subject: { dayOfWeek: subject.dayOfWeek, startTime: subject.startTime },
        },
        select: { id: true },
      })
      if (clash) return { seated: false, subjectId: input.subjectId, clash: true }
    }

    const taken = await tx.enrollment.count({ where: { subjectId: input.subjectId, status: 'active' } })

    if (subject && taken >= subject.capacity) {
      await tx.waitlist.create({
        data: {
          subjectId: input.subjectId,
          parentId: input.parentId,
          parentName: input.parentName,
          studentName: input.studentName,
          studentId: input.studentId,
          bookingId: input.bookingId,
          status: 'waiting',
        },
      })
      return { seated: false, subjectId: input.subjectId }
    }

    await tx.enrollment.create({
      data: { studentId: input.studentId, subjectId: input.subjectId, bookingId: input.bookingId, status: 'active' },
    })
    return { seated: true, subjectId: input.subjectId }
  })
}
