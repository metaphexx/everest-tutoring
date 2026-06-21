'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'
import { hasResend, hasTwilio } from '@/lib/notify'
import { notifyAdmin } from '@/lib/admin-notify'
import { sendSeatOffer } from '@/lib/waitlist'
import { inQuietHours } from '@/lib/comms'
import { logAudit } from '@/lib/audit'

// We cancel a session (e.g. tutor sick): notify every enrolled family and offer
// a make-up. Preview mode logs without sending, like the rest of the comms layer.
export async function cancelSession(input: { subjectId: string; dateLabel: string; reason: string }) {
  const admin = await requireUser(['admin'])
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    include: { enrollments: { where: { status: 'active' }, include: { student: { include: { parent: true } } } } },
  })
  if (!subject) return { ok: false, notified: 0 }

  const parents = new Map<string, { name: string | null; email: string | null; phone: string | null; emailOptOut: boolean; smsOptOut: boolean }>()
  for (const e of subject.enrollments) parents.set(e.student.parentId, e.student.parent)

  const label = `Y${subject.yearLevel} ${subject.name}`
  const body = `Heads up: the ${label} class (${input.dateLabel}) is cancelled${input.reason ? ` - ${input.reason}` : ''}. We'll arrange a make-up class and be in touch. Sorry for the inconvenience.`

  for (const p of parents.values()) {
    if (p.email && !p.emailOptOut) {
      let status = 'preview'
      if (hasResend) { try { await sendEmail({ to: p.email, subject: `Class cancelled: ${subject.name}`, text: body }); status = 'sent' } catch { status = 'failed' } }
      await prisma.notification.create({ data: { channel: 'email', type: 'cancellation', recipient: p.email, subject: `Class cancelled: ${subject.name}`, body, status } })
    }
    if (p.phone && !p.smsOptOut) {
      let status = 'preview'
      const sms = `${body} - Everest Tutoring`
      if (hasTwilio) { try { await sendSMS(p.phone, sms); status = 'sent' } catch { status = 'failed' } }
      await prisma.notification.create({ data: { channel: 'sms', type: 'cancellation', recipient: p.phone, body: sms, status } })
    }
  }

  await notifyAdmin({
    type: 'system',
    title: `Class cancelled: ${label}`,
    body: `${parents.size} famil${parents.size === 1 ? 'y' : 'ies'} notified for ${input.dateLabel}.`,
    href: '/admin/classes',
  })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'class.cancel', target: label, detail: `${input.dateLabel}${input.reason ? ` - ${input.reason}` : ''}` })
  revalidatePath('/admin/communications')
  return { ok: true, notified: parents.size }
}

// Tutor away: assign a substitute for a session instead of cancelling. Records
// the substitution and notifies enrolled families (preview until comms live;
// SMS respects quiet hours).
export async function assignSubstitute(input: { subjectId: string; substituteTutorId?: string; substituteName: string; dateLabel: string; reason?: string }) {
  const admin = await requireUser(['admin'])
  if (!input.substituteName.trim() || !input.dateLabel.trim()) return { ok: false, notified: 0 }
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    include: { enrollments: { where: { status: 'active' }, include: { student: { include: { parent: true } } } } },
  })
  if (!subject) return { ok: false, notified: 0 }

  await prisma.substitution.create({
    data: {
      subjectId: input.subjectId,
      substituteTutorId: input.substituteTutorId || null,
      substituteName: input.substituteName.trim(),
      dateLabel: input.dateLabel.trim(),
      reason: input.reason?.trim() || null,
      createdById: admin.id,
    },
  })

  const parents = new Map<string, { name: string | null; email: string | null; phone: string | null; emailOptOut: boolean; smsOptOut: boolean }>()
  for (const e of subject.enrollments) parents.set(e.student.parentId, e.student.parent)
  const label = `Y${subject.yearLevel} ${subject.name}`
  const body = `Heads up: ${input.substituteName.trim()} will be covering the ${label} class (${input.dateLabel.trim()})${input.reason ? ` - ${input.reason.trim()}` : ''}. Same time and place.`

  for (const p of parents.values()) {
    if (p.email && !p.emailOptOut) {
      let status = 'preview'
      if (hasResend) { try { await sendEmail({ to: p.email, subject: `Substitute tutor: ${subject.name}`, text: body }); status = 'sent' } catch { status = 'failed' } }
      await prisma.notification.create({ data: { channel: 'email', type: 'substitution', recipient: p.email, subject: `Substitute tutor: ${subject.name}`, body, status } })
    }
    if (p.phone && !p.smsOptOut && !inQuietHours()) {
      let status = 'preview'
      const sms = `${body} - Everest Tutoring`
      if (hasTwilio) { try { await sendSMS(p.phone, sms); status = 'sent' } catch { status = 'failed' } }
      await prisma.notification.create({ data: { channel: 'sms', type: 'substitution', recipient: p.phone, body: sms, status } })
    }
  }

  await notifyAdmin({ type: 'system', title: `Substitute assigned: ${label}`, body: `${input.substituteName.trim()} covering ${input.dateLabel.trim()}. ${parents.size} famil${parents.size === 1 ? 'y' : 'ies'} notified.`, href: `/admin/classes/${input.subjectId}` })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'class.substitute', target: label, detail: `${input.substituteName.trim()} on ${input.dateLabel.trim()}` })
  revalidatePath(`/admin/classes/${input.subjectId}`)
  return { ok: true, notified: parents.size }
}

// A seat opened up: offer it to a waitlisted family. Delegates to the shared
// helper so the offer is stamped (offeredAt) and the cron sweep can expire it.
export async function offerWaitlistSeat(waitlistId: string) {
  await requireUser(['admin'])
  const r = await sendSeatOffer(waitlistId)
  revalidatePath('/admin/classes')
  return r
}
