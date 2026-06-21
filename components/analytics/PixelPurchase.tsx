'use client'

import { useEffect } from 'react'
import { fbTrack } from '@/lib/fbpixel'

// Fires the Meta Pixel Purchase event once on the confirmation page so ad
// campaigns can optimise for completed enrolments. Renders nothing.
//
// `eventId` is the Stripe checkout-session id (always present in the page URL).
// We use it - not the confirmation code - as the dedup id because the webhook
// that creates the booking (and its code) may not have landed yet, so `code`
// can be undefined here while the server event always carries the session id.
export default function PixelPurchase({
  value,
  eventId,
  code,
}: {
  value: number
  eventId: string
  code?: string | null
}) {
  useEffect(() => {
    fbTrack(
      'Purchase',
      {
        value,
        currency: 'AUD',
        content_name: 'Everest Tutoring term enrolment',
        ...(code ? { order_id: code } : {}),
      },
      eventId,
    )
  }, [value, eventId, code])
  return null
}
