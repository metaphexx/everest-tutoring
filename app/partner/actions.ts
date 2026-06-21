'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { generateReferralDraft } from '@/lib/outreach'
import { ingestOutline } from '@/lib/outline'
import { notifyAdmin } from '@/lib/admin-notify'
import { isEmail, isPhone } from '@/lib/validate'

export async function addAssessmentDate(input: { yearLevel: number; subject: string; title: string; date: string; notes?: string }) {
  const user = await requireUser(['school'])
  if (!input.title.trim() || !input.date) return { ok: false }
  await prisma.assessmentDate.create({
    data: { yearLevel: input.yearLevel, subject: input.subject, title: input.title.trim(), date: new Date(`${input.date}T00:00:00`), notes: input.notes?.trim() || null, createdById: user.id },
  })
  revalidatePath('/partner')
  revalidatePath('/tutor')
  revalidatePath('/admin/partner')
  return { ok: true }
}

export async function addReferral(input: {
  studentName: string
  yearLevel: number
  subject?: string
  reason: string
  parentName?: string
  parentEmail: string
  parentPhone: string
}) {
  const user = await requireUser(['school'])
  // Parent email + phone are required (and must be valid) so Everest can reach out.
  if (
    !input.studentName.trim() || !input.reason.trim() ||
    !isEmail(input.parentEmail) || !isPhone(input.parentPhone)
  ) {
    return { ok: false }
  }
  const referral = await prisma.referral.create({
    data: {
      studentName: input.studentName.trim(),
      yearLevel: input.yearLevel,
      subject: input.subject || null,
      reason: input.reason.trim(),
      parentName: input.parentName?.trim() || null,
      parentEmail: input.parentEmail.trim(),
      parentPhone: input.parentPhone.trim(),
      createdById: user.id,
    },
  })
  // Elliot drafts the outreach straight away; the admin reviews/edits before it sends.
  try {
    await generateReferralDraft(referral.id)
  } catch {
    /* draft is best-effort - the admin can regenerate from the CRM */
  }
  await notifyAdmin({
    type: 'referral',
    title: `New HSHS referral: ${referral.studentName} (Y${referral.yearLevel})`,
    body: 'Elliot has drafted outreach, ready for your review.',
    href: '/admin/partner',
    refKey: `referral:${referral.id}`,
  })
  revalidatePath('/partner')
  revalidatePath('/admin/partner')
  return { ok: true }
}

export async function addOutline(input: {
  yearLevel: number
  subject: string
  fileName: string
  sourceUrl?: string
  rawText: string
}) {
  const user = await requireUser(['school', 'admin'])
  if (!input.subject || !input.rawText.trim()) return { ok: false, assessmentsAdded: 0, topics: 0 }
  const result = await ingestOutline({
    yearLevel: input.yearLevel,
    subject: input.subject,
    fileName: input.fileName?.trim() || `Y${input.yearLevel} ${input.subject} outline`,
    sourceUrl: input.sourceUrl?.trim() || null,
    rawText: input.rawText,
    uploadedById: user.id,
  })
  revalidatePath('/partner')
  revalidatePath('/admin/partner')
  revalidatePath('/tutor')
  return { ok: result.status !== 'failed', assessmentsAdded: result.assessmentsAdded, topics: result.topics }
}

export async function addNotice(input: { title: string; body: string; category: string }) {
  const user = await requireUser(['school'])
  if (!input.title.trim() || !input.body.trim()) return { ok: false }
  await prisma.schoolNotice.create({
    data: { title: input.title.trim(), body: input.body.trim(), category: input.category, createdById: user.id },
  })
  revalidatePath('/partner')
  revalidatePath('/admin/partner')
  return { ok: true }
}

export async function setReferralStatus(input: { id: string; status: string }) {
  await requireUser(['admin'])
  await prisma.referral.update({ where: { id: input.id }, data: { status: input.status } })
  revalidatePath('/admin/partner')
  return { ok: true }
}
