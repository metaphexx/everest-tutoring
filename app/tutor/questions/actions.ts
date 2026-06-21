'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { postReply } from '@/lib/questions'
import { suggestQuestionAnswer } from '@/lib/ai-assist'

// Confirm the signed-in tutor (or an admin) is responsible for a question's class.
async function ownsQuestion(questionId: string, user: { id: string; role: string }) {
  const q = await prisma.question.findUnique({ where: { id: questionId }, include: { class: { select: { tutorId: true } } } })
  if (!q) return null
  if (user.role === 'admin' || q.class.tutorId === user.id) return q
  return null
}

export async function tutorReply(input: { questionId: string; body: string }) {
  const user = await requireUser(['tutor'])
  const body = input.body.trim()
  if (body.length < 2) return { ok: false, error: 'Please write a reply.' }
  const q = await ownsQuestion(input.questionId, user)
  if (!q) return { ok: false, error: 'You can only answer questions in your classes.' }

  const res = await postReply({ questionId: q.id, authorId: user.id, authorName: user.name, body, isTutor: true })
  revalidatePath('/tutor/questions')
  revalidatePath(`/student/questions/${q.id}`)
  return { ok: true, held: res.blocked }
}

export async function pinReply(input: { replyId: string }) {
  const user = await requireUser(['tutor'])
  const reply = await prisma.questionReply.findUnique({ where: { id: input.replyId }, include: { question: { include: { class: { select: { tutorId: true } } } } } })
  if (!reply) return { ok: false }
  if (user.role !== 'admin' && reply.question.class.tutorId !== user.id) return { ok: false }

  const pinned = !reply.pinned
  await prisma.$transaction([
    // Only one pinned answer per question for clarity.
    prisma.questionReply.updateMany({ where: { questionId: reply.questionId }, data: { pinned: false } }),
    prisma.questionReply.update({ where: { id: reply.id }, data: { pinned } }),
    prisma.question.update({ where: { id: reply.questionId }, data: { pinnedReplyId: pinned ? reply.id : null } }),
  ])
  revalidatePath('/tutor/questions')
  revalidatePath(`/student/questions/${reply.questionId}`)
  return { ok: true, pinned }
}

// AI-suggested first-draft answer for the tutor to edit (never auto-sent).
export async function suggestAnswer(input: { questionId: string }) {
  const user = await requireUser(['tutor'])
  const owned = await ownsQuestion(input.questionId, user)
  if (!owned) return { ok: false, error: 'Not your class.' }
  const q = await prisma.question.findUnique({ where: { id: input.questionId }, include: { class: { select: { name: true, yearLevel: true } } } })
  if (!q) return { ok: false, error: 'Question not found.' }
  const text = await suggestQuestionAnswer({ title: q.title, body: q.body, subject: q.class.name, yearLevel: q.class.yearLevel })
  if (!text) return { ok: false, error: 'Could not draft a suggestion right now.' }
  return { ok: true, text }
}

export async function setQuestionStatus(input: { questionId: string; status: string }) {
  const user = await requireUser(['tutor'])
  const q = await ownsQuestion(input.questionId, user)
  if (!q) return { ok: false }
  const allowed = ['waiting_for_tutor', 'tutor_replied', 'follow_up_needed', 'solved']
  if (!allowed.includes(input.status)) return { ok: false }
  await prisma.question.update({ where: { id: q.id }, data: { status: input.status } })
  revalidatePath('/tutor/questions')
  revalidatePath(`/student/questions/${q.id}`)
  return { ok: true }
}
