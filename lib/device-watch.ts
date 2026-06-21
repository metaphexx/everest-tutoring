import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'

/**
 * Lightweight new-device tripwire. The first time an account that already has a
 * known device signs in from a new network + browser family, the admin team is
 * alerted. The very first device an account ever uses is recorded silently (no
 * alert), so onboarding doesn't generate noise.
 *
 * The fingerprint is deliberately coarse - the first two octets of the IP (the
 * network, so a dynamic address within the same ISP block isn't flagged) plus a
 * broad browser/OS family - to avoid crying wolf on every minor change.
 */

/** A broad browser/OS family from a user-agent string, for a human-readable alert. */
export function uaSummary(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device'
  const os = /iphone|ipad/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /mac os x/i.test(ua) ? 'macOS' : /windows/i.test(ua) ? 'Windows' : /linux/i.test(ua) ? 'Linux' : 'device'
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome\//i.test(ua) ? 'Chrome' : /firefox\//i.test(ua) ? 'Firefox' : /safari\//i.test(ua) ? 'Safari' : 'browser'
  return `${browser} on ${os}`
}

function fingerprint(ip: string | null, ua: string | null): string {
  const net = (ip ?? '').split('.').slice(0, 2).join('.')
  return createHash('sha256').update(`${net}|${uaSummary(ua)}`).digest('hex').slice(0, 16)
}

export async function noteSignIn(input: {
  userId: string
  name: string | null
  role: string
  ip: string | null
  userAgent: string | null
}): Promise<void> {
  try {
    const fp = fingerprint(input.ip, input.userAgent)
    const seen = await prisma.knownDevice.findUnique({
      where: { userId_fingerprint: { userId: input.userId, fingerprint: fp } },
      select: { id: true },
    })
    if (seen) return // known device - nothing to do (skip a write on every request)

    const priorDevices = await prisma.knownDevice.count({ where: { userId: input.userId } })
    await prisma.knownDevice.create({
      data: { userId: input.userId, fingerprint: fp, ip: input.ip, userAgent: input.userAgent },
    })

    if (priorDevices > 0) {
      await notifyAdmin({
        type: 'system',
        title: `New device sign-in: ${input.name ?? input.role}`,
        body: `${input.role} account signed in from a new network${input.ip ? ` (${input.ip})` : ''} - ${uaSummary(input.userAgent)}. If this wasn't expected, review their recent activity.`,
        href: '/admin/audit',
        refKey: `newdevice:${input.userId}:${fp}`,
      })
    }
  } catch {
    /* best-effort - never block sign-in */
  }
}
