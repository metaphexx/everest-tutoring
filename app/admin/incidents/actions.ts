'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'

export async function logIncident(input: {
  studentName?: string
  category: string
  severity: string
  details: string
  actionTaken?: string
}) {
  const user = await requireUser(['admin', 'tutor'])
  if (!input.details.trim()) return { ok: false }
  const inc = await prisma.incident.create({
    data: {
      studentName: input.studentName?.trim() || null,
      category: input.category,
      severity: input.severity,
      details: input.details.trim(),
      actionTaken: input.actionTaken?.trim() || null,
      reportedById: user.id,
    },
  })
  await notifyAdmin({
    type: 'flag',
    title: `${input.severity} ${input.category} incident logged`,
    body: `${input.studentName ? `${input.studentName}: ` : ''}${input.details.slice(0, 80)}`,
    href: '/admin/incidents',
    refKey: `incident:${inc.id}`,
  })
  revalidatePath('/admin/incidents')
  return { ok: true }
}

export async function resolveIncident(id: string) {
  await requireUser(['admin'])
  await prisma.incident.update({ where: { id }, data: { status: 'resolved' } })
  revalidatePath('/admin/incidents')
  return { ok: true }
}
