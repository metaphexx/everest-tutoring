import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { familyCreditCents } from '@/lib/credits'
import { hasStripe } from '@/lib/reenrolment'
import { captureCart } from '@/lib/abandoned'
import { isEmail, isPhone } from '@/lib/validate'
import type { BookingFormData, PricingSummary } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { formData, pricing }: { formData: BookingFormData; pricing: PricingSummary } = await req.json()

    // Server-side guard: never trust the client. Reject malformed contact details.
    if (
      !formData?.parentFirstName?.trim() ||
      !formData?.parentLastName?.trim() ||
      !isEmail(formData.email ?? '') ||
      !isPhone(formData.phone ?? '') ||
      !Array.isArray(formData.students) || formData.students.length === 0
    ) {
      return NextResponse.json({ error: 'Please enter a valid name, email and Australian phone number.' }, { status: 400 })
    }

    // Each student needs their own login email, distinct from the parent's and
    // from each other.
    const parentEmail = formData.email.trim().toLowerCase()
    const seenStudentEmails = new Set<string>()
    for (const st of formData.students) {
      const studentEmail = (st.email ?? '').trim().toLowerCase()
      if (!isEmail(studentEmail) || studentEmail === parentEmail || seenStudentEmails.has(studentEmail)) {
        return NextResponse.json({ error: 'Each student needs their own valid email, different from the parent email.' }, { status: 400 })
      }
      seenStudentEmails.add(studentEmail)
    }

    const studentSummary = formData.students
      .map(s => `${s.firstName} (Y${s.yearLevel}: ${s.selectedSubjects.join(', ')})`)
      .join(' · ')

    // Apply the family's account credit (e.g. from missed sessions) for a
    // returning family. Keep at least A$0.50 to charge so Stripe accepts it; any
    // leftover credit stays on the account. Consumed in the webhook on success.
    const email = formData.email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, stripeCustomerId: true } })
    const credit = existing ? await familyCreditCents(existing.id) : 0
    let appliedCredit = Math.min(credit, pricing.totalCents)
    if (pricing.totalCents - appliedCredit < 50 && appliedCredit > 0) appliedCredit = Math.max(0, pricing.totalCents - 50)
    const chargeCents = pricing.totalCents - appliedCredit

    // Save the in-progress cart FIRST (before talking to Stripe) so abandoned-cart
    // recovery works even if the family never finishes - or if Stripe isn't wired
    // yet in this environment.
    await captureCart(formData, pricing)

    // No live Stripe keys (preview/dev): skip the real call so the page can show a
    // placeholder. The cart is still captured above for recovery testing.
    if (!hasStripe) {
      return NextResponse.json({ preview: true })
    }

    const session = await stripe.checkout.sessions.create({
      // Embedded Checkout: the card form + Apple Pay / Google Pay / Afterpay / Zip
      // render inline on our own /book payment step (no redirect to Stripe).
      ui_mode: 'embedded_page',
      mode: 'payment',
      // Omitting payment_method_types lets Stripe show every method enabled in the
      // dashboard - card plus wallets and BNPL (Afterpay/Zip).
      // Reuse the family's Stripe customer if we have one (avoids duplicates),
      // otherwise create one. Either way, save the card for off-session
      // auto-enrolment charges next term.
      ...(existing?.stripeCustomerId
        ? { customer: existing.stripeCustomerId }
        : { customer_email: email, customer_creation: 'always' as const }),
      payment_intent_data: { setup_future_usage: 'off_session' },
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Everest Tutoring - Term 3 2026`,
              description: `${studentSummary} | ${pricing.weeksRemaining} weeks @ Harrisdale SHS${appliedCredit > 0 ? ` | $${(appliedCredit / 100).toFixed(2)} credit applied` : ''}`,
              images: [],
            },
            unit_amount: chargeCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        parentFirstName: formData.parentFirstName,
        parentLastName: formData.parentLastName,
        email,
        phone: formData.phone,
        students: JSON.stringify(formData.students),
        weeksRemaining: String(pricing.weeksRemaining),
        weeklyRate: String(pricing.weeklyRate),
        studentsCount: String(pricing.studentsCount),
        siblingDiscount: String(pricing.siblingDiscount),
        appliedCreditCents: String(appliedCredit),
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/confirmation/{CHECKOUT_SESSION_ID}`,
    })

    // Link the saved cart to this Stripe session so the webhook can mark it paid.
    await prisma.pendingBooking.updateMany({ where: { email }, data: { stripeSessionId: session.id } })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
