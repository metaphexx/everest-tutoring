'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { sendAbsenceAlert } from '@/lib/notify'

const VALID_STATUS = ['present', 'late', 'absent', 'excused']

// A tutor may only touch their own classes; admins may touch any.
async function assertOwnsClass(subjectId: string) {
  const user = await requireUser(['tutor'])
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { tutorId: true },
  })
  if (!subject) throw new Error('Class not found')
  if (user.role !== 'admin' && subject.tutorId !== user.id) {
    throw new Error('You are not assigned to this class')
  }
  return user
}

export async function markAttendance(input: {
  subjectId: string
  studentId: string
  dateStr: string // yyyy-MM-dd
  status: string
}) {
  const user = await assertOwnsClass(input.subjectId)
  if (!VALID_STATUS.includes(input.status)) throw new Error('Invalid status')
  const classDate = new Date(`${input.dateStr}T00:00:00`)

  await prisma.attendance.upsert({
    where: {
      studentId_subjectId_classDate: {
        studentId: input.studentId,
        subjectId: input.subjectId,
        classDate,
      },
    },
    update: { status: input.status, markedById: user.id },
    create: {
      studentId: input.studentId,
      subjectId: input.subjectId,
      classDate,
      status: input.status,
      markedById: user.id,
    },
  })

  // Notify the parent when a student is marked absent (deduped in lib/notify).
  if (input.status === 'absent') {
    await sendAbsenceAlert({ studentId: input.studentId, subjectId: input.subjectId, classDate })
  }

  revalidatePath('/tutor')
  return { ok: true }
}

export async function saveLessonNote(input: {
  subjectId: string
  dateStr: string
  summary: string
  homework?: string
}) {
  const user = await assertOwnsClass(input.subjectId)
  const summary = input.summary.trim()
  if (!summary) throw new Error('Please add a lesson summary')
  const classDate = new Date(`${input.dateStr}T00:00:00`)
  const homework = input.homework?.trim() || null

  await prisma.lessonNote.upsert({
    where: { subjectId_classDate: { subjectId: input.subjectId, classDate } },
    update: { summary, homework, authorId: user.id },
    create: { subjectId: input.subjectId, classDate, summary, homework, authorId: user.id },
  })

  revalidatePath('/tutor')
  return { ok: true }
}
