'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { processWithdrawal } from '@/lib/withdrawal'
import { logAudit } from '@/lib/audit'

// Move a retention case along the pipeline without withdrawing anyone.
export async function setWithdrawalStatus(id: string, status: 'discussing' | 'retained', note?: string) {
  await requireUser(['admin'])
  await prisma.withdrawalRequest.update({
    where: { id },
    data: { status, adminNote: note ?? undefined, resolvedAt: status === 'retained' ? new Date() : null },
  })
  revalidatePath('/admin/retention')
  return { ok: true }
}

// Actually process the withdrawal: ends enrollments, frees seats (auto-advances
// the waitlist), stops auto-enrol, and moves the family to alumni if empty.
export async function processWithdrawalRequest(id: string, note?: string) {
  const admin = await requireUser(['admin'])
  const req = await prisma.withdrawalRequest.findUnique({ where: { id } })
  if (!req) return { ok: false }
  const result = await processWithdrawal({
    requestId: id,
    parentId: req.parentId,
    studentId: req.studentId ?? undefined,
    reason: req.reason ?? undefined,
    adminNote: note,
  })
  await logAudit({ actorId: admin.id, actorName: admin.name, action: 'withdrawal.process', target: req.studentName ?? req.parentName ?? req.parentId, detail: result.withdrawn.join(', ') })
  revalidatePath('/admin/retention')
  revalidatePath('/admin/alumni')
  revalidatePath('/admin/students')
  return { ok: true, ...result }
}
