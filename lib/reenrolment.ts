import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'
import { hasResend, hasTwilio } from '@/lib/notify'
import { notifyAdmin } from '@/lib/admin-notify'
import { captureError } from '@/lib/log'
import { generateConfirmationCode } from '@/lib/utils'
import { totalWeeks } from '@/lib/term'
import { familyCreditCents, consumeFamilyCredit } from '@/lib/credits'
import { inQuietHours } from '@/lib/comms'

/**
 * Auto-enrolment / term rollover.
 *
 * Policy (decided with the client): continuing families are auto-enrolled into
 * the next term and charged in the LAST WEEK of the current term. A reminder
 * goes out beforehand with an easy opt-out. On a failed charge we auto-retry
 * once and notify the parent by email AND SMS.
 *
 * Like the rest of the platform this runs in PREVIEW mode until real keys are
 * present: it still creates the next term + bookings and logs what it would
 * charge, but takes no money. The live off-session charge path is gated on
 * hasStripe and a saved payment method (see DEV note in chargeOffSession).
 */
const real = (v?: string, p?: string) => !!v && !v.includes('...') && (!p || v.startsWith(p))
export const hasStripe = real(process.env.STRIPE_SECRET_KEY, 'sk_')

const WEEKLY_RATES: Record<number, number> = { 1: 35, 2: 60, 3: 80 }
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

// Default WA term dates so a freshly-created next term has sensible bounds. These
// are only a starting point - admin can edit any term's dates/weeks at /admin/terms.
const TERM_DATES: Record<string, { start: string; end: string }> = {
  '2026-4': { start: '2026-10-12', end: '2026-12-17' },
  '2027-1': { start: '2027-02-02', end: '2027-04-09' },
  '2027-2': { start: '2027-04-27', end: '2027-07-03' },
}

function fullTermAmountCents(subjectsPerWeek: number, students: number, weeks: number): number {
  const c = Math.min(3, Math.max(1, subjectsPerWeek))
  const per = (WEEKLY_RATES[c] ?? 35) * weeks
  const subtotal = per * students
  const sibling = students > 1 ? Math.round(per * (students - 1) * 0.1) : 0
  return (subtotal - sibling) * 100
}

function nextTermMeta(from: { year: number; termNumber: number }) {
  return from.termNumber >= 4
    ? { year: from.year + 1, termNumber: 1 }
    : { year: from.year, termNumber: from.termNumber + 1 }
}

/** Find or create the term we roll into, cloning the class list across. */
export async function getOrCreateNextTerm(fromTermId: string) {
  const from = await prisma.term.findUnique({ where: { id: fromTermId }, include: { subjects: true } })
  if (!from) throw new Error('Source term not found')
  const meta = nextTermMeta(from)
  let to = await prisma.term.findFirst({ where: { year: meta.year, termNumber: meta.termNumber } })
  if (to) return to

  const d = TERM_DATES[`${meta.year}-${meta.termNumber}`] ?? { start: `${meta.year}-01-01`, end: `${meta.year}-03-01` }
  const startDate = new Date(`${d.start}T00:00:00`)
  const endDate = new Date(`${d.end}T00:00:00`)
  to = await prisma.term.create({
    data: {
      name: `Term ${meta.termNumber} ${meta.year}`,
      year: meta.year,
      termNumber: meta.termNumber,
      startDate,
      endDate,
      weeks: totalWeeks(startDate, endDate),
      isActive: false,
    },
  })
  // Year level only progresses at the school-year boundary (new Term 1).
  const progresses = meta.termNumber === 1
  for (const s of from.subjects) {
    const yearLevel = progresses ? s.yearLevel + 1 : s.yearLevel
    if (yearLevel > 10) continue // Year 10 is the top of the program; they age out.
    await prisma.subject.create({
      data: {
        name: s.name,
        yearLevel,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        color: s.color,
        termId: to.id,
        tutorId: s.tutorId,
      },
    })
  }
  return to
}

type BookingFull = Awaited<ReturnType<typeof loadContinuing>>[number]
function loadContinuing(termId: string) {
  return prisma.booking.findMany({
    where: { termId, paymentStatus: 'paid', autoReenrol: true, reenrolledToId: null },
    include: { user: true, enrollments: { include: { subject: true, student: true } } },
  })
}

export type ReenrolResult = {
  mode: 'remind' | 'charge'
  term: string
  processed: number
  reminded: number
  charged: number
  preview: number
  failed: number
  live: boolean
}

/**
 * Run the rollover. `remind` sends the pre-charge notice; `charge` creates the
 * next-term bookings and (when live) charges off-session. Idempotent: a booking
 * already rolled (reenrolledToId set) is skipped.
 */
export async function runAutoReenrolment(mode: 'remind' | 'charge' = 'charge'): Promise<ReenrolResult> {
  const fromTerm = await prisma.term.findFirst({ where: { isActive: true } })
  const base: ReenrolResult = { mode, term: '', processed: 0, reminded: 0, charged: 0, preview: 0, failed: 0, live: hasStripe }
  if (!fromTerm) return base
  const toTerm = await getOrCreateNextTerm(fromTerm.id)
  base.term = toTerm.name
  const bookings = await loadContinuing(fromTerm.id)

  for (const b of bookings) {
    base.processed++
    const amountCents = fullTermAmountCents(b.subjectsPerWeek, b.studentsCount, toTerm.weeks)
    try {
      if (mode === 'remind') {
        // Preview the credit that will be applied (don't consume until we charge).
        const credit = Math.min(await familyCreditCents(b.userId), amountCents)
        await sendReenrolReminder(b, toTerm.name, fromTerm.endDate, amountCents, credit)
        base.reminded++
      } else {
        const outcome = await reenrolOne(b, toTerm, amountCents)
        if (outcome === 'charged') base.charged++
        else if (outcome === 'preview') base.preview++
        else base.failed++
      }
    } catch (e) {
      base.failed++
      await captureError(e, { where: 'reenrolment', booking: b.id })
    }
  }

  if (mode === 'charge' && base.processed > 0) {
    await notifyAdmin({
      type: 'system',
      title: `${toTerm.name} auto-enrolment ran`,
      body: `${base.charged + base.preview} of ${base.processed} families rolled over${base.failed ? `, ${base.failed} failed` : ''}.`,
      href: '/admin/bookings',
      refKey: `reenrol-run:${toTerm.id}:${new Date().toISOString().slice(0, 10)}`,
    })
  }
  return base
}

// Pre-charge reminder with opt-out. Transactional, so sent regardless of
// marketing opt-outs, but it tells the parent exactly how to opt out.
async function sendReenrolReminder(b: BookingFull, toTermName: string, chargeDate: Date, amountCents: number, creditCents = 0) {
  const name = b.user.name?.split(' ')[0] ?? 'there'
  const when = chargeDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
  const net = Math.max(0, amountCents - creditCents)
  const creditLine = creditCents > 0 ? ` We'll apply your ${money(creditCents)} account credit, so the charge will be ${money(net)}.` : ''
  const body =
    `Hi ${name}, to keep your child's spot we'll automatically enrol them into ${toTermName} and charge ${money(net)} around ${when}.${creditLine} ` +
    `Nothing to do if you're happy to continue. To pause or opt out, manage auto-enrolment in your parent dashboard.`
  if (b.user.email) {
    let status = 'preview'
    if (hasResend) { try { await sendEmail({ to: b.user.email, subject: `Auto-enrolment for ${toTermName}`, text: body }); status = 'sent' } catch { status = 'failed' } }
    await prisma.notification.create({ data: { userId: b.userId, channel: 'email', type: 'reenrolment', recipient: b.user.email, subject: `Auto-enrolment for ${toTermName}`, body, status } })
  }
  if (b.user.phone && !inQuietHours()) {
    let status = 'preview'
    const sms = `${body} Reply STOP to opt out.`
    if (hasTwilio) { try { await sendSMS(b.user.phone, sms); status = 'sent' } catch { status = 'failed' } }
    await prisma.notification.create({ data: { userId: b.userId, channel: 'sms', type: 'reenrolment', recipient: b.user.phone, body: sms, status } })
  }
}

async function reenrolOne(b: BookingFull, toTerm: { id: string; name: string; termNumber: number; weeks: number }, amountCents: number): Promise<'charged' | 'preview' | 'failed'> {
  const progresses = toTerm.termNumber === 1
  const toSubjects = await prisma.subject.findMany({ where: { termId: toTerm.id } })
  const code = generateConfirmationCode()

  // Apply the family's account credit to reduce the charge. Only spend it for
  // real (live charge); in preview just compute the net so nothing is burned.
  const appliedCredit = hasStripe
    ? await consumeFamilyCredit(b.userId, amountCents)
    : Math.min(await familyCreditCents(b.userId), amountCents)
  const netCents = Math.max(0, amountCents - appliedCredit)

  // Attempt the off-session charge first; only book on success when live.
  const charge = await chargeOffSession(b, netCents)
  const paid = charge.status === 'charged'

  const newBooking = await prisma.booking.create({
    data: {
      userId: b.userId,
      termId: toTerm.id,
      studentsCount: b.studentsCount,
      subjectsPerWeek: b.subjectsPerWeek,
      weeksRemaining: toTerm.weeks,
      totalAmountCents: netCents,
      stripePaymentId: charge.paymentId ?? null,
      paymentStatus: paid ? 'paid' : hasStripe ? 'pending' : 'preview',
      confirmationCode: code,
      autoReenrol: true,
      paidAt: paid ? new Date() : null,
    },
  })
  for (const e of b.enrollments) {
    const want = progresses ? e.subject.yearLevel + 1 : e.subject.yearLevel
    const sub = toSubjects.find((s) => s.name === e.subject.name && s.yearLevel === want)
    if (sub) await prisma.enrollment.create({ data: { studentId: e.studentId, subjectId: sub.id, bookingId: newBooking.id, status: 'active' } })
  }
  await prisma.booking.update({ where: { id: b.id }, data: { reenrolledToId: newBooking.id } })

  const noteStatus = !hasStripe ? 'preview' : charge.status === 'failed' ? 'failed' : 'sent'
  await prisma.notification.create({
    data: {
      userId: b.userId,
      channel: 'email',
      type: 'reenrolment',
      recipient: b.user.email ?? b.user.name ?? 'unknown',
      subject: `${toTerm.name} enrolment - ${money(netCents)}`,
      body: `Auto-enrolled ${b.studentsCount} student(s) into ${toTerm.name} (code ${code}).${appliedCredit > 0 ? ` ${money(appliedCredit)} credit applied.` : ''} ${money(netCents)} ${hasStripe ? (paid ? 'charged' : 'charge pending') : '(preview - no charge taken)'}.`,
      status: noteStatus,
      error: charge.error,
    },
  })

  if (charge.status === 'failed') {
    await notifyPaymentFailure(b, toTerm.name, netCents, charge.error)
    return 'failed'
  }
  return hasStripe ? 'charged' : 'preview'
}

/**
 * Off-session charge against the family's saved card. The card is captured at
 * first checkout (`setup_future_usage: 'off_session'`) and stored on the user as
 * stripeCustomerId + stripePaymentMethodId (see the Stripe webhook). On a card
 * error Stripe throws; we retry once, then report a failure so the parent gets
 * the re-book email. Returns a no-op preview until STRIPE_SECRET_KEY is real.
 */
async function chargeOffSession(b: BookingFull, amountCents: number): Promise<{ status: 'charged' | 'preview' | 'failed'; error: string | null; paymentId?: string }> {
  if (!hasStripe) return { status: 'preview', error: null }
  if (amountCents <= 0) return { status: 'charged', error: null } // fully covered by credit - nothing to charge

  const customer = b.user.stripeCustomerId
  const paymentMethod = b.user.stripePaymentMethodId
  if (!customer || !paymentMethod) return { status: 'failed', error: 'No saved card on file - the family needs to re-book.' }

  const attempt = () => stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'aud',
    customer,
    payment_method: paymentMethod,
    off_session: true,
    confirm: true,
    description: 'Everest Tutoring auto-enrolment',
  })

  try {
    const pi = await attempt()
    return pi.status === 'succeeded'
      ? { status: 'charged', error: null, paymentId: pi.id }
      : { status: 'failed', error: `Payment ${pi.status}`, paymentId: pi.id }
  } catch {
    // One retry covers transient declines / network blips.
    try {
      const pi = await attempt()
      return pi.status === 'succeeded'
        ? { status: 'charged', error: null, paymentId: pi.id }
        : { status: 'failed', error: `Payment ${pi.status}`, paymentId: pi.id }
    } catch (e2) {
      return { status: 'failed', error: e2 instanceof Error ? e2.message : 'Off-session charge failed' }
    }
  }
}

async function notifyPaymentFailure(b: BookingFull, toTermName: string, amountCents: number, error: string | null) {
  const name = b.user.name?.split(' ')[0] ?? 'there'
  const bookUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')}/book`
  const body = `Hi ${name}, we couldn't process the ${money(amountCents)} payment for ${toTermName} enrolment. To secure your child's spot, please re-book and pay securely here: ${bookUrl} (you can pay by card or in instalments). Reply if you'd like a hand.`
  if (b.user.email && hasResend) { try { await sendEmail({ to: b.user.email, subject: `Action needed: ${toTermName} payment`, text: body }) } catch { /* logged below */ } }
  if (b.user.phone && hasTwilio) { try { await sendSMS(b.user.phone, body) } catch { /* logged below */ } }
  await prisma.notification.create({ data: { userId: b.userId, channel: 'email', type: 'reenrolment', recipient: b.user.email ?? '', subject: `Payment failed: ${toTermName}`, body, status: hasResend ? 'sent' : 'preview', error } })
  await notifyAdmin({ type: 'payment', title: `Auto-enrolment payment failed: ${b.user.name ?? 'a parent'}`, body: `${money(amountCents)} for ${toTermName} could not be charged.`, href: '/admin/bookings', refKey: `reenrol-fail:${b.id}` })
}

/**
 * Email the parent whenever they flip auto-enrolment on or off. Turning it OFF
 * also carries a light win-back message (keep your spot, locked-in price, turn
 * it back on anytime). Fail-safe + preview-gated, so it never breaks the toggle.
 */
export async function sendAutoReenrolChangeEmail(userId: string, on: boolean): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
    if (!user?.email || !hasResend) return
    const first = user.name?.split(' ')[0] ?? 'there'
    if (on) {
      await sendEmail({
        to: user.email,
        subject: 'Auto-enrolment is back on',
        text: `Hi ${first},\n\nYou've turned auto-enrolment back on. We'll reserve your child's spot and enrol them automatically for next term, and we'll always email a reminder before any charge.\n\nNothing else to do - your child keeps their class and this term's price is locked in.\n\nThanks,\nThe Everest Tutoring team`,
      })
    } else {
      await sendEmail({
        to: user.email,
        subject: "You've turned off auto-enrolment",
        text: `Hi ${first},\n\nYou've turned off auto-enrolment, so your child's spot for next term won't be reserved automatically - you'll need to re-book each term.\n\nWe'd love to keep your child going. A few reasons families stay enrolled:\n- Their exact class and spot is held, with no scramble when classes fill.\n- This term's price is locked in, even if fees rise.\n- We always email a reminder before any charge, and you can cancel anytime.\n\nYou can turn auto-enrolment back on any time from your parent dashboard. If cost or timing is the issue, just reply and we can often pause or adjust instead.\n\nThanks,\nThe Everest Tutoring team`,
      })
    }
  } catch (e) {
    await captureError(e, { where: 'autoReenrol.changeEmail', userId })
  }
}

/**
 * Previous-student (win-back) sweep. Once the active term has started (the
 * enrolment window has closed), any former paying family with no active
 * enrollment in that term hasn't continued - move them to the alumni /
 * previous-student list so the existing win-back marketing keeps reaching them.
 * Idempotent (skips families already alumni); fail-safe per family.
 */
export async function lapseNonContinuingFamilies(): Promise<{ lapsed: number }> {
  const activeTerm = await prisma.term.findFirst({ where: { isActive: true } })
  // Only act once enrolment for the active term has closed (it has started).
  if (!activeTerm || activeTerm.startDate > new Date()) return { lapsed: 0 }

  const paidParents = await prisma.booking.findMany({
    where: { paymentStatus: 'paid' },
    select: { userId: true },
    distinct: ['userId'],
  })

  let lapsed = 0
  for (const { userId } of paidParents) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { lifecycleStage: true } })
      if (!user || user.lifecycleStage === 'alumni') continue
      const continuing = await prisma.enrollment.count({
        where: { status: 'active', student: { parentId: userId }, subject: { termId: activeTerm.id } },
      })
      if (continuing === 0) {
        await prisma.user.update({ where: { id: userId }, data: { lifecycleStage: 'alumni', alumniSince: new Date() } })
        lapsed++
      }
    } catch (e) {
      await captureError(e, { where: 'lapseNonContinuingFamilies', userId })
    }
  }

  if (lapsed > 0) {
    await notifyAdmin({
      type: 'system',
      title: `${lapsed} famil${lapsed === 1 ? 'y' : 'ies'} moved to the win-back list`,
      body: `They didn't continue into ${activeTerm.name}, so they're now on the alumni / previous-student list for win-back marketing.`,
      href: '/admin/alumni',
      refKey: `lapse:${activeTerm.id}`,
    })
  }
  return { lapsed }
}
