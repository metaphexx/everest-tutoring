'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/session'
import { getStudentForUser } from '@/lib/student'
import { extractAssessmentsFromOutline } from '@/lib/school-materials'
import { moderateContent } from '@/lib/hub-moderation'
import { notifyAdmin } from '@/lib/admin-notify'

async function ownFile(userId: string, fileId: string) {
  return prisma.fileAttachment.findFirst({ where: { id: fileId, uploadedById: userId }, select: { id: true } })
}

export async function uploadCourseOutline(input: { subject: string; term?: string; fileId: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false, error: 'No student profile is linked to your account.' }
  if (!input.subject?.trim()) return { ok: false, error: 'Please choose a subject.' }
  if (!input.fileId || !(await ownFile(user.id, input.fileId))) return { ok: false, error: 'Please attach your course outline file.' }

  const outline = await prisma.studentCourseOutline.create({
    data: {
      studentId: student.id,
      subject: input.subject.trim(),
      term: input.term?.trim() || null,
      fileId: input.fileId,
      extractionStatus: 'pending',
    },
  })

  // Build the Assessment Tracker from the outline (placeholder extractor for now).
  const count = await extractAssessmentsFromOutline(outline.id)

  await notifyAdmin({
    type: 'system',
    title: `${student.firstName} ${student.lastName} uploaded a ${input.subject} course outline`,
    body: `${count} assessment${count === 1 ? '' : 's'} added to their tracker.`,
    href: `/admin/school-materials`,
    refKey: `outline:${outline.id}`,
  })

  revalidatePath('/student/school-materials')
  revalidatePath('/student')
  return { ok: true, id: outline.id, assessments: count }
}

export async function uploadSchoolDocument(input: { title: string; documentType: string; subject?: string; fileId: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false, error: 'No student profile is linked to your account.' }
  const title = input.title?.trim()
  if (!title) return { ok: false, error: 'Please give your document a name.' }
  if (!input.fileId || !(await ownFile(user.id, input.fileId))) return { ok: false, error: 'Please attach a file.' }

  // Moderate the title/description (file names are part of the moderated surface).
  const mod = await moderateContent(title)

  const doc = await prisma.schoolDocument.create({
    data: {
      studentId: student.id,
      title,
      documentType: input.documentType || 'other',
      subject: input.subject?.trim() || null,
      fileId: input.fileId,
      moderationStatus: mod.status,
    },
  })

  if (mod.status !== 'clear') {
    await notifyAdmin({
      type: 'flag',
      title: `Flagged document name from ${student.firstName} ${student.lastName}`,
      body: mod.result.reason ?? 'The AI moderator flagged this upload for review.',
      href: '/admin/moderation',
      refKey: `doc-flag:${doc.id}`,
    })
  }

  revalidatePath('/student/school-materials')
  revalidatePath('/student')
  return { ok: true, id: doc.id }
}

export async function deleteMaterial(input: { kind: 'outline' | 'document'; id: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false }

  if (input.kind === 'outline') {
    const o = await prisma.studentCourseOutline.findFirst({ where: { id: input.id, studentId: student.id }, select: { id: true } })
    if (!o) return { ok: false }
    await prisma.studentAssessment.deleteMany({ where: { outlineId: o.id } })
    await prisma.questionAttachment.deleteMany({ where: { outlineId: o.id } })
    await prisma.studentCourseOutline.delete({ where: { id: o.id } })
  } else {
    const d = await prisma.schoolDocument.findFirst({ where: { id: input.id, studentId: student.id }, select: { id: true } })
    if (!d) return { ok: false }
    await prisma.questionAttachment.deleteMany({ where: { documentId: d.id } })
    await prisma.schoolDocument.delete({ where: { id: d.id } })
  }

  revalidatePath('/student/school-materials')
  revalidatePath('/student')
  return { ok: true }
}
