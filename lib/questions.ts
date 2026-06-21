import { prisma } from '@/lib/db'
import { moderateContent } from '@/lib/hub-moderation'
import { notifyAdmin } from '@/lib/admin-notify'
import { logAudit } from '@/lib/audit'

/**
 * Post a reply to a question, from either a student or a tutor. Runs the body
 * through the shared moderation pipeline: a high-severity abuse/poaching reply is
 * blocked (withheld from the class), and a tutor who does so is auto-suspended -
 * the same safety behaviour as the parent<->tutor chat.
 */
export async function postReply(input: {
  questionId: string
  authorId: string
  authorName?: string | null
  body: string
  isTutor: boolean
  // Whether a student replier owns the question. Only the owner's reply bumps an
  // answered question to "follow-up needed"; a classmate's reply is peer discussion
  // and leaves the status alone.
  isOwner?: boolean
}) {
  const mod = await moderateContent(input.body)
  const lockTutor = input.isTutor && mod.blocked

  const reply = await prisma.questionReply.create({
    data: {
      questionId: input.questionId,
      authorId: input.authorId,
      body: input.body,
      isTutor: input.isTutor,
      moderationStatus: mod.status,
      blocked: mod.blocked,
    },
  })

  if (lockTutor) {
    await prisma.user.update({
      where: { id: input.authorId },
      data: { suspended: true, suspendedAt: new Date(), suspendedReason: `Auto-locked: ${mod.result.category} reply blocked. ${mod.result.reason ?? ''}`.trim().slice(0, 240) },
    })
    await logAudit({ actorId: input.authorId, actorName: input.authorName, action: 'tutor.autoSuspend', target: input.questionId, detail: `${mod.result.category}: ${input.body.slice(0, 80)}` })
  }

  // Advance the question status. A tutor reply marks it answered; a later student
  // reply on an answered question flags it as needing follow-up.
  const q = await prisma.question.findUnique({ where: { id: input.questionId }, select: { status: true, studentId: true, classId: true } })
  if (q && !mod.blocked) {
    let status = q.status
    if (input.isTutor) {
      if (status !== 'solved') status = 'tutor_replied'
    } else if (input.isOwner && (status === 'tutor_replied' || status === 'solved')) {
      status = 'follow_up_needed'
    }
    if (status !== q.status) {
      await prisma.question.update({ where: { id: input.questionId }, data: { status } })
    }
  }

  if (mod.blocked) {
    await notifyAdmin({
      type: 'flag',
      title: `Held ${input.isTutor ? 'tutor' : 'student'} reply (${mod.result.category ?? 'review'})${lockTutor ? ' - tutor account locked' : ''}`,
      body: `Withheld from the class. ${mod.result.reason ?? ''}`.trim(),
      href: '/admin/moderation',
      refKey: `reply-flag:${reply.id}`,
    })
  } else if (mod.status === 'flagged') {
    await notifyAdmin({
      type: 'flag',
      title: `Flagged ${input.isTutor ? 'tutor' : 'student'} reply (${mod.result.category ?? 'review'})`,
      body: mod.result.reason ?? 'The AI moderator flagged this reply for review.',
      href: '/admin/moderation',
      refKey: `reply-flag:${reply.id}`,
    })
  }

  return { reply, blocked: mod.blocked }
}
