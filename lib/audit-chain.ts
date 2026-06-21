import { createHash } from 'crypto'

/**
 * Tamper-evident audit log. Each audit row stores a SHA-256 `hash` computed over
 * the previous row's hash plus this row's immutable content. Because every hash
 * depends on the one before it, editing or deleting any historical row (e.g. to
 * cover up an accidental or malicious change) makes its hash - and every hash
 * after it - no longer match. verifyAuditChain() walks the chain and reports the
 * first row that does not reconcile.
 *
 * Fields that legitimately change after a row is written (reverted/revertedAt/
 * revertedById) are deliberately NOT part of the hashed content, so marking an
 * action as reverted does not break the chain.
 */

export type ChainContent = {
  actorId: string | null
  action: string
  kind: string | null
  entity: string | null
  entityId: string | null
  before: string | null
  after: string | null
  createdAt: string // ISO - must match the value stored on the row
}

/** Deterministic hash of one row, given the previous row's hash. */
export function rowHash(prevHash: string | null, c: ChainContent): string {
  const canonical = JSON.stringify([
    prevHash ?? '',
    c.actorId ?? '',
    c.action,
    c.kind ?? '',
    c.entity ?? '',
    c.entityId ?? '',
    c.before ?? '',
    c.after ?? '',
    c.createdAt,
  ])
  return createHash('sha256').update(canonical).digest('hex')
}

export type ChainResult = {
  ok: boolean
  checked: number
  brokenId?: string
  reason?: string
}
