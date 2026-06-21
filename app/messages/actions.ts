'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { moderateMessage } from '@/lib/moderation'
import { summarizeConversation, supportTags } from '@/lib/messaging'
import { notifyAdmin } from '@/lib/admin-notify'
import { logAudit } from '@/lib/audit'
import { suggestSupportReply } from '@/lib/ai-assist'

async function postMessage(conversationId: string, senderId: string, body: string, fileIds: string[] = []) {
  const mod = await moderateMessage(body)
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true, role: true } })

  // Screening, applied to every message before anyone sees it:
  //  - Bad/foul language (abuse) is WITHHELD from the recipient, at any severity,
  //    whoever sent it. It is kept for admin evidence only.
  //  - A tutor trying to poach is also withheld.
  //  - Safeguarding is never hidden (it must reach the team), only flagged.
  //  - A tutor who sends high-severity abuse or poaching is auto-suspended.
  const isTutor = sender?.role === 'tutor'
  const high = mod.severity === 'high'
  const withhold = mod.flagged && (mod.category === 'abuse' || (mod.category === 'poaching' && isTutor))
  const lockTutor = isTutor && high && (mod.category === 'abuse' || mod.category === 'poaching')

  const created = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      body,
      flagged: mod.flagged,
      flagCategory: mod.category,
      flagSeverity: mod.severity,
      flagReason: mod.reason,
      blocked: withhold,
    },
  })

  // Link any uploaded attachments (e.g. a photo of worked solutions) the sender owns.
  if (fileIds.length > 0) {
    await prisma.fileAttachment.updateMany({
      where: { id: { in: fileIds }, uploadedById: senderId, messageId: null },
      data: { messageId: created.id },
    })
  }

  if (lockTutor) {
    await prisma.user.update({
      where: { id: senderId },
      data: { suspended: true, suspendedAt: new Date(), suspendedReason: `Auto-locked: ${mod.category} message blocked. ${mod.reason ?? ''}`.trim().slice(0, 240) },
    })
    await logAudit({ actorId: senderId, actorName: sender?.name, action: 'tutor.autoSuspend', target: senderId, detail: `${mod.category}: ${body.slice(0, 80)}` })
  }

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
  const msgs = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const flaggedCount = msgs.filter((m) => m.flagged).length
  const summary = await summarizeConversation(msgs.map((m) => ({ sender: m.sender.name ?? m.sender.role, body: m.body })))
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), flaggedCount, aiSummary: summary },
  })

  // Alert the admin team. Withheld first (urgent), then flags, then new messages.
  const who = sender?.name ?? (isTutor ? 'A tutor' : 'Someone')
  if (withhold) {
    await notifyAdmin({
      type: 'flag',
      title: `Withheld ${mod.category} message from ${who}${lockTutor ? ' - tutor account locked' : ''}`,
      body: `Held from the recipient pending review. You can report it to the parent. ${mod.reason ?? ''}`.trim(),
      href: '/admin/moderation',
      refKey: `flag:${created.id}`,
    })
  } else if (created.flagged) {
    await notifyAdmin({
      type: 'flag',
      title: `Flagged message (${mod.category ?? 'review'}) from ${who}`,
      body: mod.reason ?? 'The AI moderator flagged this message for review.',
      href: '/admin/messages',
      refKey: `flag:${created.id}`,
    })
  } else if (sender?.role === 'parent') {
    await notifyAdmin({
      type: 'support',
      title: `New ${conv?.type === 'support' ? 'support' : 'chat'} message from ${who}`,
      body: conv?.topic ?? body.slice(0, 80),
      href: '/admin/messages',
      refKey: `msg:${created.id}`,
    })
  }
}

function revalidateAll() {
  revalidatePath('/dashboard/messages')
  revalidatePath('/tutor/messages')
  revalidatePath('/admin/messages')
}

// Is this user allowed to post in a conversation? Parent, assigned tutor and admin
// always; for a student-type thread, the student whose account owns the linked
// Student row is also a participant.
async function isParticipant(conv: { parentId: string; tutorId: string | null; studentId: string | null }, user: { id: string; role: string }) {
  if (user.role === 'admin' || conv.parentId === user.id || conv.tutorId === user.id) return true
  if (conv.studentId) {
    const owned = await prisma.student.findFirst({ where: { id: conv.studentId, userId: user.id }, select: { id: true } })
    if (owned) return true
  }
  return false
}

export async function sendMessage(input: { conversationId: string; body: string; fileIds?: string[] }) {
  const user = await requireUser()
  const body = input.body.trim()
  const fileIds = input.fileIds ?? []
  // Allow an image-only message (e.g. just a photo of worked solutions).
  if (!body && fileIds.length === 0) return { ok: false }
  const conv = await prisma.conversation.findUnique({ where: { id: input.conversationId } })
  if (!conv) throw new Error('Conversation not found')
  if (!(await isParticipant(conv, user))) throw new Error('You are not a participant in this conversation')
  await postMessage(conv.id, user.id, body, fileIds)
  revalidateAll()
  revalidatePath('/student/messages')
  return { ok: true }
}

// A student starting (or continuing) a monitored chat with their class tutor.
export async function startStudentThread(input: { subjectId: string; body: string }) {
  const user = await requireUser(['student'])
  const body = input.body.trim()
  if (!body) return { ok: false }
  const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true, parentId: true } })
  if (!student) return { ok: false, error: 'No student profile is linked to your account.' }
  // The class must be one the student is actively enrolled in.
  const enrolment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, subjectId: input.subjectId, status: 'active', subject: { term: { isActive: true } } },
    include: { subject: { select: { tutorId: true } } },
  })
  if (!enrolment) return { ok: false, error: 'Please choose one of your classes.' }

  let conv = await prisma.conversation.findFirst({
    where: { type: 'student', studentId: student.id, subjectId: input.subjectId },
  })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { type: 'student', parentId: student.parentId, tutorId: enrolment.subject.tutorId ?? null, subjectId: input.subjectId, studentId: student.id },
    })
  }
  await postMessage(conv.id, user.id, body)
  revalidateAll()
  revalidatePath('/student/messages')
  return { ok: true, conversationId: conv.id }
}

export async function startTutorThread(input: { subjectId: string; studentId: string; body: string }) {
  const user = await requireUser(['parent'])
  const body = input.body.trim()
  if (!body) return { ok: false }
  const subject = await prisma.subject.findUnique({ where: { id: input.subjectId }, select: { tutorId: true } })
  let conv = await prisma.conversation.findFirst({
    where: { type: 'tutor', parentId: user.id, subjectId: input.subjectId, studentId: input.studentId },
  })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { type: 'tutor', parentId: user.id, tutorId: subject?.tutorId ?? null, subjectId: input.subjectId, studentId: input.studentId },
    })
  }
  await postMessage(conv.id, user.id, body)
  revalidateAll()
  return { ok: true, conversationId: conv.id }
}

export async function startSupportThread(input: { topic: string; body: string }) {
  const user = await requireUser(['parent'])
  const body = input.body.trim()
  if (!body) return { ok: false }
  const conv = await prisma.conversation.create({
    data: { type: 'support', parentId: user.id, topic: input.topic || 'General enquiry', aiTags: supportTags(`${input.topic} ${body}`) },
  })
  await postMessage(conv.id, user.id, body)
  revalidateAll()
  return { ok: true, conversationId: conv.id }
}

// Admin support triage: classify the latest parent message and draft a reply.
export async function suggestSupportDraft(input: { conversationId: string }) {
  await requireUser(['admin'])
  const conv = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    include: { messages: { include: { sender: { select: { role: true } } }, orderBy: { createdAt: 'desc' }, take: 6 } },
  })
  if (!conv) return { ok: false, error: 'Conversation not found.' }
  const lastInbound = conv.messages.find((m) => m.sender.role !== 'admin')
  if (!lastInbound) return { ok: false, error: 'No message to reply to yet.' }
  const res = await suggestSupportReply({ topic: conv.topic ?? 'General enquiry', body: lastInbound.body })
  if (!res.draft) return { ok: false, error: 'Could not draft a reply right now.' }
  return { ok: true, category: res.category, draft: res.draft }
}

export async function resolveConversation(input: { conversationId: string }) {
  await requireUser(['admin'])
  await prisma.conversation.update({ where: { id: input.conversationId }, data: { status: 'resolved' } })
  revalidateAll()
  return { ok: true }
}

// Admin override: release an AI-flagged message that's actually fine (clears the
// flag and recomputes the conversation's flagged count).
export async function releaseFlag(input: { messageId: string }) {
  const admin = await requireUser(['admin'])
  const msg = await prisma.message.findUnique({ where: { id: input.messageId }, select: { conversationId: true, body: true, flagged: true } })
  if (!msg || !msg.flagged) return { ok: false }
  await prisma.message.update({ where: { id: input.messageId }, data: { flagged: false, flagReason: null, flagCategory: null, flagSeverity: null } })
  const flaggedCount = await prisma.message.count({ where: { conversationId: msg.conversationId, flagged: true } })
  await prisma.conversation.update({ where: { id: msg.conversationId }, data: { flaggedCount } })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'message.releaseFlag', target: msg.conversationId, detail: msg.body.slice(0, 80) })
  revalidateAll()
  return { ok: true }
}

// Flag a conversation as a priority complaint/escalation.
export async function setConversationPriority(input: { conversationId: string; value: boolean }) {
  await requireUser(['admin'])
  await prisma.conversation.update({ where: { id: input.conversationId }, data: { priority: input.value } })
  revalidateAll()
  return { ok: true, value: input.value }
}
