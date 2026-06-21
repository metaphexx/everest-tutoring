'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/session'
import { getStudentForUser } from '@/lib/student'
import { postReply } from '@/lib/questions'

// A student replying to a question: their own, or a classmate's question that has
// been shared with the class (collaborative discussion).
export async function addStudentReply(input: { questionId: string; body: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false, error: 'No student profile is linked to your account.' }
  const body = input.body.trim()
  if (body.length < 2) return { ok: false, error: 'Please write a little more.' }

  const q = await prisma.question.findUnique({ where: { id: input.questionId }, select: { id: true, studentId: true, classId: true, visibility: true, blocked: true } })
  if (!q || q.blocked) return { ok: false, error: 'That question is not available.' }

  const isOwner = q.studentId === student.id
  if (!isOwner) {
    // A classmate may join in only on questions shared with a class they are in.
    const inClass = q.visibility === 'public_to_class' &&
      (await prisma.enrollment.findFirst({ where: { studentId: student.id, subjectId: q.classId, status: 'active' }, select: { id: true } })) !== null
    if (!inClass) return { ok: false, error: 'You can only reply to your own or your class questions.' }
  }

  const res = await postReply({ questionId: q.id, authorId: user.id, authorName: user.name, body, isTutor: false, isOwner })
  revalidatePath(`/student/questions/${q.id}`)
  revalidatePath('/tutor/questions')
  return { ok: true, held: res.blocked }
}

// "I have this question too" - toggle for a class question the student can see.
export async function toggleReaction(input: { questionId: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false }

  const q = await prisma.question.findUnique({ where: { id: input.questionId }, select: { id: true, studentId: true, classId: true, visibility: true, blocked: true } })
  if (!q || q.blocked) return { ok: false }
  // Visible to this student if it is theirs, or shared with a class they are in.
  const own = q.studentId === student.id
  const inClass = q.visibility === 'public_to_class' &&
    (await prisma.enrollment.findFirst({ where: { studentId: student.id, subjectId: q.classId, status: 'active' }, select: { id: true } })) !== null
  if (!own && !inClass) return { ok: false }

  const existing = await prisma.questionReaction.findUnique({ where: { questionId_studentId: { questionId: q.id, studentId: student.id } } })
  if (existing) {
    await prisma.questionReaction.delete({ where: { id: existing.id } })
  } else {
    await prisma.questionReaction.create({ data: { questionId: q.id, studentId: student.id } })
  }
  revalidatePath(`/student/questions/${q.id}`)
  return { ok: true, reacted: !existing }
}

// The question owner marks a tutor reply as helpful.
export async function markReplyHelpful(input: { replyId: string }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false }

  const reply = await prisma.questionReply.findUnique({ where: { id: input.replyId }, include: { question: { select: { id: true, studentId: true } } } })
  if (!reply || reply.question.studentId !== student.id || !reply.isTutor) return { ok: false }
  await prisma.questionReply.update({ where: { id: reply.id }, data: { helpful: !reply.helpful } })
  revalidatePath(`/student/questions/${reply.question.id}`)
  return { ok: true, helpful: !reply.helpful }
}

// The student marks their own question solved (or reopens it).
export async function setQuestionSolved(input: { questionId: string; solved: boolean }) {
  const user = await requireStudent()
  const student = await getStudentForUser(user.id)
  if (!student) return { ok: false }
  const q = await prisma.question.findFirst({ where: { id: input.questionId, studentId: student.id }, select: { id: true } })
  if (!q) return { ok: false }
  await prisma.question.update({ where: { id: q.id }, data: { status: input.solved ? 'solved' : 'follow_up_needed' } })
  revalidatePath(`/student/questions/${q.id}`)
  revalidatePath('/tutor/questions')
  return { ok: true }
}
