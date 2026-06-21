// Tiny client-side helper to fire Meta Pixel events (InitiateCheckout, Purchase,
// Lead, etc.) for ad optimisation. No-ops if the pixel isn't loaded.
type FbqParams = Record<string, unknown>

// `eventId` lets the browser event share an id with its server-side Conversions
// API twin so Meta de-duplicates them (used for Purchase). See lib/meta-capi.ts.
export function fbTrack(event: string, params?: FbqParams, eventId?: string): void {
  if (typeof window === 'undefined') return
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq
  if (!fbq) return
  // fbq's options object (with eventID) must sit in the 4th arg, after params,
  // so when there's an eventId but no params we pass an empty params object.
  if (eventId) fbq('track', event, params ?? {}, { eventID: eventId })
  else if (params) fbq('track', event, params)
  else fbq('track', event)
}
