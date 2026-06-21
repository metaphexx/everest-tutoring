import { prisma } from '@/lib/db'
import { isEmail } from '@/lib/validate'
import { hasResend } from '@/lib/notify'
import { sendEmail } from '@/lib/resend'

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export type InviteResult = { ok: boolean; reason?: string; accountId?: string }

/**
 * Create (or link) a student's own login account and send them an invite.
 *
 * A student account is deliberately SEPARATE from the parent account, so we only
 * create one when the student has their own distinct email. If only the parent's
 * email is on file we defer (returning `no_distinct_email`) rather than collide on
 * the unique email or blur the parent/student boundary - the family can add a
 * student email later from settings.
 *
 * The invite email points the student at /login, where the existing magic-link
 * flow takes over (in dev the link is printed to the server console). Sending is
 * preview-gated and always logged to the Notification table for audit + dedupe.
 */
export async function inviteStudent(studentId: string): Promise<InviteResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { parent: { select: { email: true } } },
  })
  if (!student) return { ok: false, reason: 'not_found' }

  const email = (student.email ?? '').trim().toLowerCase()
  const parentEmail = (student.parent.email ?? '').trim().toLowerCase()
  if (!email || !isEmail(email) || email === parentEmail) {
    return { ok: false, reason: 'no_distinct_email' }
  }

  // Create or reuse the student User account (never hijack a non-student email).
  let account = await prisma.user.findUnique({ where: { email } })
  if (!account) {
    account = await prisma.user.create({
      data: {
        email,
        name: `${student.firstName} ${student.lastName}`,
        phone: student.phone ?? undefined,
        role: 'student',
      },
    })
  } else if (account.role !== 'student') {
    return { ok: false, reason: 'email_in_use' }
  }

  await prisma.student.update({
    where: { id: student.id },
    data: { userId: account.id, invitedAt: new Date() },
  })

  const subject = `${student.firstName}, your Everest student login is ready`
  const text = `Hi ${student.firstName},

Your Everest Tutoring student account is ready. This is your own space to ask your tutor questions, share class work and keep on top of your assessments.

To sign in, go to ${baseUrl()}/login and enter this email address (${email}). We will email you a secure one-time sign-in link.

See you in class,
The Everest Tutoring team`

  let status: 'sent' | 'failed' | 'preview' = 'preview'
  let error: string | null = null
  if (hasResend) {
    try {
      await sendEmail({ to: email, subject, text })
      status = 'sent'
    } catch (e) {
      status = 'failed'
      error = e instanceof Error ? e.message : String(e)
    }
  }

  await prisma.notification.create({
    data: {
      userId: account.id,
      channel: 'email',
      type: 'student_invite',
      recipient: email,
      subject,
      body: text,
      status,
      refKey: `student-invite:${student.id}`,
      error,
    },
  })

  return { ok: true, accountId: account.id }
}
