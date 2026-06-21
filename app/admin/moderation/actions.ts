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

// Map an AI flag category to an Incident category + a sensible default severity.
function incidentCategoryFor(flagCategory: string | null | undefined): { category: string; severity: string } {
  switch (flagCategory) {
    case 'safeguarding': return { category: 'safeguarding', severity: 'high' }
    case 'abuse': return { category: 'behaviour', severity: 'high' }
    case 'poaching': return { category: 'other', severity: 'medium' }
    default: return { category: 'other', severity: 'medium' }
  }
}

type FlaggedSummary = { studentName: string | null; detail: string; flagCategory: string | null; flagSeverity: string | null }

// Pull a short, safe summary of the flagged item for an incident record.
async function summariseFlagged(kind: ModKind, id: string): Promise<FlaggedSummary> {
  if (kind === 'message') {
    const m = await prisma.message.findUnique({
      where: { id },
      select: { body: true, flagCategory: true, flagSeverity: true, flagReason: true, sender: { select: { name: true, role: true } }, conversation: { select: { student: { select: { firstName: true } } } } },
    })
    return {
      studentName: m?.conversation?.student?.firstName ?? null,
      detail: `Flagged ${m?.flagCategory ?? 'message'} from ${m?.sender?.name ?? 'a user'} (${m?.sender?.role ?? '?'}). ${m?.flagReason ?? ''} Content: "${(m?.body ?? '').slice(0, 200)}"`.trim(),
      flagCategory: m?.flagCategory ?? null,
      flagSeverity: m?.flagSeverity ?? null,
    }
  }
  if (kind === 'question' || kind === 'reply') {
    const item = kind === 'question'
      ? await prisma.question.findUnique({ where: { id }, select: { body: true, student: { select: { firstName: true } } } })
      : await prisma.questionReply.findUnique({ where: { id }, select: { body: true, question: { select: { student: { select: { firstName: true } } } } } })
    const studentName = kind === 'question'
      ? (item as { student?: { firstName?: string } } | null)?.student?.firstName ?? null
      : (item as { question?: { student?: { firstName?: string } } } | null)?.question?.student?.firstName ?? null
    return { studentName, detail: `Flagged ${kind}. Content: "${((item as { body?: string } | null)?.body ?? '').slice(0, 200)}"`, flagCategory: null, flagSeverity: null }
  }
  return { studentName: null, detail: `Flagged ${kind} (${id.slice(0, 8)}) escalated from moderation.`, flagCategory: null, flagSeverity: null }
}

// Admin decision on a flagged/held item.
//  - approve: it is safe; make it visible and clear the flag.
//  - resolve: acknowledged; mark reviewed (held items stay withheld).
//  - escalate: opens a safeguarding/behaviour Incident (/admin/incidents) and
//    alerts the safeguarding lead (email when SAFEGUARDING_LEAD_EMAIL is set),
//    plus the in-CRM notification. A real workflow, not just a re-ping.
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

  // Escalate now does real work: it opens a safeguarding/behaviour Incident
  // (visible at /admin/incidents) and alerts the safeguarding lead by email when
  // SAFEGUARDING_LEAD_EMAIL is configured, on top of the in-CRM notification.
  if (action === 'escalate') {
    const summary = await summariseFlagged(kind, id)
    const { category, severity } = incidentCategoryFor(summary.flagCategory)
    const inc = await prisma.incident.create({
      data: {
        studentName: summary.studentName,
        category,
        severity: summary.flagSeverity ?? severity,
        details: `Escalated from moderation by ${admin.name ?? 'admin'}. ${summary.detail}`,
        status: 'open',
        reportedById: admin.id,
      },
    })
    await logAudit({ actorId: admin.id, actorName: admin.name, action: 'incident.openFromModeration', target: inc.id, detail: `${category} / ${kind}` })

    const lead = process.env.SAFEGUARDING_LEAD_EMAIL
    if (lead && hasResend) {
      try {
        await sendEmail({
          to: lead,
          subject: `[Everest safeguarding] ${category} incident opened from moderation`,
          text: `A ${category} incident (severity ${summary.flagSeverity ?? severity}) was escalated from the moderation queue by ${admin.name ?? 'admin'}.\n\n${summary.detail}\n\nReview it: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/incidents`,
        })
      } catch { /* lead email is best-effort; the incident + in-CRM alert still stand */ }
    }

    await notifyAdmin({
      type: 'flag',
      title: `Incident opened from moderation: ${category}`,
      body: `${summary.detail.slice(0, 100)}${lead && hasResend ? ' · safeguarding lead emailed.' : ''}`,
      href: '/admin/incidents',
      refKey: `escalate-incident:${kind}:${id}:${Date.now()}`,
    })
  }

  revalidatePath('/admin/moderation')
  revalidatePath('/admin/incidents')
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
