import { prisma } from '@/lib/db'
import { rowHash, type ChainResult } from '@/lib/audit-chain'

/**
 * Walk the hash-chained audit rows in order and confirm none have been altered or
 * removed. Returns the first row that fails to reconcile, if any. Only rows that
 * carry a hash participate (older rows predate the chain).
 */
export async function verifyAuditChain(): Promise<ChainResult> {
  const rows = await prisma.auditLog.findMany({
    where: { hash: { not: null } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true, actorId: true, action: true, kind: true, entity: true,
      entityId: true, before: true, after: true, createdAt: true, hash: true, prevHash: true,
    },
  })

  let prev: string | null = null
  for (const r of rows) {
    if ((r.prevHash ?? null) !== prev) {
      return { ok: false, checked: rows.length, brokenId: r.id, reason: 'A record is missing from the chain (broken link).' }
    }
    const expected = rowHash(prev, {
      actorId: r.actorId,
      action: r.action,
      kind: r.kind,
      entity: r.entity,
      entityId: r.entityId,
      before: r.before,
      after: r.after,
      createdAt: r.createdAt.toISOString(),
    })
    if (r.hash !== expected) {
      return { ok: false, checked: rows.length, brokenId: r.id, reason: 'A record was altered after it was written.' }
    }
    prev = r.hash
  }
  return { ok: true, checked: rows.length }
}
