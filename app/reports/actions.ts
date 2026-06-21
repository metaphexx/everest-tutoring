'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { draftReportComment } from '@/lib/elliot'

function effortFor(pct: number | null): string {
  if (pct === null) return 'Good'
  if (pct >= 90) return 'Excellent'
  if (pct >= 80) return 'Good'
  if (pct >= 70) return 'Satisfactory'
  return 'Needs focus'
}

async function gatherForReport(studentId: string, subjectId: string) {
  const [att, notes, student, subject] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, subjectId } }),
    prisma.lessonNote.findMany({ where: { subjectId }, orderBy: { classDate: 'desc' }, take: 3 }),
    prisma.student.findUnique({ where: { id: studentId }, select: { firstName: true } }),
    prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
  ])
  const total = att.length
  const ok = att.filter((a) => a.status === 'present' || a.status === 'late').length
  const pct = total > 0 ? Math.round((ok / total) * 100) : null
  return {
    pct,
    late: att.filter((a) => a.status === 'late').length,
    absent: att.filter((a) => a.status === 'absent').length,
    studentName: student?.firstName ?? 'The student',
    subjectName: subject?.name ?? 'class',
    notes: notes.map((n) => n.summary),
  }
}

export async function draftReport(input: { studentId: string; subjectId: string }) {
  await requireUser(['tutor'])
  const d = await gatherForReport(input.studentId, input.subjectId)
  const comment = await draftReportComment({
    studentName: d.studentName,
    subjectName: d.subjectName,
    attendancePct: d.pct,
    late: d.late,
    absent: d.absent,
    notes: d.notes,
  })
  return { comment, effort: effortFor(d.pct), attendancePct: d.pct }
}

export async function saveReport(input: { studentId: string; subjectId: string; effort: string; comment: string }) {
  const user = await requireUser(['tutor'])
  const comment = input.comment.trim()
  if (!comment) return { ok: false }
  const term = await prisma.term.findFirst({ where: { isActive: true } })
  if (!term) throw new Error('No active term')
  const d = await gatherForReport(input.studentId, input.subjectId)
  const existing = await prisma.report.findFirst({ where: { studentId: input.studentId, subjectId: input.subjectId, termId: term.id } })
  if (existing) {
    await prisma.report.update({ where: { id: existing.id }, data: { effort: input.effort, comment, attendancePct: d.pct, authorId: user.id } })
  } else {
    await prisma.report.create({
      data: { studentId: input.studentId, subjectId: input.subjectId, termId: term.id, effort: input.effort, comment, attendancePct: d.pct, authorId: user.id, published: false },
    })
  }
  revalidatePath('/tutor/reports')
  revalidatePath('/admin/reports')
  return { ok: true }
}

export async function setReportPublished(input: { id: string; published: boolean }) {
  await requireUser(['admin'])
  await prisma.report.update({ where: { id: input.id }, data: { published: input.published } })
  revalidatePath('/admin/reports')
  revalidatePath('/dashboard')
  return { ok: true }
}
