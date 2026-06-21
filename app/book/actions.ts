'use server'

import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'
import { isEmail, isPhone } from '@/lib/validate'

// Join the waitlist directly from the booking funnel when a class is full.
// Upserts the parent by email (like the payment webhook does) so the entry is a
// real account that can later log in and claim a freed seat.
export async function joinWaitlistFromBooking(input: {
  year: number
  subject: string
  studentName: string
  parentName: string
  email: string
  phone: string
}) {
  if (!input.studentName.trim()) {
    return { ok: false as const, reason: 'Please add the student name.' }
  }
  if (!isEmail(input.email)) {
    return { ok: false as const, reason: 'Please enter a valid email address.' }
  }
  if (input.phone.trim() && !isPhone(input.phone)) {
    return { ok: false as const, reason: 'Please enter a valid Australian phone number.' }
  }
  const subject = await prisma.subject.findFirst({ where: { term: { isActive: true }, yearLevel: input.year, name: input.subject } })
  if (!subject) return { ok: false as const, reason: 'That class could not be found.' }

  const parent = await prisma.user.upsert({
    where: { email: input.email.trim().toLowerCase() },
    update: { phone: input.phone.trim() || undefined, name: input.parentName.trim() || undefined },
    create: { email: input.email.trim().toLowerCase(), name: input.parentName.trim() || null, phone: input.phone.trim() || null, role: 'parent' },
  })

  const existing = await prisma.waitlist.findFirst({ where: { subjectId: subject.id, parentId: parent.id, status: { in: ['waiting', 'offered', 'claimed'] } } })
  if (existing) return { ok: true as const, already: true }

  await prisma.waitlist.create({
    data: { subjectId: subject.id, parentId: parent.id, parentName: input.parentName.trim() || null, studentName: input.studentName.trim(), status: 'waiting' },
  })
  await notifyAdmin({
    type: 'booking',
    title: `Waitlist (from booking): ${input.studentName.trim()}`,
    body: `Joined the waitlist for the full Y${input.year} ${input.subject} class.`,
    href: '/admin/waitlist',
    refKey: `waitlist:${subject.id}:${parent.id}`,
  })
  return { ok: true as const }
}
