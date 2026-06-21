import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import PixelPurchase from '@/components/analytics/PixelPurchase'

export const metadata: Metadata = { title: 'Booking Confirmed' }

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch session from Stripe to get metadata
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>> | null = null
  let booking = null

  try {
    session = await stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] })
    booking = await prisma.booking.findUnique({
      where: { stripeSessionId: id },
      include: { enrollments: { include: { subject: true, student: true } }, term: true },
    })
  } catch {
    // Handle invalid session gracefully
  }

  const isPaid = session?.payment_status === 'paid'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 splash-bg" style={{ background: 'var(--bg-ivory)' }}>
      <div className="max-w-lg w-full">
        {isPaid ? (
          <>
            <PixelPurchase value={(session?.amount_total ?? 0) / 100} eventId={id} code={booking?.confirmationCode} />
            {/* Success */}
            <div className="text-center mb-8">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #009dff, #00FFFF)' }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M8 18l6 6 14-14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="font-display font-bold text-3xl text-dark mb-2">You&apos;re booked in!</h1>
              <p className="text-slate-500">Confirmation sent to {session?.customer_email}</p>
            </div>

            {booking && (
              <div className="rounded-2xl bg-white border border-border p-6 mb-6 shadow-sm">
                {/* Confirmation code */}
                <div className="rounded-xl p-4 mb-5 text-center" style={{ background: 'linear-gradient(135deg, #009dff, #007acc)' }}>
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-widest mb-1">Confirmation Code</p>
                  <p className="font-display font-bold text-3xl text-white tracking-widest">
                    {booking.confirmationCode}
                  </p>
                </div>

                {/* Enrollments */}
                <h3 className="font-semibold text-dark mb-3 text-sm">Enrolled Classes</h3>
                <div className="space-y-2 mb-4">
                  {booking.enrollments.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-dark">{e.student.firstName}, {e.subject.name}</p>
                        <p className="text-xs text-slate-400">Year {e.subject.yearLevel} · {e.subject.startTime}–{e.subject.endTime}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{booking.weeksRemaining} weeks remaining</span>
                  <span className="font-display font-bold text-primary">
                    ${(booking.totalAmountCents / 100).toFixed(2)} paid
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-2xl p-5 mb-6"
              style={{ background: 'linear-gradient(135deg, #00203F, #009dff)' }}>
              <p className="text-white/60 text-xs mb-2">📍 Where to go</p>
              <p className="text-white font-semibold text-sm">
                Harrisdale Senior High School. Meet your tutor at the main reception at 3:10 PM for your first class.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard"
                className="flex-1 py-3.5 rounded-full text-sm font-semibold text-white text-center"
                style={{ background: 'linear-gradient(135deg, #009dff, #007acc)' }}>
                View My Dashboard
              </Link>
              <Link href="/"
                className="flex-1 py-3.5 rounded-full text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 text-center transition-colors">
                Back to Home
              </Link>
            </div>
          </>
        ) : (
          /* Payment not confirmed */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 9v6M14 18v1" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="14" r="12" stroke="#F59E0B" strokeWidth="2" />
              </svg>
            </div>
            <h1 className="font-display font-bold text-2xl text-dark mb-2">Payment not confirmed</h1>
            <p className="text-slate-500 mb-6">Your payment may still be processing. Check your email for confirmation, or try booking again.</p>
            <Link href="/book"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #009dff, #007acc)' }}>
              Try again
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
