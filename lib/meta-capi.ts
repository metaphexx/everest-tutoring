import { createHash } from 'node:crypto'
import { captureError } from '@/lib/log'

// Meta Conversions API (server-side events). The browser pixel can be blocked by
// ad-blockers / ITP, so we ALSO send Purchase from the server straight from the
// Stripe webhook - this is what tells Meta the exact dollar value of each sale,
// reliably. Both events carry the same event_id so Meta de-duplicates them and
// never double-counts (see PixelPurchase on the client, which uses the same id).
//
// No-ops unless both NEXT_PUBLIC_FB_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set,
// so it's a safe no-op in dev / preview.

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
// Optional: paste a code from Events Manager → Test Events to verify the wiring.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE
const GRAPH_VERSION = 'v21.0'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://everesttutoring.com.au'

// Meta requires PII to be SHA-256 hashed, after normalising (trim + lowercase).
function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalised = value.trim().toLowerCase()
  if (!normalised) return undefined
  return createHash('sha256').update(normalised).digest('hex')
}

// Phone must be digits only, including country code, before hashing. Australian
// numbers are stored as 04xxxxxxxx - convert the leading 0 to the 61 country code.
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  let digits = phone.replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.startsWith('0')) digits = `61${digits.slice(1)}`
  return createHash('sha256').update(digits).digest('hex')
}

export interface CapiPurchaseInput {
  /** Shared with the browser Purchase event so Meta de-duplicates them. */
  eventId: string
  /** Sale total in dollars (not cents). */
  value: number
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  /** A human-readable order ref (confirmation code) for reporting. */
  orderId?: string | null
  contentName?: string
  /** Seconds since epoch the purchase happened; defaults to now. */
  eventTime?: number
}

// Send a server-side Purchase to Meta. Fail-safe: any error is logged and
// swallowed so it can never break the Stripe webhook / a customer's booking.
export async function sendCapiPurchase(input: CapiPurchaseInput): Promise<{ sent: boolean }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) return { sent: false }

  try {
    const userData: Record<string, string[] | string> = {}
    const em = hash(input.email)
    const ph = hashPhone(input.phone)
    const fn = hash(input.firstName)
    const ln = hash(input.lastName)
    const country = hash('au')
    if (em) userData.em = [em]
    if (ph) userData.ph = [ph]
    if (fn) userData.fn = [fn]
    if (ln) userData.ln = [ln]
    if (country) userData.country = [country]

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          action_source: 'website',
          event_source_url: `${SITE_URL}/book`,
          user_data: userData,
          custom_data: {
            currency: 'AUD',
            value: Number(input.value.toFixed(2)),
            content_name: input.contentName ?? 'Everest Tutoring term enrolment',
            content_type: 'product',
            ...(input.orderId ? { order_id: input.orderId } : {}),
          },
        },
      ],
      ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      await captureError(new Error(`Meta CAPI ${res.status}: ${detail.slice(0, 500)}`), { where: 'meta.capi.purchase', eventId: input.eventId })
      return { sent: false }
    }
    return { sent: true }
  } catch (err) {
    await captureError(err, { where: 'meta.capi.purchase', eventId: input.eventId })
    return { sent: false }
  }
}
