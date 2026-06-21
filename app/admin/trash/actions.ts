'use server'

import { revalidatePath } from 'next/cache'
import { prisma, rawPrisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { SOFT_DELETE_MODELS } from '@/lib/audit-context'

type Delegate = { update: (a: unknown) => Promise<unknown> }
function delegateFor(entity: string): Delegate | undefined {
  if (!SOFT_DELETE_MODELS.has(entity)) return undefined
  const key = entity.charAt(0).toLowerCase() + entity.slice(1)
  return (prisma as unknown as Record<string, Delegate>)[key]
}

/** Restore a soft-deleted record (clears deletedAt). Audited as an update. */
export async function restoreRecord(input: { entity: string; id: string }) {
  await requireUser(['admin'])
  const d = delegateFor(input.entity)
  if (!d) return { ok: false, error: 'This record type cannot be restored.' }
  try {
    // For a Student, mirror the cascade: also restore the children that were
    // soft-deleted in the same operation (matched by the exact deletedAt stamp),
    // so the restored student comes back complete without un-deleting records
    // that were trashed separately.
    if (input.entity === 'Student') {
      const s = await rawPrisma.student.findUnique({ where: { id: input.id }, select: { deletedAt: true } })
      if (s?.deletedAt) {
        await rawPrisma.studentNote.updateMany({ where: { studentId: input.id, deletedAt: s.deletedAt }, data: { deletedAt: null } })
        await rawPrisma.studentCredit.updateMany({ where: { studentId: input.id, deletedAt: s.deletedAt }, data: { deletedAt: null } })
      }
    }
    await d.update({ where: { id: input.id }, data: { deletedAt: null } })
  } catch {
    return { ok: false, error: 'Could not restore this record.' }
  }
  revalidatePath('/admin/trash')
  revalidatePath('/admin/audit')
  return { ok: true }
}
