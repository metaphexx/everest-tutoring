'use server'

import { startClaimCheckoutByToken } from '@/lib/waitlist'

// Public, token-authorised: the one-click claim link carries the credential, so
// no login is required. Starts the pro-rata checkout and returns a Stripe URL
// (or a preview flag when Stripe isn't live). The seat is only secured on payment.
export async function claimSeat(token: string) {
  return startClaimCheckoutByToken(token)
}
