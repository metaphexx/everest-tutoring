import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { sendBookingConfirmation } from '@/lib/resend'
import { sendSMS, buildConfirmationSMS } from '@/lib/twilio'
import { generateConfirmationCode, formatPhone } from '@/lib/utils'
import { getScheduleForYear } from '@/lib/schedule'
import { seatOrWaitlist } from '@/lib/enroll'
import { syncBookingToXero } from '@/lib/xero'
import { notifyAdmin } from '@/lib/admin-notify'
import { captureError } from '@/lib/log'
import { consumeFamilyCredit } from '@/lib/credits'
import { markCartCompleted } from '@/lib/abandoned'
import { sendCapiPurchase } from '@/lib/meta-capi'
import { inviteStudent } from '@/lib/student-invite'
import type { SubjectName } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    await captureError(err, { where: 'stripe.webhook.signature' })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Chargeback / dispute: flag the booking and alert the admin to respond.
  if (event.type === 'charge.dispute.created') {
    try {
      const dispute = event.data.object as { payment_intent?: string; amount?: number; reason?: string }
      const booking = dispute.payment_intent
        ? await prisma.booking.findFirst({ where: { stripePaymentId: dispute.payment_intent }, include: { user: true } })
        : null
      if (booking) await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'disputed' } })
      await notifyAdmin({
        type: 'payment',
        title: `Chargeback opened${booking?.user?.name ? `: ${booking.user.name}` : ''}`,
        body: `${booking?.confirmationCode ?? 'A payment'} is disputed (${dispute.reason ?? 'reason unknown'}). Respond in Stripe before the deadline.`,
        href: '/admin/bookings',
        refKey: `dispute:${dispute.payment_intent ?? Date.now()}`,
      })
    } catch (e) {
      await captureError(e, { where: 'stripe.webhook.dispute' })
    }
    return NextResponse.json({ received: true })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object
  const meta = session.metadata!

  // Idempotency: Stripe retries events (and may deliver duplicates). The booking
  // carries the session id as a unique key, so if we've already processed this
  // session, ack and return without creating a second booking/enrollments.
  const already = await prisma.booking.findUnique({ where: { stripeSessionId: session.id } })
  if (already) return NextResponse.json({ received: true, duplicate: true })

  // Waitlist claim: a family paid the pro-rata price to secure an offered seat.
  // Single-class enrolment, capacity-enforced; marks the waitlist entry enrolled.
  if (meta.kind === 'waitlist_claim') {
    try {
      const subject = await prisma.subject.findUnique({ where: { id: meta.subjectId } })
      const parent = await prisma.user.findUnique({ where: { id: meta.parentId } })
      if (!subject || !parent) throw new Error('waitlist_claim: subject or parent missing')
      const term = await prisma.term.findUnique({ where: { id: subject.termId }, select: { name: true } })

      // Returning alumnus? Reactivate them.
      if (parent.lifecycleStage === 'alumni') {
        await prisma.user.update({ where: { id: parent.id }, data: { lifecycleStage: 'active', alumniSince: null } })
      }

      // Resolve or create the student.
      let studentId = meta.studentId || ''
      if (studentId) {
        await prisma.student.updateMany({ where: { id: studentId, parentId: parent.id }, data: { status: 'active' } })
      } else {
        const [first, ...rest] = (meta.studentName || 'Student').split(' ')
        const created = await prisma.student.create({ data: { firstName: first, lastName: rest.join(' ') || '-', yearLevel: subject.yearLevel, parentId: parent.id, status: 'active' } })
        studentId = created.id
      }

      const claimCode = generateConfirmationCode()
      const claimTotal = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`
      const booking = await prisma.booking.create({
        data: {
          userId: parent.id, termId: subject.termId, studentsCount: 1, subjectsPerWeek: 1,
          weeksRemaining: parseInt(meta.weeksRemaining || '0'), totalAmountCents: session.amount_total ?? 0,
          stripeSessionId: session.id, stripePaymentId: session.payment_intent as string,
          paymentStatus: 'paid', confirmationCode: claimCode, paidAt: new Date(),
        },
      })

      // Save the card for off-session re-enrolment (fail-safe).
      try {
        const customerId = typeof session.customer === 'string' ? session.customer : null
        let pmId: string | null = null
        if (session.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string)
          pmId = typeof pi.payment_method === 'string' ? pi.payment_method : null
        }
        if (customerId || pmId) await prisma.user.update({ where: { id: parent.id }, data: { stripeCustomerId: customerId ?? undefined, stripePaymentMethodId: pmId ?? undefined } })
      } catch (e) { await captureError(e, { where: 'stripe.webhook.claim.saveCard', session: session.id }) }

      // Enrol if there's still room (capacity-checked in one transaction). We do
      // this inline rather than via seatOrWaitlist so a rare "filled first" case
      // doesn't create a second, duplicate waitlist row for this family.
      const seated = await prisma.$transaction(async (tx) => {
        const taken = await tx.enrollment.count({ where: { subjectId: subject.id, status: 'active' } })
        if (taken >= subject.capacity) return false
        await tx.enrollment.create({ data: { studentId, subjectId: subject.id, bookingId: booking.id, status: 'active' } })
        return true
      })
      if (seated) {
        await prisma.waitlist.updateMany({ where: { id: meta.waitlistId }, data: { status: 'enrolled', claimToken: null } })
      } else {
        // Keep their existing waitlist entry as 'claimed' so they retain priority.
        await notifyAdmin({ type: 'payment', title: 'Action needed: paid waitlist claim over capacity', body: `${parent.name ?? 'A family'} paid for Y${subject.yearLevel} ${subject.name} but it filled first. They keep priority - seat them or arrange another slot.`, href: '/admin/waitlist', refKey: `overflow:${booking.id}` })
      }

      if (parent.email) await sendBookingConfirmation({ to: parent.email, parentName: parent.name ?? 'there', confirmationCode: claimCode, students: [{ name: meta.studentName || 'Your child', subjects: [subject.name], day: '' }], totalAmount: claimTotal, weeksRemaining: parseInt(meta.weeksRemaining || '0'), termName: term?.name ?? 'this term' })
      if (parent.phone) { try { await sendSMS(formatPhone(parent.phone), buildConfirmationSMS({ parentName: parent.name ?? 'there', confirmationCode: claimCode, studentsCount: 1, weeksRemaining: parseInt(meta.weeksRemaining || '0'), totalAmount: claimTotal })) } catch { /* email is the receipt of record */ } }
      await prisma.booking.update({ where: { id: booking.id }, data: { emailSent: true, smsSent: true } })
      await syncBookingToXero(booking.id)
      await notifyAdmin({ type: 'booking', title: `Waitlist seat secured: ${meta.studentName || parent.name} (Y${subject.yearLevel} ${subject.name})`, body: `${claimTotal} - ${claimCode}`, href: '/admin/bookings', refKey: `booking:${booking.id}` })

      // Meta Conversions API: tell Meta the exact sale value server-side. Shares
      // the confirmation code as event_id with the browser pixel so it dedupes.
      const [claimFirst, ...claimRest] = (parent.name ?? '').split(' ')
      await sendCapiPurchase({
        eventId: session.id,
        orderId: claimCode,
        value: (session.amount_total ?? 0) / 100,
        email: parent.email,
        phone: parent.phone,
        firstName: claimFirst,
        lastName: claimRest.join(' '),
      })
    } catch (err) {
      await captureError(err, { where: 'stripe.webhook.waitlist_claim', session: session.id })
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
    return NextResponse.json({ received: true })
  }

  try {
    const students: Array<{
      firstName: string; lastName: string; yearLevel: number; selectedSubjects: SubjectName[]
      email?: string; phone?: string
    }> = JSON.parse(meta.students)

    const confirmationCode = generateConfirmationCode()
    const totalAmount = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`

    // Normalise the email so the parent maps to ONE account however they capitalise
    // it (login + booking already lowercase). Otherwise a re-signup or magic-link
    // login with different casing would split their history into a second user.
    const email = (meta.email ?? '').trim().toLowerCase()

    // Payment landed: stop any abandoned-cart recovery for this family.
    await markCartCompleted({ stripeSessionId: session.id, email })

    // Was this a former family coming back? (Recognise before the upsert.)
    const priorUser = await prisma.user.findUnique({ where: { email }, select: { lifecycleStage: true } })
    const wasAlumni = priorUser?.lifecycleStage === 'alumni'

    // Upsert parent user. A returning alumnus is reactivated to `active`.
    const user = await prisma.user.upsert({
      where: { email },
      update: { phone: meta.phone, lifecycleStage: 'active', alumniSince: null },
      create: {
        email,
        name: `${meta.parentFirstName} ${meta.parentLastName}`,
        phone: meta.phone,
        role: 'parent',
      },
    })

    // Get active term
    const term = await prisma.term.findFirst({ where: { isActive: true } })
    if (!term) throw new Error('No active term found')

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        termId: term.id,
        studentsCount: students.length,
        subjectsPerWeek: students[0]?.selectedSubjects?.length ?? 1,
        weeksRemaining: parseInt(meta.weeksRemaining),
        totalAmountCents: session.amount_total ?? 0,
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent as string,
        paymentStatus: 'paid',
        confirmationCode,
        paidAt: new Date(),
      },
    })

    // Consume any account credit applied to this checkout (computed at session
    // creation; spent now that payment succeeded).
    const appliedCredit = parseInt(meta.appliedCreditCents || '0')
    if (appliedCredit > 0) await consumeFamilyCredit(user.id, appliedCredit)

    // Save the card so next term's auto-enrolment can charge off-session.
    // Fail-safe: a hiccup here must never break the booking.
    try {
      const customerId = typeof session.customer === 'string' ? session.customer : null
      let pmId: string | null = null
      if (session.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string)
        pmId = typeof pi.payment_method === 'string' ? pi.payment_method : null
      }
      if (customerId || pmId) {
        await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId ?? undefined, stripePaymentMethodId: pmId ?? undefined } })
        if (customerId && pmId) { try { await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pmId } }) } catch { /* default PM is best-effort */ } }
      }
    } catch (e) {
      await captureError(e, { where: 'stripe.webhook.saveCard', session: session.id })
    }

    // Create student records and enrollments
    const schedules: { name: string; subjects: string[]; day: string }[] = []
    const overflow: string[] = [] // paid families a full class couldn't seat

    for (const studentData of students) {
      const student = await prisma.student.create({
        data: {
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          yearLevel: studentData.yearLevel,
          email: studentData.email?.trim().toLowerCase() || null,
          phone: studentData.phone?.trim() || null,
          parentId: user.id,
        },
      })
      const studentName = `${studentData.firstName} ${studentData.lastName}`

      // Give the student their own Learning Hub login (separate from the parent).
      // Fail-safe: an invite hiccup must never break the booking.
      try {
        await inviteStudent(student.id)
      } catch (e) {
        await captureError(e, { where: 'stripe.webhook.inviteStudent', student: student.id })
      }

      const slots = getScheduleForYear(studentData.yearLevel as 8 | 9 | 10)
      const enrolledSlots = slots.filter(s => studentData.selectedSubjects.includes(s.subject))

      // Seat each subject, enforcing capacity. A full class can't be overbooked;
      // the paid family is waitlisted with priority and admin is alerted below.
      for (const slot of enrolledSlots) {
        const subject = await prisma.subject.findFirst({
          where: { yearLevel: studentData.yearLevel, name: slot.subject, termId: term.id },
        })
        if (subject) {
          const r = await seatOrWaitlist({
            studentId: student.id,
            subjectId: subject.id,
            bookingId: booking.id,
            parentId: user.id,
            parentName: user.name,
            studentName,
          })
          if (!r.seated) overflow.push(`${studentName} - Y${subject.yearLevel} ${subject.name}${r.clash ? ' (timetable clash)' : ''}`)
        }
      }

      schedules.push({
        name: studentName,
        subjects: studentData.selectedSubjects,
        day: enrolledSlots.map(s => s.day).join(', '),
      })
    }

    // Send email confirmation
    await sendBookingConfirmation({
      to: email,
      parentName: meta.parentFirstName,
      confirmationCode,
      students: schedules,
      totalAmount,
      weeksRemaining: parseInt(meta.weeksRemaining),
      termName: term.name,
    })

    // Send SMS confirmation
    const phone = formatPhone(meta.phone)
    const smsBody = buildConfirmationSMS({
      parentName: meta.parentFirstName,
      confirmationCode,
      studentsCount: students.length,
      weeksRemaining: parseInt(meta.weeksRemaining),
      totalAmount,
    })
    await sendSMS(phone, smsBody)

    // Mark notifications sent
    await prisma.booking.update({
      where: { id: booking.id },
      data: { emailSent: true, smsSent: true },
    })

    // Raise the Xero invoice + receipt (preview mode until Xero creds are set;
    // fail-safe internally so it can never break the payment webhook).
    const xero = await syncBookingToXero(booking.id)

    await notifyAdmin({
      type: 'booking',
      title: `New paid booking: ${meta.parentFirstName} ${meta.parentLastName} (${students.length} student${students.length === 1 ? '' : 's'})`,
      body: `${totalAmount} - ${confirmationCode}`,
      href: '/admin/bookings',
      refKey: `booking:${booking.id}`,
    })

    // Win-back: a former family came back. Worth celebrating + a personal touch.
    if (wasAlumni) {
      await notifyAdmin({
        type: 'booking',
        title: `Win-back! ${meta.parentFirstName} ${meta.parentLastName} re-enrolled 🎉`,
        body: `A former family returned with ${students.length} student${students.length === 1 ? '' : 's'}. Their full history is on file.`,
        href: '/admin/students',
        refKey: `winback:${booking.id}`,
      })
    }

    // A paid booking hit a full class: alert admin to seat them (no refunds).
    if (overflow.length > 0) {
      await notifyAdmin({
        type: 'payment',
        title: `Action needed: paid booking over capacity`,
        body: `${meta.parentFirstName} ${meta.parentLastName} paid but ${overflow.join('; ')} ${overflow.length === 1 ? 'is' : 'are'} full. They're waitlisted with priority - open a seat or place them in another slot.`,
        href: '/admin/classes',
        refKey: `overflow:${booking.id}`,
      })
    }

    // Meta Conversions API: server-side Purchase with the exact sale value, so
    // Meta sees the revenue even when the browser pixel is blocked. The event_id
    // is the Stripe session id - the SAME id the confirmation page has in its URL
    // - so the browser + server Purchase dedupe even if this webhook lands first
    // (the booking row, and thus the confirmation code, may not exist browser-side yet).
    await sendCapiPurchase({
      eventId: session.id,
      orderId: confirmationCode,
      value: (session.amount_total ?? 0) / 100,
      email,
      phone: meta.phone,
      firstName: meta.parentFirstName,
      lastName: meta.parentLastName,
    })

    console.log(`Booking ${confirmationCode} created for ${meta.email} (xero: ${xero.status})`)
  } catch (err) {
    await captureError(err, { where: 'stripe.webhook.processing', session: session.id })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
