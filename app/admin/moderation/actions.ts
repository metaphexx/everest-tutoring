'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { notifyAdmin } from '@/lib/admin-notify'
import { hasResend } from '@/lib/notify'
import { sendEmail } from '@/lib/resend'

export type ModKind = 'message' | 'question' | 'reply' | 'document' | 'announcement'
export type ModAction = 'approve' | 'resolve' | 'escalate'

// Admin decision on a flagged/held item.
//  - approve: it is safe; make it visible and clear the flag.
//  - resolve: acknowledged; mark reviewed (held items stay withheld).
//  - escalate: needs further attention; flag for follow-up and re-alert.
export async function moderateAction(input: { kind: ModKind; id: string; action: ModAction }) {
  const admin = await requireUser(['admin'])
  const { kind, id, action } = input

  if (kind === 'message') {
    const data = action === 'approve'
      ? { flagged: false, blocked: false, flagReason: null, flagCategory: null, flagSeverity: null }
      : action === 'resolve'
        ? { flagged: false }
        : {}
    await prisma.message.update({ where: { id }, data })
    const msg = await prisma.message.findUnique({ where: { id }, select: { conversationId: true } })
    if (msg) {
      const flaggedCount = await prisma.message.count({ where: { conversationId: msg.conversationId, flagged: true } })
      await prisma.conversation.update({ where: { id: msg.conversationId }, data: { flaggedCount } })
    }
  } else {
    const status = action === 'approve' ? 'clear' : action === 'resolve' ? 'resolved' : 'needs_review'
    if (kind === 'question') {
      await prisma.question.update({ where: { id }, data: { moderationStatus: status, ...(action === 'approve' ? { blocked: false } : {}) } })
    } else if (kind === 'reply') {
      await prisma.questionReply.update({ where: { id }, data: { moderationStatus: status, ...(action === 'approve' ? { blocked: false } : {}) } })
    } else if (kind === 'document') {
      await prisma.schoolDocument.update({ where: { id }, data: { moderationStatus: status } })
    } else if (kind === 'announcement') {
      await prisma.announcement.update({ where: { id }, data: { moderationStatus: status } })
    }
  }

  await logAudit({ actorId: admin.id, actorName: admin.name, action: `moderation.${action}`, target: `${kind}:${id}` })
  if (action === 'escalate') {
    await notifyAdmin({ type: 'flag', title: `Escalated ${kind} for review`, body: `Marked for follow-up by ${admin.name ?? 'admin'}.`, href: '/admin/moderation', refKey: `escalate:${kind}:${id}:${Date.now()}` })
  }

  revalidatePath('/admin/moderation')
  return { ok: true }
}

// Admin chooses to inform the parent that a withheld message was sent in their
// child's tutoring chat. Preview-gated email + logged; deduped per message.
export async function reportToParent(input: { messageId: string }) {
  const admin = await requireUser(['admin'])
  const msg = await prisma.message.findUnique({
    where: { id: input.messageId },
    include: {
      sender: { select: { name: true, role: true } },
      conversation: { include: { parent: { select: { id: true, name: true, email: true } }, student: { select: { firstName: true } } } },
    },
  })
  if (!msg) return { ok: false, error: 'Message not found.' }
  const parent = msg.conversation.parent
  if (!parent?.email) return { ok: false, error: 'No parent email on file for this conversation.' }

  const childName = msg.conversation.student?.firstName ?? 'your child'
  const senderRole = msg.sender.role === 'tutor' ? 'a tutor' : msg.sender.role === 'student' ? 'a student' : 'a member'
  const subject = `A message in ${childName}'s tutoring chat was withheld for review`
  const text = `Hi ${parent.name ?? 'there'},

Our automatic screening withheld a message sent by ${senderRole} in ${childName}'s Everest tutoring conversation, because it contained language that does not meet our community standards. The message was not delivered, and the Everest team is reviewing it.

We are letting you know as part of keeping the learning environment safe. There is nothing you need to do. If you would like to discuss it, just reply to this email or contact the Everest team.

The Everest Tutoring team`

  let status: 'sent' | 'failed' | 'preview' = 'preview'
  let error: string | null = null
  if (hasResend) {
    try { await sendEmail({ to: parent.email, subject, text }); status = 'sent' } catch (e) { status = 'failed'; error = e instanceof Error ? e.message : String(e) }
  }
  await prisma.notification.create({
    data: { userId: parent.id, channel: 'email', type: 'moderation_report', recipient: parent.email, subject, body: text, status, refKey: `report-parent:${msg.id}`, error },
  })
  await prisma.message.update({ where: { id: msg.id }, data: { reportedToParentAt: new Date() } })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'moderation.reportToParent', target: msg.id, detail: `Notified ${parent.email}` })

  revalidatePath('/admin/moderation')
  return { ok: true }
}
