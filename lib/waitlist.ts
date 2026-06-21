import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'
import { hasResend, hasTwilio } from '@/lib/notify'
import { hasStripe } from '@/lib/reenrolment'
import { calculatePricing, formatCurrency } from '@/lib/proration'
import { getActiveTerm, weeksRemaining } from '@/lib/term'
import { inQuietHours } from '@/lib/comms'
import { notifyAdmin } from '@/lib/admin-notify'

// How long a family has to claim + pay for an offered seat before it rolls on.
export const OFFER_TTL_HOURS = 48

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}
function isExpired(at: Date | null) {
  return !!at && Date.now() - at.getTime() > OFFER_TTL_HOURS * 3_600_000
}
/** Weeks left in the active term (0 if none active). */
async function activeWeeksRemaining(): Promise<number> {
  const t = await getActiveTerm()
  return t ? weeksRemaining(t) : 0
}

/** Pro-rata price (cents) to secure a single class for the rest of the term. */
export async function claimPriceCents(): Promise<number> {
  return calculatePricing(1, 1, await activeWeeksRemaining()).totalCents
}

/**
 * Notify a waitlisted family that a seat opened, mark the entry `offered`, and
 * mint a one-click claim token. The email + SMS carry a link straight to a
 * pro-rata checkout so they can pay and secure the seat. Respects opt-outs.
 */
export async function sendSeatOffer(waitlistId: string) {
  const w = await prisma.waitlist.findUnique({ where: { id: waitlistId }, include: { subject: true } })
  if (!w) return { ok: false }
  const token = randomBytes(24).toString('base64url')
  await prisma.waitlist.update({ where: { id: waitlistId }, data: { status: 'offered', offeredAt: new Date(), claimedAt: null, claimToken: token } })

  const parent = await prisma.user.findUnique({ where: { id: w.parentId } })
  const claimUrl = `${baseUrl()}/claim/${token}`
  const price = formatCurrency(await claimPriceCents())
  const intro = `Good news - a spot has opened up in Y${w.subject.yearLevel} ${w.subject.name}${w.studentName ? ` for ${w.studentName}` : ''}.`
  const emailBody = `${intro}\n\nSecure the seat now (${price} for the rest of the term) - it's first to pay, first served, so claim within ${OFFER_TTL_HOURS} hours:\n${claimUrl}\n\nIf the link expires, log in to your dashboard to claim it there.`
  const smsBody = `${intro} Secure it (${price}) within ${OFFER_TTL_HOURS}h - pay here: ${claimUrl}`

  if (parent?.email && !parent.emailOptOut) {
    let status = 'preview'
    if (hasResend) { try { await sendEmail({ to: parent.email, subject: 'A spot opened up at Everest', text: emailBody }); status = 'sent' } catch { status = 'failed' } }
    await prisma.notification.create({ data: { userId: parent.id, channel: 'email', type: 'waitlist', recipient: parent.email, subject: 'A spot opened up', body: emailBody, status } })
  }
  if (parent?.phone && !parent.smsOptOut) {
    let status = 'preview'
    if (hasTwilio) { try { await sendSMS(parent.phone, smsBody); status = 'sent' } catch { status = 'failed' } }
    await prisma.notification.create({ data: { userId: parent.id, channel: 'sms', type: 'waitlist', recipient: parent.phone, body: smsBody, status } })
  }
  return { ok: true, claimUrl }
}

/** Read an offer by token for the public claim page (no mutation). */
export async function getClaimOffer(token: string) {
  const w = await prisma.waitlist.findUnique({
    where: { claimToken: token },
    include: { subject: { select: { name: true, yearLevel: true, color: true, dayOfWeek: true, startTime: true, endTime: true } } },
  })
  if (!w) return null
  const weeks = await activeWeeksRemaining()
  return {
    id: w.id, status: w.status, studentName: w.studentName, parentName: w.parentName, subject: w.subject,
    expired: isExpired(w.offeredAt), priceCents: calculatePricing(1, 1, weeks).totalCents, weeks,
  }
}

/**
 * Start the pro-rata checkout to secure a seat. The seat is only really secured
 * once the payment webhook fires; here we mark the entry `claimed` (pending
 * payment) and hand back a Stripe Checkout URL. Live Stripe required; without
 * keys we fall back to alerting admin (preview), like the rest of the app.
 */
export async function startSeatCheckout(
  waitlistId: string,
  opts?: { requireParentId?: string },
): Promise<{ ok: true; url?: string; preview?: boolean } | { ok: false; reason: string }> {
  const w = await prisma.waitlist.findUnique({ where: { id: waitlistId }, include: { subject: true } })
  if (!w) return { ok: false, reason: 'This offer is no longer available.' }
  if (opts?.requireParentId && w.parentId !== opts.requireParentId) return { ok: false, reason: 'Not found.' }
  if (w.status === 'enrolled') return { ok: false, reason: "You're already enrolled in this class." }
  if (w.status !== 'offered' && w.status !== 'claimed') return { ok: false, reason: 'This offer is no longer available.' }
  if (isExpired(w.offeredAt)) return { ok: false, reason: 'This offer has expired.' }

  const parent = await prisma.user.findUnique({ where: { id: w.parentId } })
  if (!parent?.email) return { ok: false, reason: 'We need an email on file to take payment - please contact us.' }

  const pricing = calculatePricing(1, 1, await activeWeeksRemaining())
  await prisma.waitlist.update({ where: { id: w.id }, data: { status: 'claimed', claimedAt: new Date() } })

  if (!hasStripe) {
    await notifyAdmin({
      type: 'booking',
      title: `Seat claimed (preview): ${w.studentName ?? parent.name ?? 'a family'}`,
      body: `Wants Y${w.subject.yearLevel} ${w.subject.name}. Stripe isn't live - finalise + send a payment link. Pro-rata ${formatCurrency(pricing.totalCents)}.`,
      href: '/admin/waitlist',
      refKey: `claim:${w.id}`,
    })
    return { ok: true, preview: true }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    // Omit payment_method_types so dashboard-enabled methods (incl. Afterpay/Zip)
    // show. Reuse/create the customer + save the card for off-session re-enrolment.
    ...(parent.stripeCustomerId
      ? { customer: parent.stripeCustomerId }
      : { customer_email: parent.email, customer_creation: 'always' as const }),
    payment_intent_data: { setup_future_usage: 'off_session' },
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: { name: `Everest Tutoring - Y${w.subject.yearLevel} ${w.subject.name}`, description: `Waitlist seat${w.studentName ? ` for ${w.studentName}` : ''} | ${pricing.weeksRemaining} weeks @ Harrisdale SHS` },
        unit_amount: pricing.totalCents,
      },
      quantity: 1,
    }],
    metadata: {
      kind: 'waitlist_claim',
      waitlistId: w.id,
      parentId: w.parentId,
      subjectId: w.subjectId,
      studentId: w.studentId ?? '',
      studentName: w.studentName ?? '',
      weeksRemaining: String(pricing.weeksRemaining),
    },
    success_url: `${baseUrl()}/confirmation/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}${w.claimToken ? `/claim/${w.claimToken}` : '/dashboard'}`,
  })
  return { ok: true, url: session.url ?? undefined }
}

/** Token wrapper for the public one-click claim link. */
export async function startClaimCheckoutByToken(token: string) {
  const w = await prisma.waitlist.findUnique({ where: { claimToken: token }, select: { id: true } })
  if (!w) return { ok: false as const, reason: 'Link not found.' }
  return startSeatCheckout(w.id)
}

/**
 * A seat freed up (or an offer expired): offer it to the next waiting family,
 * but only if there's genuinely room once active enrollments + outstanding
 * offers/claims are counted, so we never offer more seats than exist.
 */
export async function offerNextSeat(subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { capacity: true } })
  if (!subject) return { offered: false as const }
  const [taken, outstanding] = await Promise.all([
    prisma.enrollment.count({ where: { subjectId, status: 'active' } }),
    prisma.waitlist.count({ where: { subjectId, status: { in: ['offered', 'claimed'] } } }),
  ])
  if (taken + outstanding >= subject.capacity) return { offered: false as const }
  const next = await prisma.waitlist.findFirst({ where: { subjectId, status: 'waiting' }, orderBy: { createdAt: 'asc' } })
  if (!next) return { offered: false as const }
  await sendSeatOffer(next.id)
  return { offered: true as const, waitlistId: next.id }
}

async function alreadySent(refKey: string) {
  return (await prisma.notification.count({ where: { refKey } })) > 0
}

/** One reminder, email + SMS, respecting opt-outs, deduped by refKey. */
async function remind(parentId: string, refKey: string, subject: string, body: string) {
  if (await alreadySent(refKey)) return
  const parent = await prisma.user.findUnique({ where: { id: parentId } })
  if (parent?.email && !parent.emailOptOut) {
    let status = 'preview'
    if (hasResend) { try { await sendEmail({ to: parent.email, subject, text: body }); status = 'sent' } catch { status = 'failed' } }
    await prisma.notification.create({ data: { userId: parent.id, channel: 'email', type: 'waitlist', recipient: parent.email, subject, body, status, refKey } })
  }
  if (parent?.phone && !parent.smsOptOut && !inQuietHours()) {
    let status = 'preview'
    if (hasTwilio) { try { await sendSMS(parent.phone, body); status = 'sent' } catch { status = 'failed' } }
    await prisma.notification.create({ data: { userId: parent.id, channel: 'sms', type: 'waitlist', recipient: parent.phone, body, status, refKey: `${refKey}:sms` } })
  }
}

/**
 * Automatic follow-ups so nobody has to chase by hand: one nudge for offers not
 * yet acted on, and one for claims that never got paid. Deduped, wired into the
 * nudges cron.
 */
export async function sweepWaitlistReminders() {
  const now = Date.now()
  const price = formatCurrency(await claimPriceCents())
  let nudged = 0
  const active = await prisma.waitlist.findMany({ where: { status: { in: ['offered', 'claimed'] } }, include: { subject: true } })
  for (const w of active) {
    if (isExpired(w.offeredAt)) continue
    const link = w.claimToken ? `${baseUrl()}/claim/${w.claimToken}` : `${baseUrl()}/dashboard`
    const cls = `Y${w.subject.yearLevel} ${w.subject.name}`
    if (w.status === 'offered' && w.offeredAt && now - w.offeredAt.getTime() > 20 * 3_600_000) {
      await remind(w.parentId, `wl-remind-offer:${w.id}`, 'Your Everest seat is still waiting', `Reminder: a spot in ${cls} is still open for you, but only for a little longer. Secure it (${price}): ${link}`)
      nudged++
    } else if (w.status === 'claimed' && w.claimedAt && now - w.claimedAt.getTime() > 6 * 3_600_000) {
      await remind(w.parentId, `wl-remind-pay:${w.id}`, 'Finish securing your Everest seat', `You're nearly there - your ${cls} seat just needs payment to lock it in (${price}): ${link}`)
      nudged++
    }
  }
  return { nudged }
}

/**
 * Cron sweep: expire offers/claims nobody paid within the TTL and roll each
 * freed seat to the next family in line. Wired into the nudges cron.
 */
export async function sweepExpiredOffers() {
  const cutoff = new Date(Date.now() - OFFER_TTL_HOURS * 3_600_000)
  const stale = await prisma.waitlist.findMany({ where: { status: { in: ['offered', 'claimed'] }, offeredAt: { lt: cutoff } } })
  let expired = 0
  let reoffered = 0
  for (const w of stale) {
    await prisma.waitlist.update({ where: { id: w.id }, data: { status: 'expired', claimToken: null } })
    expired++
    const r = await offerNextSeat(w.subjectId)
    if (r.offered) reoffered++
  }
  if (expired > 0) {
    await notifyAdmin({
      type: 'system',
      title: `${expired} waitlist offer${expired === 1 ? '' : 's'} expired`,
      body: `${reoffered} seat${reoffered === 1 ? '' : 's'} rolled to the next family in line.`,
      href: '/admin/waitlist',
      refKey: `wl-sweep:${cutoff.toISOString().slice(0, 13)}`,
    })
  }
  return { expired, reoffered }
}
