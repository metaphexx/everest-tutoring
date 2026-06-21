import { prisma } from '@/lib/db'

/**
 * Record a consequential admin action. Fail-safe: a logging hiccup must never
 * break the action it's recording. Surfaced at /admin/audit.
 */
export async function logAudit(input: {
  actorId?: string | null
  actorName?: string | null
  action: string
  target?: string
  detail?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        target: input.target ?? null,
        detail: input.detail ?? null,
      },
    })
  } catch {
    /* never throw from the audit trail */
  }
}
