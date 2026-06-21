import { prisma } from '@/lib/db'

/**
 * In-CRM notification centre for the admin team. Anything worth the admin's
 * attention from any tab (a new referral, a parent support message, an AI-flagged
 * chat, a scanned course outline, a failed payment) drops an AdminNotification
 * here, surfaced by the bell in the admin shell.
 *
 * Deduped on refKey so the same event never notifies twice.
 */
export type AdminNotificationType =
  | 'referral'
  | 'support'
  | 'flag'
  | 'outline'
  | 'booking'
  | 'payment'
  | 'request'
  | 'system'

export async function notifyAdmin(input: {
  type: AdminNotificationType
  title: string
  body?: string
  href?: string
  refKey?: string
}): Promise<void> {
  try {
    if (input.refKey) {
      const existing = await prisma.adminNotification.findUnique({ where: { refKey: input.refKey } })
      if (existing) return
    }
    await prisma.adminNotification.create({
      data: { type: input.type, title: input.title, body: input.body, href: input.href, refKey: input.refKey },
    })
  } catch {
    // Notifications are best-effort - never let one break the action that raised it.
  }
}

export function unreadAdminCount() {
  return prisma.adminNotification.count({ where: { read: false } })
}

export function listAdminNotifications(limit = 50) {
  return prisma.adminNotification.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
}
