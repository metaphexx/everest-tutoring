'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/session'
import { getStudentForUser } from '@/lib/student'
import { moderateContent } from '@/lib/hub-moderation'
import { notifyAdmin } from '@/lib/admin-notify'

export type AttachmentInput = {
  sourceType: 'course_outline' | 'school_document' | 'direct_upload'
  outlineId?: string
  documentId?: string
  fileId?: string
}

export type CreateQuestionInput = {
  classId: string
  body: string
  visibility: 'private_to_tutor' | 'public_to_class'
  attachments?: AttachmentInput[]
}

function deriveTitle(body: string): string {
  const firstLine = body.split('\n').map((s) => s.trim()).find(Boolean) ?? body.trim()
  const t = firstLine.slice(0, 70)
  return firstLine.length > 70 ? `${t.trimEnd()}…` : t
}

export async function createQuestion(input: CreateQuestionInput) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false, error: 'No student profile is linked to your account.' }

  const body = input.body.trim()
  if (body.length < 3) return { ok: false, error: 'Please add a bit more detail about what you need help with.' }
  if (body.length > 4000) return { ok: false, error: 'That question is a little long. Please shorten it.' }

  const visibility = input.visibility === 'public_to_class' ? 'public_to_class' : 'private_to_tutor'

  // The class must be one the student is actively enrolled in this term.
  const enrolment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, subjectId: input.classId, status: 'active', subject: { term: { isActive: true } } },
    include: { subject: { select: { name: true } } },
  })
  if (!enrolment) return { ok: false, error: 'Please choose one of your classes.' }

  // Verify any attached school materials / files belong to this student.
  const verified: AttachmentInput[] = []
  for (const a of input.attachments ?? []) {
    if (a.sourceType === 'course_outline' && a.outlineId) {
      const o = await prisma.studentCourseOutline.findFirst({ where: { id: a.outlineId, studentId: student.id }, select: { id: true } })
      if (o) verified.push({ sourceType: 'course_outline', outlineId: o.id })
    } else if (a.sourceType === 'school_document' && a.documentId) {
      const d = await prisma.schoolDocument.findFirst({ where: { id: a.documentId, studentId: student.id }, select: { id: true } })
      if (d) verified.push({ sourceType: 'school_document', documentId: d.id })
    } else if (a.sourceType === 'direct_upload' && a.fileId) {
      const f = await prisma.fileAttachment.findFirst({ where: { id: a.fileId, uploadedById: user.id }, select: { id: true } })
      if (f) verified.push({ sourceType: 'direct_upload', fileId: f.id })
    }
  }

  const mod = await moderateContent(body)

  const question = await prisma.question.create({
    data: {
      studentId: student.id,
      classId: input.classId,
      title: deriveTitle(body),
      body,
      visibility,
      status: 'waiting_for_tutor',
      topic: enrolment.subject.name,
      moderationStatus: mod.status,
      blocked: mod.blocked,
      attachments: verified.length
        ? {
            create: verified.map((a) => ({
              sourceType: a.sourceType,
              outlineId: a.outlineId,
              documentId: a.documentId,
              fileId: a.fileId,
            })),
          }
        : undefined,
    },
  })

  // Alert admin on anything the moderator flagged (held content first).
  if (mod.blocked) {
    await notifyAdmin({
      type: 'flag',
      title: `Held student question (${mod.result.category ?? 'review'}) from ${student.firstName} ${student.lastName}`,
      body: `Withheld pending review. ${mod.result.reason ?? ''}`.trim(),
      href: '/admin/moderation',
      refKey: `q-flag:${question.id}`,
    })
  } else if (mod.status === 'flagged') {
    await notifyAdmin({
      type: 'flag',
      title: `Flagged student question (${mod.result.category ?? 'review'}) from ${student.firstName} ${student.lastName}`,
      body: mod.result.reason ?? 'The AI moderator flagged this question for review.',
      href: '/admin/moderation',
      refKey: `q-flag:${question.id}`,
    })
  }

  revalidatePath('/student')
  revalidatePath('/student/ask')
  revalidatePath(`/student/classes/${input.classId}`)
  revalidatePath('/tutor/questions')
  revalidatePath('/admin/questions')

  return { ok: true, id: question.id, held: mod.blocked }
}
