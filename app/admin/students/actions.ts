'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'
import { grantStudentCredit, voidStudentCredit } from '@/lib/credits'
import { logAudit } from '@/lib/audit'

// Issue account credit to a student (e.g. a missed session) - reduces future charges.
export async function grantCredit(input: { studentId: string; amountDollars: number; reason: string }) {
  const admin = await requireUser(['admin'])
  const cents = Math.round((input.amountDollars || 0) * 100)
  const r = await grantStudentCredit({ studentId: input.studentId, amountCents: cents, reason: input.reason, createdById: admin.id })
  if (r.ok) await logAudit({ actorId: admin.id, actorName: admin.name, action: 'credit.grant', target: input.studentId, detail: `$${(cents / 100).toFixed(2)} - ${input.reason}` })
  revalidatePath(`/admin/students/${input.studentId}`)
  return r
}

// Change a parent's login email (the magic-link identity). The account keeps its
// id, so all bookings/students/history stay linked; only the login email moves.
export async function changeParentEmail(input: { parentId: string; newEmail: string }) {
  const admin = await requireUser(['admin'])
  const email = input.newEmail.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, reason: 'Enter a valid email address.' }
  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (taken && taken.id !== input.parentId) return { ok: false, reason: 'That email is already used by another account.' }
  const parent = await prisma.user.findUnique({ where: { id: input.parentId }, select: { email: true, name: true, role: true } })
  if (!parent || parent.role !== 'parent') return { ok: false, reason: 'Parent not found.' }
  if (parent.email === email) return { ok: true }
  await prisma.user.update({ where: { id: input.parentId }, data: { email } })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'parent.changeEmail', target: parent.name ?? input.parentId, detail: `${parent.email} → ${email}` })
  revalidatePath('/admin/students')
  return { ok: true }
}

export async function voidCredit(creditId: string, studentId: string) {
  await requireUser(['admin'])
  await voidStudentCredit(creditId)
  revalidatePath(`/admin/students/${studentId}`)
  return { ok: true }
}

/**
 * Privacy Act erasure: permanently delete a parent and all their data.
 * Irreversible - the UI confirms first. Account/Session rows cascade on the
 * final user delete.
 */
export async function deleteParentData(parentId: string) {
  const admin = await requireUser(['admin'])
  const parent = await prisma.user.findUnique({ where: { id: parentId }, select: { name: true, role: true } })
  if (!parent || parent.role !== 'parent') return { ok: false }

  const students = await prisma.student.findMany({ where: { parentId }, select: { id: true } })
  const studentIds = students.map((s) => s.id)

  const convs = await prisma.conversation.findMany({
    where: { OR: [{ parentId }, { studentId: { in: studentIds } }] },
    select: { id: true },
  })
  const convIds = convs.map((c) => c.id)

  await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } })
  await prisma.conversation.deleteMany({ where: { id: { in: convIds } } })
  await prisma.attendance.deleteMany({ where: { studentId: { in: studentIds } } })
  await prisma.report.deleteMany({ where: { studentId: { in: studentIds } } })
  await prisma.makeupBooking.deleteMany({ where: { studentId: { in: studentIds } } })
  await prisma.enrollment.deleteMany({ where: { studentId: { in: studentIds } } })
  await prisma.serviceRequest.deleteMany({ where: { parentId } })
  await prisma.waitlist.deleteMany({ where: { parentId } })
  await prisma.booking.deleteMany({ where: { userId: parentId } })
  await prisma.notification.deleteMany({ where: { userId: parentId } })
  await prisma.student.deleteMany({ where: { parentId } })
  await prisma.user.delete({ where: { id: parentId } })

  await notifyAdmin({
    type: 'system',
    title: `Parent data erased (Privacy Act)`,
    body: `${parent.name ?? 'A parent'} and all associated records were deleted by ${admin.name ?? 'an admin'}.`,
    href: '/admin/students',
  })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'parent.delete', target: parent.name ?? parentId, detail: 'Privacy Act erasure (cascade)' })
  revalidatePath('/admin/students')
  return { ok: true }
}

const NOTE_CATEGORIES = ['general', 'academic', 'behaviour', 'billing', 'retention', 'safeguarding']

// Staff CRM note on a student (documentation/timeline). Admin or tutor.
export async function addStudentNote(input: { studentId: string; category: string; body: string; pinned?: boolean }) {
  const author = await requireUser(['admin', 'tutor'])
  if (!input.body.trim()) return { ok: false }
  const category = NOTE_CATEGORIES.includes(input.category) ? input.category : 'general'
  await prisma.studentNote.create({
    data: { studentId: input.studentId, authorId: author.id, authorName: author.name ?? null, category, body: input.body.trim(), pinned: !!input.pinned },
  })
  revalidatePath(`/admin/students/${input.studentId}`)
  return { ok: true }
}

export async function deleteStudentNote(noteId: string, studentId: string) {
  await requireUser(['admin', 'tutor'])
  await prisma.studentNote.delete({ where: { id: noteId } })
  revalidatePath(`/admin/students/${studentId}`)
  return { ok: true }
}

export async function toggleStudentNotePin(noteId: string, studentId: string, pinned: boolean) {
  await requireUser(['admin', 'tutor'])
  await prisma.studentNote.update({ where: { id: noteId }, data: { pinned } })
  revalidatePath(`/admin/students/${studentId}`)
  return { ok: true }
}
