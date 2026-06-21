import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { setAuditActor } from '@/lib/audit-context'
import { noteSignIn } from '@/lib/device-watch'

export type SessionUser = {
  id: string
  role: string
  name?: string | null
  email?: string | null
}

/** Current user or null. Use in components that render for both auth states. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()
  return (session?.user as SessionUser) ?? null
}

/** Best-effort client IP + user-agent from the request headers. */
async function requestProvenance(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    const ip = (fwd ? fwd.split(',')[0] : h.get('x-real-ip'))?.trim() || null
    return { ip, userAgent: h.get('user-agent') }
  } catch {
    return { ip: null, userAgent: null }
  }
}

/**
 * Secure gate for protected pages/actions. Redirects to /login if signed out,
 * and to the user's own area if they lack the required role. Admins pass any
 * role check. Returns the user when access is allowed.
 */
export async function requireUser(roles?: string[]): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  // Locked out (e.g. a tutor auto-suspended for poaching). Checked against the DB
  // so a suspension takes effect immediately, not on next token refresh.
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { suspended: true } })
  if (account?.suspended) redirect('/suspended')
  if (roles && roles.length > 0 && user.role !== 'admin' && !roles.includes(user.role)) {
    redirect('/account')
  }
  // Attribute any DB changes made during this request to the signed-in user, with
  // request provenance, so the audit trail records who did what and from where.
  const { ip, userAgent } = await requestProvenance()
  setAuditActor({ id: user.id, name: user.name, role: user.role, ip, userAgent })
  // Fire-and-forget: alert admins the first time an account signs in from a new
  // device/IP. Never blocks the request.
  void noteSignIn({ userId: user.id, name: user.name ?? null, role: user.role, ip, userAgent })
  return user
}

/** Convenience gate for the student Learning Hub. */
export async function requireStudent(): Promise<SessionUser> {
  return requireUser(['student'])
}

/** Landing path for a given role after sign-in. */
export function homeForRole(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'tutor') return '/tutor'
  if (role === 'school') return '/partner'
  if (role === 'student') return '/student'
  return '/dashboard'
}
