import { AsyncLocalStorage } from 'async_hooks'

export type AuditActor = {
  id?: string | null
  name?: string | null
  role?: string | null
  /** Request provenance, captured from headers in requireUser. */
  ip?: string | null
  userAgent?: string | null
}

// Carries the current signed-in user through a request so the Prisma audit
// extension can attribute every change without threading the user everywhere.
const store = new AsyncLocalStorage<AuditActor>()

/** Set the actor for the rest of the current request (called from requireUser). */
export function setAuditActor(actor: AuditActor) {
  store.enterWith(actor)
}

/** The actor for the current request, or an empty object for system/cron work. */
export function getAuditActor(): AuditActor {
  return store.getStore() ?? {}
}

// Business entities whose create/update/delete are recorded automatically. High
// volume / system tables (messages, notifications, attendance, the audit log
// itself) are intentionally excluded to keep the trail signal-rich.
export const AUDITED_MODELS = new Set<string>([
  'Student', 'User', 'Subject', 'Booking', 'Enrollment', 'Term',
  'StudentNote', 'StudentCredit', 'ServiceRequest', 'WithdrawalRequest',
  'Incident', 'Referral', 'Waitlist', 'Report', 'Announcement', 'TutorResource',
])

// Models whose `delete`/`deleteMany` are converted to a soft delete (setting
// deletedAt) so an accidental deletion is recoverable from the admin trash, and
// whose `findMany`/`count` hide soft-deleted rows. Keep in sync with the
// `deletedAt` columns in schema.prisma. Note: nested relation reads inside an
// `include` are not filtered by the extension - see lib/db.ts.
export const SOFT_DELETE_MODELS = new Set<string>([
  'Student', 'StudentNote', 'StudentCredit', 'Announcement', 'TutorResource', 'Referral',
])

/** Keep only JSON-safe scalar fields for the before/after snapshot. */
export function scalarSnapshot(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v
    else if (v instanceof Date) out[k] = v.toISOString()
  }
  return out
}
