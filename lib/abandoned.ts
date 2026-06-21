import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'
import { hasResend, hasTwilio } from '@/lib/notify'
import { inQuietHours } from '@/lib/comms'
import { formatPhone } from '@/lib/utils'
import { captureError } from '@/lib/log'
import type { BookingFormData, PricingSummary } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Recovery cadence: send the next nudge once the cart is at least this old. One
// email + SMS per stage, then we stop (no badgering).
const STAGES_HOURS = [1, 24, 72]
const MS = 3600_000

export type SavedCart = { formData: BookingFormData; pricing: PricingSummary }

function firstChildName(formData: BookingFormData): string {
  return formData.students?.[0]?.firstName?.trim() || 'your child'
}

/**
 * Save (or refresh) the in-progress checkout the moment a family reaches payment,
 * so we can recover it if they leave without paying. Keyed by email - one live
 * cart per family, latest attempt wins. Fail-safe: never blocks checkout.
 */
export async function captureCart(
  formData: BookingFormData,
  pricing: PricingSummary,
  stripeSessionId?: string,
): Promise<string | null> {
  try {
    const email = formData.email.trim().toLowerCase()
    if (!email) return null
    const payload = JSON.stringify({ formData, pricing } satisfies SavedCart)
    const existing = await prisma.pendingBooking.findUnique({ where: { email }, select: { resumeToken: true } })
    const resumeToken = existing?.resumeToken ?? crypto.randomBytes(16).toString('hex')
    await prisma.pendingBooking.upsert({
      where: { email },
      update: {
        phone: formData.phone, parentFirstName: formData.parentFirstName, parentLastName: formData.parentLastName,
        payload, totalCents: pricing.totalCents, stripeSessionId, status: 'started',
        // A returning, re-started cart should be eligible to be chased again.
        remindersSent: 0, lastReminderAt: null,
      },
      create: {
        email, phone: formData.phone, parentFirstName: formData.parentFirstName, parentLastName: formData.parentLastName,
        payload, totalCents: pricing.totalCents, resumeToken, stripeSessionId, status: 'started',
      },
    })
    return resumeToken
  } catch (e) {
    await captureError(e, { where: 'abandoned.captureCart' })
    return null
  }
}

/** Mark a family's saved cart as paid so the recovery cron stops chasing it. */
export async function markCartCompleted(opts: { email?: string; stripeSessionId?: string }): Promise<void> {
  try {
    const where = opts.stripeSessionId
      ? { stripeSessionId: opts.stripeSessionId }
      : opts.email
        ? { email: opts.email.trim().toLowerCase() }
        : null
    if (!where) return
    await prisma.pendingBooking.updateMany({ where, data: { status: 'completed' } })
  } catch (e) {
    await captureError(e, { where: 'abandoned.markCartCompleted' })
  }
}

/** Look up a saved cart by its resume token (for the /book?resume=… link). */
export async function getCartByToken(token: string): Promise<SavedCart | null> {
  if (!token) return null
  const row = await prisma.pendingBooking.findUnique({ where: { resumeToken: token } })
  if (!row || row.status === 'completed') return null
  try {
    return JSON.parse(row.payload) as SavedCart
  } catch {
    return null
  }
}

function recoveryEmail(childName: string, total: string, link: string) {
  return {
    subject: `You're one step away from securing ${childName}'s place`,
    text:
      `Hi,\n\nYou started enrolling ${childName} with Everest Tutoring at Harrisdale SHS but didn't finish paying. ` +
      `Your selections are saved - you can pick up right where you left off:\n\n${link}\n\n` +
      `Places are capped at 12 per class and fill up, so we'd hate for ${childName} to miss out. ` +
      `Your total today is ${total} (pro-rata for the weeks remaining this term).\n\n` +
      `If you have any questions just reply to this email or contact info@everesttutoring.com.au.\n\nEverest Tutoring`,
  }
}

function recoverySMS(childName: string, link: string) {
  return (
    `Everest Tutoring: ${childName}'s enrolment is almost done - your spot isn't secured until payment. ` +
    `Finish here: ${link} Reply STOP to opt out.`
  )
}

/**
 * Recovery sweep (runs from the nudges cron). Finds saved carts that were never
 * paid and nudges the family by email + SMS, escalating across STAGES_HOURS, then
 * stops. Respects quiet hours (SMS) and a user's marketing opt-out. Fail-safe.
 */
export async function sweepAbandonedCheckouts(now: Date = new Date()): Promise<{ emailed: number; texted: number }> {
  let emailed = 0
  let texted = 0
  try {
    const candidates = await prisma.pendingBooking.findMany({
      where: { status: 'started', remindersSent: { lt: STAGES_HOURS.length } },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    })

    for (const cart of candidates) {
      const stageIdx = cart.remindersSent // next stage to send
      const dueAfterMs = STAGES_HOURS[stageIdx] * MS
      const ageMs = now.getTime() - cart.updatedAt.getTime()
      if (ageMs < dueAfterMs) continue

      // Respect a known user's marketing opt-out.
      const user = await prisma.user.findUnique({ where: { email: cart.email }, select: { marketingOptOut: true } })
      if (user?.marketingOptOut) continue

      const childName = (() => {
        try { return firstChildName((JSON.parse(cart.payload) as SavedCart).formData) } catch { return 'your child' }
      })()
      const total = `$${(cart.totalCents / 100).toFixed(2)}`
      const link = `${APP_URL}/book?resume=${cart.resumeToken}`

      if (hasResend) {
        try {
          const { subject, text } = recoveryEmail(childName, total, link)
          await sendEmail({ to: cart.email, subject, text })
          emailed++
        } catch (e) { await captureError(e, { where: 'abandoned.sweep.email', cart: cart.id }) }
      }

      // SMS only inside quiet-hours window; if outside, leave the stage for the next run.
      if (hasTwilio && cart.phone && !inQuietHours(now)) {
        try {
          await sendSMS(formatPhone(cart.phone), recoverySMS(childName, link))
          texted++
        } catch (e) { await captureError(e, { where: 'abandoned.sweep.sms', cart: cart.id }) }
      }

      await prisma.pendingBooking.update({
        where: { id: cart.id },
        data: { remindersSent: { increment: 1 }, lastReminderAt: now },
      })
    }
  } catch (e) {
    await captureError(e, { where: 'abandoned.sweep' })
  }
  return { emailed, texted }
}
