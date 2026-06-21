'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { syncBookingToXero } from '@/lib/xero'
import { runAutoReenrolment } from '@/lib/reenrolment'

// Manually raise (or retry) the Xero invoice for a booking. The webhook does
// this automatically on payment; this backfills bookings made before invoicing
// existed and retries any that failed.
export async function generateInvoice(bookingId: string) {
  await requireUser(['admin'])
  const result = await syncBookingToXero(bookingId)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/communications')
  return result
}

// Run the term rollover (auto-enrolment). 'remind' sends the pre-charge notice;
// 'charge' creates next-term bookings + charges (preview until Stripe is live).
export async function runTermRollover(mode: 'remind' | 'charge') {
  await requireUser(['admin'])
  const result = await runAutoReenrolment(mode)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/communications')
  return result
}
