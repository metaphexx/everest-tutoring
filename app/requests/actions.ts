'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { notifyAdmin } from '@/lib/admin-notify'
import { startSeatCheckout } from '@/lib/waitlist'
import { sendAutoReenrolChangeEmail } from '@/lib/reenrolment'

// No refund per T&Cs - cancellations are a withdrawal/credit, never money-back.
const TYPES = ['makeup', 'reschedule', 'cancel', 'other'] as const
const LABEL: Record<string, string> = {
  makeup: 'Make-up class',
  reschedule: 'Reschedule',
  cancel: 'Cancellation',
  other: 'General',
}

export async function createServiceRequest(input: {
  type: string
  studentId?: string
  subjectName?: string
  details: string
  preferredDate?: string
}) {
  const user = await requireUser(['parent'])
  if (!TYPES.includes(input.type as (typeof TYPES)[number]) || !input.details.trim()) return { ok: false }

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })

  // Verify the student belongs to this parent before attaching them.
  let studentName: string | null = null
  if (input.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, parentId: user.id },
      select: { firstName: true, lastName: true },
    })
    if (!student) return { ok: false }
    studentName = `${student.firstName} ${student.lastName}`
  }

  const req = await prisma.serviceRequest.create({
    data: {
      parentId: user.id,
      parentName: me?.name ?? null,
      studentId: input.studentId || null,
      studentName,
      subjectName: input.subjectName || null,
      type: input.type,
      details: input.details.trim(),
      preferredDate: input.preferredDate ? new Date(`${input.preferredDate}T00:00:00`) : null,
    },
  })

  await notifyAdmin({
    type: 'request',
    title: `${LABEL[input.type]} request from ${me?.name ?? 'a parent'}`,
    body: `${studentName ? `${studentName} - ` : ''}${input.details.trim().slice(0, 80)}`,
    href: '/admin/requests',
    refKey: `request:${req.id}`,
  })

  revalidatePath('/dashboard/makeup')
  revalidatePath('/admin/requests')
  return { ok: true }
}

export async function updateServiceRequest(input: { id: string; status?: string; adminNote?: string }) {
  await requireUser(['admin'])
  await prisma.serviceRequest.update({
    where: { id: input.id },
    data: { status: input.status, adminNote: input.adminNote },
  })
  revalidatePath('/admin/requests')
  return { ok: true }
}

// Parent joins the waitlist for a class that's at capacity.
export async function joinWaitlist(input: { subjectId: string; studentId?: string }) {
  const user = await requireUser(['parent'])
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })
  let studentName: string | null = null
  if (input.studentId) {
    const s = await prisma.student.findFirst({ where: { id: input.studentId, parentId: user.id }, select: { firstName: true, lastName: true } })
    if (!s) return { ok: false }
    studentName = `${s.firstName} ${s.lastName}`
  }
  const existing = await prisma.waitlist.findFirst({ where: { subjectId: input.subjectId, parentId: user.id, status: { in: ['waiting', 'offered', 'claimed'] } } })
  if (existing) return { ok: true, already: true }
  await prisma.waitlist.create({ data: { subjectId: input.subjectId, parentId: user.id, parentName: me?.name ?? null, studentName, studentId: input.studentId ?? null, status: 'waiting' } })
  await notifyAdmin({ type: 'booking', title: `Waitlist: ${studentName ?? me?.name ?? 'a parent'}`, body: 'Joined the waitlist for a full class.', href: '/admin/classes', refKey: `waitlist:${input.subjectId}:${user.id}` })
  revalidatePath('/dashboard')
  return { ok: true }
}

// Parent claims an offered seat from their dashboard. Starts the pro-rata
// checkout (seat secured on payment); returns a Stripe URL for the client to
// redirect to, or a preview flag when Stripe isn't live.
export async function claimWaitlistSeat(waitlistId: string) {
  const user = await requireUser(['parent'])
  const r = await startSeatCheckout(waitlistId, { requireParentId: user.id })
  revalidatePath('/dashboard')
  return r
}

// "Manage enrolment": a parent sends a message about what they'd like done with
// their enrolment (change classes, pause, update details, or leave). This is a
// CONTACT POINT, not a self-service unenrol - it logs a request and opens a
// support thread so the team can handle it and, if they're considering leaving,
// reach out and (hopefully) keep them. Nothing is changed automatically here.
export async function submitEnrollmentRequest(input: { studentId?: string; message: string }) {
  const user = await requireUser(['parent'])
  if (!input.message.trim()) return { ok: false }
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })
  let studentName: string | null = null
  if (input.studentId) {
    const s = await prisma.student.findFirst({ where: { id: input.studentId, parentId: user.id, status: 'active' }, select: { firstName: true, lastName: true } })
    if (!s) return { ok: false }
    studentName = `${s.firstName} ${s.lastName}`
  }

  // Don't pile up duplicate open requests.
  const open = await prisma.withdrawalRequest.findFirst({ where: { parentId: user.id, status: { in: ['requested', 'discussing'] } } })
  if (!open) {
    await prisma.withdrawalRequest.create({
      data: { parentId: user.id, parentName: me?.name ?? null, studentId: input.studentId ?? null, studentName, reason: input.message.trim(), status: 'requested' },
    })
  }

  // Open / thread into a support conversation so the discussion happens in-app.
  let conv = await prisma.conversation.findFirst({ where: { type: 'support', parentId: user.id, status: 'open' }, orderBy: { lastMessageAt: 'desc' } })
  if (!conv) conv = await prisma.conversation.create({ data: { type: 'support', parentId: user.id, topic: 'Manage enrolment' } })
  await prisma.message.create({ data: { conversationId: conv.id, senderId: user.id, body: `[Enrolment request]${studentName ? ` for ${studentName}` : ''}: ${input.message.trim()}` } })
  await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } })

  await notifyAdmin({
    type: 'request',
    title: `Enrolment request: ${studentName ?? me?.name ?? 'a family'}`,
    body: input.message.trim().slice(0, 100),
    href: '/admin/retention',
    refKey: `enrolreq:${user.id}`,
  })
  revalidatePath('/dashboard')
  return { ok: true }
}

// Parent toggles auto-enrolment for next term on their own paid bookings.
export async function setAutoReenrol(value: boolean) {
  const user = await requireUser(['parent'])
  await prisma.booking.updateMany({ where: { userId: user.id, paymentStatus: 'paid' }, data: { autoReenrol: value } })

  // Confirm the change by email every time (turning OFF also carries a win-back
  // message). Fail-safe so the toggle never depends on email succeeding.
  await sendAutoReenrolChangeEmail(user.id, value)

  // Flag a turn-off for the team so they can follow up to keep the family.
  if (!value) {
    await notifyAdmin({
      type: 'request',
      title: `Auto-enrolment turned off: ${user.name ?? 'a parent'}`,
      body: 'A family opted out of next-term auto-enrolment. Reach out to keep them before the term ends.',
      href: '/admin/retention',
      refKey: `autoreenrol-off:${user.id}`,
    })
  }

  revalidatePath('/dashboard')
  return { ok: true, value }
}
