'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { totalWeeks } from '@/lib/term'

const toDate = (s: string) => new Date(`${s}T00:00:00`)

// Edit a term's dates / billable weeks / name. Drives all billing + pro-rata.
export async function updateTerm(input: { id: string; name: string; startDate: string; endDate: string; weeks: number }) {
  await requireUser(['admin'])
  if (!input.name.trim() || !input.startDate || !input.endDate) return { ok: false, reason: 'Name and both dates are required.' }
  const start = toDate(input.startDate)
  const end = toDate(input.endDate)
  if (end <= start) return { ok: false, reason: 'End date must be after the start date.' }
  await prisma.term.update({
    where: { id: input.id },
    data: { name: input.name.trim(), startDate: start, endDate: end, weeks: Math.max(1, Math.round(input.weeks)) },
  })
  revalidatePath('/admin/terms')
  return { ok: true }
}

// Add a future term.
export async function createTerm(input: { name: string; year: number; termNumber: number; startDate: string; endDate: string; weeks?: number }) {
  await requireUser(['admin'])
  if (!input.name.trim() || !input.startDate || !input.endDate) return { ok: false, reason: 'Name and both dates are required.' }
  const start = toDate(input.startDate)
  const end = toDate(input.endDate)
  if (end <= start) return { ok: false, reason: 'End date must be after the start date.' }
  await prisma.term.create({
    data: {
      name: input.name.trim(), year: input.year, termNumber: input.termNumber,
      startDate: start, endDate: end, weeks: input.weeks && input.weeks > 0 ? Math.round(input.weeks) : totalWeeks(start, end),
      isActive: false,
    },
  })
  revalidatePath('/admin/terms')
  return { ok: true }
}

// Make one term the active term (only one at a time).
export async function setActiveTerm(id: string) {
  await requireUser(['admin'])
  await prisma.$transaction([
    prisma.term.updateMany({ data: { isActive: false } }),
    prisma.term.update({ where: { id }, data: { isActive: true } }),
  ])
  revalidatePath('/admin/terms')
  return { ok: true }
}

/** Suggested weeks for a date range (client helper via server, used by the form). */
export async function suggestWeeks(startDate: string, endDate: string) {
  await requireUser(['admin'])
  if (!startDate || !endDate) return { weeks: 0 }
  return { weeks: totalWeeks(toDate(startDate), toDate(endDate)) }
}
