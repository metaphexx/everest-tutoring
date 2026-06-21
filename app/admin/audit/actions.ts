'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { SOFT_DELETE_MODELS } from '@/lib/audit-context'

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

// Snapshots store dates as ISO strings; turn them back into Date for Prisma.
function coerce(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = typeof v === 'string' && ISO.test(v) ? new Date(v) : v
  return out
}

type Delegate = {
  update: (a: unknown) => Promise<unknown>
  create: (a: unknown) => Promise<unknown>
  delete: (a: unknown) => Promise<unknown>
  findFirst: (a: unknown) => Promise<unknown>
}
function delegateFor(entity: string): Delegate | undefined {
  const key = entity.charAt(0).toLowerCase() + entity.slice(1)
  return (prisma as unknown as Record<string, Delegate>)[key]
}

// Undo a logged change: restore the previous values (update), delete what was
// created (create), or recreate what was deleted (delete). The revert is itself
// audited. Best-effort: a record referenced by others may not be removable.
export async function revertAudit(input: { id: string }) {
  const admin = await requireUser(['admin'])
  const log = await prisma.auditLog.findUnique({ where: { id: input.id } })
  if (!log || log.reverted || !log.entity || !log.entityId || !log.kind) return { ok: false, error: 'This entry cannot be reverted.' }
  const d = delegateFor(log.entity)
  if (!d) return { ok: false, error: 'Unknown record type.' }

  try {
    if (log.kind === 'update' && log.before) {
      const before = coerce(JSON.parse(log.before))
      delete before.id
      delete before.createdAt
      delete before.updatedAt
      await d.update({ where: { id: log.entityId }, data: before })
    } else if (log.kind === 'create') {
      await d.delete({ where: { id: log.entityId } })
    } else if (log.kind === 'delete') {
      // Soft-delete models still hold the row (deletedAt stamped) - restore it.
      // Hard-deleted models are recreated from the snapshot.
      const stillExists = SOFT_DELETE_MODELS.has(log.entity)
        ? await d.findFirst({ where: { id: log.entityId } })
        : null
      if (stillExists) {
        await d.update({ where: { id: log.entityId }, data: { deletedAt: null } })
      } else if (log.before) {
        await d.create({ data: coerce(JSON.parse(log.before)) })
      } else {
        return { ok: false, error: 'Nothing to revert.' }
      }
    } else {
      return { ok: false, error: 'Nothing to revert.' }
    }
  } catch {
    return { ok: false, error: 'Could not revert - the record may be referenced by others.' }
  }

  await prisma.auditLog.update({ where: { id: log.id }, data: { reverted: true, revertedAt: new Date(), revertedById: admin.id } })
  revalidatePath('/admin/audit')
  return { ok: true }
}
